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

@Injectable()
export class SalesService {
  constructor(
    @InjectRepository(Sale)
    private readonly saleRepository: Repository<Sale>,
    private readonly capitalService: CapitalService,
    private readonly inventoryService: InventoryService,
    private readonly dataSource: DataSource,
  ) {}

  async create(createSaleDto: CreateSaleDto) {
    let { branchId } = createSaleDto;
    const { currencyId, amount, rate, paidAmount } = createSaleDto;
    const totalPesos = amount * rate;

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

      // 1. Get Inventory Lots (FIFO GLOBAL)
      // REFACTOR: Use global inventory search (ignore branchId)
      const inventoryLots = await queryRunner.manager.find(Inventory, {
        where: { currencyId, status: 'active' }, // GLOBAL: No branchId filter
        order: { purchaseDate: 'ASC' },
      });

      // Calculate total available
      const totalAvailable = inventoryLots.reduce((sum, lot) => Number(sum) + Number(lot.currentBalance), 0);

      // Requirement: Allow selling even if inventory is theoretically insufficient (Negative Inventory Allowed for correction)
      // if (totalAvailable < amount) {
      //   throw new BadRequestException(`Insufficient inventory. Available: ${totalAvailable}, Requested: ${amount}`);
      // }

      // 2. Consume Inventory & Calculate Profit
      let remainingAmountToSell = amount;
      let totalCost = 0;

      for (const lot of inventoryLots) {
        if (remainingAmountToSell <= 0) break;

        const lotBalance = Number(lot.currentBalance);
        let consumeFromLot = 0;

        if (lotBalance >= remainingAmountToSell) {
          consumeFromLot = remainingAmountToSell;
          lot.currentBalance = Number(lot.currentBalance) - consumeFromLot;
        } else {
          consumeFromLot = lotBalance;
          lot.currentBalance = 0;
          lot.status = 'depleted';
        }

        // Cost for this chunk
        totalCost += consumeFromLot * Number(lot.purchaseRate);
        remainingAmountToSell -= consumeFromLot;

        // Update lot in DB
        await queryRunner.manager.save(lot);
      }

      // 2.1 Handle Negative Inventory (Short Selling)
      // If we still need to sell but have no lots left, create a negative inventory record.
      if (remainingAmountToSell > 0) {
          const negativeInventory = queryRunner.manager.create(Inventory, {
            branchId, // Use the sales branch
            currencyId,
            originalAmount: 0, // It's virtual
            currentBalance: -remainingAmountToSell, // Negative balance
            purchaseRate: rate, // Assume current market rate for the "debt"
            status: 'active',
            purchaseDate: new Date(), // Now
          });
          await queryRunner.manager.save(negativeInventory);
          
          // Cost calculation for the shorted part:
          // We assume the cost is the current sales rate (or 0 profit on this part until covered?)
          // For simplicity, let's assume cost = sales rate (break-even on paper) or just 0?
          // Let's use the sales rate as the "cost" of the negative inventory for now to avoid inflated profits.
          totalCost += remainingAmountToSell * rate; 
      }

      // Profit = Total Sales (Pesos) - Total Cost (Pesos)
      const profit = totalPesos - totalCost;

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
      // REFACTOR: Find ANY capital (Global) instead of branch specific
      // We assume one global capital exists.
      const capitals = await queryRunner.manager.find(Capital);
      let capital = capitals.length > 0 ? capitals[0] : null;
      
      if (!capital) {
          // Fallback create if not exists (should be initialized though)
           capital = queryRunner.manager.create(Capital, {
              totalCapital: 0,
              operativePlante: 0,
              accumulatedProfit: 0
           });
           await queryRunner.manager.save(capital);
      }

      // Requirement: "Sumar ventas al plante"
      // FIX: Ensure types are treated as numbers
      const currentPlante = Number(capital.operativePlante);
      const paymentAmount = Number(paidAmount);
      const profitAmount = Number(profit);
      
      console.log('--- DEBUG SALE CAPITAL UPDATE ---');
      console.log('Current Plante:', currentPlante);
      console.log('Adding Paid Amount:', paymentAmount);
      console.log('New Plante should be:', currentPlante + paymentAmount);

      capital.operativePlante = currentPlante + paymentAmount;
      capital.accumulatedProfit = Number(capital.accumulatedProfit) + profitAmount;
      
      const savedCapital = await queryRunner.manager.save(capital);
      console.log('Saved Capital Plante:', savedCapital.operativePlante);
      console.log('-------------------------------');

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
