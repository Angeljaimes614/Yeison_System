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
    const { branchId, currencyId, amount, rate, paidAmount } = createSaleDto;
    const totalPesos = amount * rate;

    // Start Transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
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
      capital.operativePlante = Number(capital.operativePlante) + Number(paidAmount);
      capital.accumulatedProfit = Number(capital.accumulatedProfit) + Number(profit);
      
      await queryRunner.manager.save(capital);

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
