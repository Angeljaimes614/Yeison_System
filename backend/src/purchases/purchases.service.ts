import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { UpdatePurchaseDto } from './dto/update-purchase.dto';
import { Purchase } from './entities/purchase.entity';
import { CapitalService } from '../capital/capital.service';
import { InventoryService } from '../inventory/inventory.service';
import { Inventory } from '../inventory/entities/inventory.entity';
import { Capital } from '../capital/entities/capital.entity';
import { GlobalInventory } from '../inventory/entities/global-inventory.entity';

@Injectable()
export class PurchasesService {
  constructor(
    @InjectRepository(Purchase)
    private readonly purchaseRepository: Repository<Purchase>,
    private readonly capitalService: CapitalService,
    private readonly inventoryService: InventoryService,
    private readonly dataSource: DataSource,
  ) {}

  async reverse(id: string, userId: string, reason: string) {
    const purchase = await this.findOne(id);
    if (purchase.status === 'reversed') {
      throw new BadRequestException('Purchase is already reversed');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Revert Inventory (Deduct what was bought)
      // We use the weighted average logic in reverse: we deduct quantity and cost.
      // Important: We must deduct the ORIGINAL COST we added, not the current average.
      // Purchase entity stores: amount (qty) and totalPesos (cost).
      
      const globalInv = await queryRunner.manager.findOne(GlobalInventory, { where: { currencyId: purchase.currencyId } });
      
      if (!globalInv) throw new NotFoundException('Inventory not found for reversal');

      const qtyToReverse = Number(purchase.amount);
      const costToReverse = Number(purchase.totalPesos);

      globalInv.totalQuantity = Number(globalInv.totalQuantity) - qtyToReverse;
      globalInv.totalCostCOP = Number(globalInv.totalCostCOP) - costToReverse;
      
      // Recalculate Average (Avoid div by zero)
      if (globalInv.totalQuantity > 0) {
          globalInv.averageCost = globalInv.totalCostCOP / globalInv.totalQuantity;
      } else {
          globalInv.totalQuantity = 0;
          globalInv.totalCostCOP = 0;
          globalInv.averageCost = 0;
      }

      await queryRunner.manager.save(globalInv);

      // 2. Revert Capital (Refund Cash)
      const capitals = await queryRunner.manager.find(Capital);
      const capital = capitals[0];
      if (capital) {
          capital.operativePlante = Number(capital.operativePlante) + Number(purchase.paidAmount);
          await queryRunner.manager.save(capital);
      }

      // 3. Mark as Reversed
      purchase.status = 'reversed';
      purchase.reversedAt = new Date();
      purchase.reversedById = userId;
      purchase.reversalReason = reason;

      const updatedPurchase = await queryRunner.manager.save(purchase);

      await queryRunner.commitTransaction();
      return updatedPurchase;

    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async create(createPurchaseDto: CreatePurchaseDto) {
    let { branchId } = createPurchaseDto;
    const { currencyId, amount, rate, paidAmount } = createPurchaseDto;
    const totalPesos = Number(amount) * Number(rate);

    // Start Transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 0. Ensure Branch (If null, fetch first one)
      if (!branchId) {
         // This is a failsafe. Normally frontend sends it.
         const branches = await queryRunner.query(`SELECT id FROM branch LIMIT 1`);
         if (branches && branches.length > 0) {
            branchId = branches[0].id;
         }
      }

      // 1. Check Global Capital
      const capitals = await queryRunner.manager.find(Capital);
      let capital = capitals.length > 0 ? capitals[0] : null;

      if (!capital) {
          capital = queryRunner.manager.create(Capital, {
              totalCapital: 0,
              operativePlante: 0,
              accumulatedProfit: 0
           });
           await queryRunner.manager.save(capital);
      }

      // 2. Create Purchase Record
      const purchase = this.purchaseRepository.create({
        ...createPurchaseDto,
        totalPesos,
        pendingBalance: totalPesos - paidAmount,
        status: paidAmount >= totalPesos ? 'completed' : 'pending',
      });
      const savedPurchase = await queryRunner.manager.save(purchase);

      // 3. Update Capital (Deduct paid amount from operative plante)
      const freshCapital = await queryRunner.manager.findOne(Capital, { where: { id: capital.id } });
      if (!freshCapital) throw new NotFoundException('Capital not found during transaction');

      const currentPlante = Number(freshCapital.operativePlante);
      const paymentAmount = Number(paidAmount);
      
      freshCapital.operativePlante = currentPlante - paymentAmount;
      await queryRunner.manager.save(freshCapital);

      // 4. Update Global Inventory (Weighted Average Cost)
      // Fetch or Create Global Inventory for this Currency
      let globalInv = await queryRunner.manager.findOne(GlobalInventory, { where: { currencyId } });
      
      if (!globalInv) {
          globalInv = queryRunner.manager.create(GlobalInventory, {
            currencyId,
            totalQuantity: 0,
            totalCostCOP: 0,
            averageCost: 0
          });
      }

      const oldQty = Number(globalInv.totalQuantity);
      const oldCost = Number(globalInv.totalCostCOP);
      
      const newQty = oldQty + Number(amount);
      const newCost = oldCost + Number(totalPesos);
      
      // Calculate Weighted Average Cost
      const newAvg = newQty > 0 ? newCost / newQty : 0;

      globalInv.totalQuantity = newQty;
      globalInv.totalCostCOP = newCost;
      globalInv.averageCost = newAvg;

      await queryRunner.manager.save(globalInv);

      // 5. Keep Legacy Inventory (FIFO Lote) for traceability but rely on GlobalInventory for calculations
      const inventoryLote = queryRunner.manager.create(Inventory, {
        branchId,
        currencyId,
        originalAmount: amount,
        currentBalance: amount,
        purchaseRate: rate,
        status: 'active',
      });
      await queryRunner.manager.save(inventoryLote);

      await queryRunner.commitTransaction();
      return savedPurchase;

    } catch (err) {
      await queryRunner.rollbackTransaction();
      console.error('Purchase Transaction Failed:', err);
      throw new BadRequestException(`Error processing purchase: ${err.message}`);
    } finally {
      await queryRunner.release();
    }
  }

  findAll() {
    return this.purchaseRepository.find({
      relations: ['branch', 'provider', 'currency', 'createdBy'],
    });
  }

  async findOne(id: string) {
    const purchase = await this.purchaseRepository.findOne({
      where: { id },
      relations: ['branch', 'provider', 'currency', 'createdBy'],
    });
    if (!purchase) throw new NotFoundException(`Purchase ${id} not found`);
    return purchase;
  }

  update(id: string, updatePurchaseDto: UpdatePurchaseDto) {
    return `This action updates a #${id} purchase (Not implemented yet)`;
  }

  remove(id: string) {
    return `This action removes a #${id} purchase (Not implemented yet)`;
  }
}
