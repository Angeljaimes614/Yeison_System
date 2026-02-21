import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Exchange } from './entities/exchange.entity';
import { InventoryService } from '../inventory/inventory.service';

@Injectable()
export class ExchangesService {
  constructor(
    @InjectRepository(Exchange)
    private readonly exchangeRepository: Repository<Exchange>,
    private readonly inventoryService: InventoryService,
    private readonly dataSource: DataSource,
  ) {}

  async create(data: { sourceCurrencyId: string; targetCurrencyId: string; sourceAmount: number; targetAmount: number; userId: string }) {
    const { sourceCurrencyId, targetCurrencyId, sourceAmount, targetAmount, userId } = data;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Consume Source Currency (Register Sale Logic but keep cost)
      // We need to know the Average Cost to transfer it.
      // The inventoryService.registerSale updates quantity and total cost, but we need to know HOW MUCH cost was removed.
      // We'll use a modified logic here or reuse registerSale if it returns the cost.
      // Let's assume registerSale returns { costOfSale, averageCostUsed }
      
      const saleResult = await this.inventoryService.registerSale(sourceCurrencyId, sourceAmount, queryRunner.manager);
      const costTransferred = saleResult.costOfSale;

      // 2. Add to Target Currency (Register Purchase Logic with transferred cost)
      // This increases target quantity and adds the transferred cost to it.
      await this.inventoryService.registerPurchase(targetCurrencyId, targetAmount, costTransferred, queryRunner.manager);

      // 3. Record Exchange
      const exchangeRate = sourceAmount > 0 ? targetAmount / sourceAmount : 0;
      
      const exchange = this.exchangeRepository.create({
        sourceCurrencyId,
        targetCurrencyId,
        sourceAmount,
        targetAmount,
        exchangeRate,
        costTransferredCOP: costTransferred,
        createdById: userId,
      });
      
      await queryRunner.manager.save(exchange);

      await queryRunner.commitTransaction();
      return exchange;

    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  findAll() {
    return this.exchangeRepository.find({
      relations: ['sourceCurrency', 'targetCurrency', 'createdBy'],
      order: { date: 'DESC' }
    });
  }
}
