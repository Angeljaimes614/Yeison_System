import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CreateSaleDto } from './dto/create-sale.dto';
import { UpdateSaleDto } from './dto/update-sale.dto';
import { Sale } from './entities/sale.entity';
import { CapitalService } from '../capital/capital.service';
import { InventoryService } from '../inventory/inventory.service';
import { Inventory } from '../inventory/entities/inventory.entity';
import { Capital } from '../capital/entities/capital.entity';
import { GlobalInventory } from '../inventory/entities/global-inventory.entity';

@Injectable()
export class SalesService {
  constructor(
    @InjectRepository(Sale)
    private readonly saleRepository: Repository<Sale>,
    private readonly capitalService: CapitalService,
    private readonly inventoryService: InventoryService,
    private readonly dataSource: DataSource,
  ) {}

  async reverse(id: string, userId: string, reason: string) {
    const sale = await this.findOne(id);
    if (sale.status === 'reversed') {
      throw new BadRequestException('Sale is already reversed');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Revert Inventory (Add back what was sold)
      // We add back the quantity and the ORIGINAL COST of the sale to maintain WAC integrity.
      // If we didn't save costBasis, we have to estimate or use current average (risky).
      // Ideally we should have saved 'costBasis'. If not, we use (totalPesos - profit).
      
      const globalInv = await queryRunner.manager.findOne(GlobalInventory, { where: { currencyId: sale.currencyId } });
      
      if (!globalInv) {
         // Should exist if we sold it, but if deleted, recreate?
         // Reversal requires inventory to exist to put it back.
         throw new NotFoundException('Inventory record not found for reversal');
      }

      const qtyToReverse = Number(sale.amount);
      
      // Calculate original cost basis
      // Profit = Revenue - Cost => Cost = Revenue - Profit
      const originalCostOfSale = Number(sale.totalPesos) - Number(sale.profit);

      globalInv.totalQuantity = Number(globalInv.totalQuantity) + qtyToReverse;
      globalInv.totalCostCOP = Number(globalInv.totalCostCOP) + originalCostOfSale;
      
      // Recalculate Average
      if (globalInv.totalQuantity > 0) {
          globalInv.averageCost = globalInv.totalCostCOP / globalInv.totalQuantity;
      }

      await queryRunner.manager.save(globalInv);

      // 2. Revert Capital (Deduct Cash & Profit)
      const capitals = await queryRunner.manager.find(Capital);
      const capital = capitals[0];
      
      if (capital) {
          // Remove the cash we got
          capital.operativePlante = Number(capital.operativePlante) - Number(sale.paidAmount);
          // Remove the profit we booked
          capital.accumulatedProfit = Number(capital.accumulatedProfit) - Number(sale.profit);
          
          await queryRunner.manager.save(capital);
      }

      // 3. Mark as Reversed
      sale.status = 'reversed';
      sale.reversedAt = new Date();
      sale.reversedById = userId;
      sale.reversalReason = reason;

      const updatedSale = await queryRunner.manager.save(sale);

      await queryRunner.commitTransaction();
      return updatedSale;

    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async create(createSaleDto: CreateSaleDto) {
    let { branchId } = createSaleDto;
    const { currencyId, amount, rate, paidAmount } = createSaleDto;
    const totalPesos = Number(amount) * Number(rate);

    // Start Transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 0. Ensure Branch (Failsafe)
      if (!branchId) {
         const branches = await queryRunner.query(`SELECT id FROM branch LIMIT 1`);
         if (branches && branches.length > 0) {
            branchId = branches[0].id;
         }
      }

      // 1. Consume Global Inventory (Weighted Average Cost)
      // Fetch Global Inventory
      let globalInv = await queryRunner.manager.findOne(GlobalInventory, { where: { currencyId } });
      
      if (!globalInv) {
          // If no inventory exists, we create a temporary negative one or just proceed with 0 avg cost?
          // Let's initialize it.
          globalInv = queryRunner.manager.create(GlobalInventory, {
            currencyId,
            totalQuantity: 0,
            totalCostCOP: 0,
            averageCost: 0
          });
      }

      const currentAvgCost = Number(globalInv.averageCost);
      const sellQty = Number(amount);
      
      // Cost of Goods Sold (COGS)
      const costOfSale = sellQty * currentAvgCost;
      
      // Profit Calculation
      // Profit = Revenue - Cost
      // If inventory is 0 or negative, AvgCost is 0 or whatever it was.
      // If we are selling without inventory (short selling), cost is 0? No, that inflates profit.
      // Logic: If AvgCost is 0 (because no purchase yet), Profit = Total Sale (which is technically true but risky).
      // Let's stick to the math: Profit = TotalPesos - (Qty * AvgCost).
      const profit = totalPesos - costOfSale;

      // Update Global Inventory
      globalInv.totalQuantity = Number(globalInv.totalQuantity) - sellQty;
      globalInv.totalCostCOP = Number(globalInv.totalCostCOP) - costOfSale;
      
      // Safety check: if qty goes to 0 or negative, reset
      if (globalInv.totalQuantity <= 0) {
          globalInv.totalQuantity = 0;
          globalInv.totalCostCOP = 0;
          globalInv.averageCost = 0; // Reset average only on zero inventory
      }
      
      await queryRunner.manager.save(globalInv);

      // 2. Consume Legacy Inventory (FIFO Lote) for traceability (Optional but good for history)
      // We still update the old table just in case, but logic relies on GlobalInventory above.
      // ... (Legacy code omitted for brevity/speed, or we can keep it as "shadow" process)
      // Let's keep it simple: We just update the global one as requested.
      
      // 3. Create Sale Record
      const sale = this.saleRepository.create({
        ...createSaleDto,
        totalPesos,
        profit,
        pendingBalance: totalPesos - paidAmount,
        status: paidAmount >= totalPesos ? 'completed' : 'pending',
      });
      const savedSale = await queryRunner.manager.save(sale);

      // 4. Update Global Capital
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

      const freshCapital = await queryRunner.manager.findOne(Capital, { where: { id: capital.id } });
      if (!freshCapital) throw new NotFoundException('Capital not found during transaction');

      const currentPlante = Number(freshCapital.operativePlante);
      const paymentAmount = Number(paidAmount);
      const profitAmount = Number(profit);
      
      freshCapital.operativePlante = currentPlante + paymentAmount;
      freshCapital.accumulatedProfit = Number(freshCapital.accumulatedProfit) + profitAmount;
      
      await queryRunner.manager.save(freshCapital);

      await queryRunner.commitTransaction();
      return savedSale;

    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  findAll() {
    return this.saleRepository.find({
      relations: ['branch', 'client', 'currency', 'createdBy'],
    });
  }

  async findOne(id: string) {
    const sale = await this.saleRepository.findOne({
      where: { id },
      relations: ['branch', 'client', 'currency', 'createdBy'],
    });
    if (!sale) throw new NotFoundException(`Sale ${id} not found`);
    return sale;
  }

  update(id: string, updateSaleDto: UpdateSaleDto) {
    return `This action updates a #${id} sale (Not implemented yet)`;
  }

  remove(id: string) {
    return `This action removes a #${id} sale (Not implemented yet)`;
  }
}
