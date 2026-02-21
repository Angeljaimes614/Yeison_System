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
