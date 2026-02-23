import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Investment } from './entities/investment.entity';
import { InvestmentTransaction } from './entities/investment-transaction.entity';
import { Capital } from '../capital/entities/capital.entity';

@Injectable()
export class InvestmentsService {
  constructor(
    @InjectRepository(Investment)
    private readonly investmentRepository: Repository<Investment>,
    @InjectRepository(InvestmentTransaction)
    private readonly transactionRepository: Repository<InvestmentTransaction>,
    private readonly dataSource: DataSource,
  ) {}

  // 1. REGISTER NEW INVESTMENT (Money OUT, Stock IN)
  async createInvestment(data: { name: string; quantity: number; totalCost: number; userId: string }) {
    const { name, quantity, totalCost, userId } = data;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Get Capital
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

      // Check Funds
      if (Number(capital.operativePlante) < totalCost) {
          throw new BadRequestException('Fondos insuficientes en Caja Operativa para esta inversión');
      }

      // Deduct from Capital (Money Leaves)
      capital.operativePlante = Number(capital.operativePlante) - Number(totalCost);
      await queryRunner.manager.save(capital);

      // Create Investment Record
      const unitCost = quantity > 0 ? totalCost / quantity : 0;
      
      const investment = this.investmentRepository.create({
          name,
          totalCost,
          unitCost,
          initialQuantity: quantity,
          currentQuantity: quantity,
          status: 'ACTIVE',
          createdById: userId
      });
      
      await queryRunner.manager.save(investment);

      await queryRunner.commitTransaction();
      return investment;

    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  // 2. REGISTER SALE (Stock OUT, Money IN + Profit)
  async registerSale(data: { investmentId: string; quantity: number; salePrice: number; userId: string }) {
    const { investmentId, quantity, salePrice, userId } = data;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Find Investment
      const investment = await queryRunner.manager.findOne(Investment, { where: { id: investmentId } });
      if (!investment) throw new NotFoundException('Producto de inversión no encontrado');

      if (investment.currentQuantity < quantity) {
          throw new BadRequestException(`Stock insuficiente. Disponible: ${investment.currentQuantity}`);
      }

      // Calculate Profit
      // Cost of Goods Sold = Quantity * Unit Cost
      const costOfSale = Number(quantity) * Number(investment.unitCost);
      const profit = Number(salePrice) - costOfSale;

      // Update Investment Stock
      investment.currentQuantity = Number(investment.currentQuantity) - Number(quantity);
      if (investment.currentQuantity <= 0) {
          investment.status = 'SOLD_OUT';
      }
      await queryRunner.manager.save(investment);

      // Update Capital (Money Enters)
      const capitals = await queryRunner.manager.find(Capital);
      const capital = capitals[0]; // Assume exists since investment exists

      // Add Sale Price to Cash
      capital.operativePlante = Number(capital.operativePlante) + Number(salePrice);
      // Add Profit to Net Utility
      capital.accumulatedProfit = Number(capital.accumulatedProfit) + profit;

      await queryRunner.manager.save(capital);

      // Record Transaction
      const transaction = this.transactionRepository.create({
          investmentId,
          quantity,
          salePrice,
          profit,
          createdById: userId
      });
      await queryRunner.manager.save(transaction);

      await queryRunner.commitTransaction();
      return transaction;

    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  findAll() {
    return this.investmentRepository.find({
        relations: ['createdBy'],
        order: { date: 'DESC' }
    });
  }

  findTransactions(investmentId: string) {
      return this.transactionRepository.find({
          where: { investmentId },
          order: { date: 'DESC' }
      });
  }
}
