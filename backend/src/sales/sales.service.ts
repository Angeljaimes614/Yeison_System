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
    const { currencyId, amount, rate, paidAmount, operationType } = createSaleDto;
    const totalPesos = Number(amount) * Number(rate);
    const isDirect = operationType === 'DIRECT';

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

      let profit = 0;
      let costOfSale = 0;

      if (isDirect) {
          // DIRECT OPERATION: No Inventory Impact
          // Profit is simply Total Sale (Assuming 0 cost, OR we need purchase price input for direct operations?)
          // If it's a "Direct" operation usually implies buy/sell back to back or service.
          // User said: "En DIRECTA: utilidad = (precio_venta – precio_compra) × cantidad"
          // BUT we don't have "precio_compra" in CreateSaleDto here?
          // For now, if user selects DIRECT, we assume it's pure profit or we need to know the base cost.
          // Wait, if it's "Direct", maybe we should ask for "Base Cost" or assume 0?
          // Let's assume for now that DIRECT operations are treated as services or 100% profit unless cost provided.
          // Actually, if user wants (SalePrice - PurchasePrice), they need to input PurchasePrice somewhere.
          // But CreateSaleDto only has `rate` (Sale Price).
          // Let's assume for now DIRECT means "Don't touch inventory, just add cash".
          // Profit = TotalPesos (Risk: 100% profit).
          // To be safe, let's treat DIRECT as "Service" logic.
          profit = totalPesos; 
      } else {
          // INVENTORY OPERATION (Default)
          // 1. Consume Global Inventory (Weighted Average Cost)
          let globalInv = await queryRunner.manager.findOne(GlobalInventory, { where: { currencyId } });
          
          if (!globalInv) {
              globalInv = queryRunner.manager.create(GlobalInventory, {
                currencyId,
                totalQuantity: 0,
                totalCostCOP: 0,
                averageCost: 0
              });
          }

          const currentAvgCost = Number(globalInv.averageCost);
          const sellQty = Number(amount);

          // --- VALIDATION: Check for Sufficient Inventory ---
          if (Number(globalInv.totalQuantity) < sellQty) {
              throw new BadRequestException(
                  `Saldo insuficiente en inventario. Tienes ${globalInv.totalQuantity} y quieres vender ${sellQty}.`
              );
          }
          
          // Cost of Goods Sold (COGS)
          costOfSale = sellQty * currentAvgCost;
          profit = totalPesos - costOfSale;

          // Update Global Inventory
          globalInv.totalQuantity = Number(globalInv.totalQuantity) - sellQty;
          globalInv.totalCostCOP = Number(globalInv.totalCostCOP) - costOfSale;
          
          // Safety check
          if (globalInv.totalQuantity <= 0) {
              globalInv.totalQuantity = 0;
              globalInv.totalCostCOP = 0;
              globalInv.averageCost = 0;
          }
          
          await queryRunner.manager.save(globalInv);
      }

      // 3. Create Sale Record
      const sale = this.saleRepository.create({
        ...createSaleDto,
        totalPesos,
        profit,
        costBasis: costOfSale,
        operationType: isDirect ? 'DIRECT' : 'INVENTORY',
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
