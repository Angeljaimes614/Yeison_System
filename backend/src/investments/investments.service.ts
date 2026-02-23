import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Investment } from './entities/investment.entity';
import { Capital } from '../capital/entities/capital.entity';

@Injectable()
export class InvestmentsService {
  constructor(
    @InjectRepository(Investment)
    private readonly investmentRepository: Repository<Investment>,
    private readonly dataSource: DataSource,
  ) {}

  async create(data: { type: 'INVERSION' | 'RETORNO', concept: string, amount: number, profit?: number, userId: string }) {
    const { type, concept, amount, profit = 0, userId } = data;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Get Capital
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

      // 2. Apply Logic
      if (type === 'INVERSION') {
          // Money LEAVES the operative box (Invested in Asset)
          if (Number(capital.operativePlante) < amount) {
              throw new BadRequestException('Fondos insuficientes en Caja Operativa para esta inversión');
          }
          capital.operativePlante = Number(capital.operativePlante) - Number(amount);
      } else {
          // RETORNO: Money ENTERS the operative box (Asset Sold)
          capital.operativePlante = Number(capital.operativePlante) + Number(amount);
          
          // Profit Logic
          if (profit > 0) {
              capital.accumulatedProfit = Number(capital.accumulatedProfit) + Number(profit);
          }
      }

      await queryRunner.manager.save(capital);

      // 3. Save Record
      const investment = this.investmentRepository.create({
          type,
          concept,
          amount,
          profit,
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

  findAll() {
    return this.investmentRepository.find({
        relations: ['createdBy'],
        order: { date: 'DESC' }
    });
  }
}
