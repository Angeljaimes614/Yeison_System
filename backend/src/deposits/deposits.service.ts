import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Deposit } from './entities/deposit.entity';
import { Capital } from '../capital/entities/capital.entity';

@Injectable()
export class DepositsService {
  constructor(
    @InjectRepository(Deposit)
    private depositRepository: Repository<Deposit>,
    private dataSource: DataSource,
  ) {}

  async create(data: { amount: number; multiplier: number; description: string; userId: string }) {
    const { amount, multiplier, description, userId } = data;
    const total = amount * multiplier;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Create Deposit record
      const deposit = this.depositRepository.create({
        amount,
        multiplier,
        total,
        description,
        createdById: userId,
      });
      await queryRunner.manager.save(deposit);

      // Update Capital
      const capitals = await queryRunner.manager.find(Capital);
      let capital = capitals.length > 0 ? capitals[0] : null;
      
      if (!capital) {
         capital = queryRunner.manager.create(Capital, { totalCapital: 0, operativePlante: 0, accumulatedProfit: 0 });
      }

      // Add total to operativePlante and accumulatedProfit
      capital.operativePlante = Number(capital.operativePlante) + Number(total);
      capital.accumulatedProfit = Number(capital.accumulatedProfit) + Number(total);

      await queryRunner.manager.save(Capital, capital);
      await queryRunner.commitTransaction();

      return deposit;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  findAll() {
    return this.depositRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async reverse(id: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const deposit = await queryRunner.manager.findOne(Deposit, { where: { id } });
      if (!deposit) throw new NotFoundException('Depósito no encontrado');
      if (deposit.isReversed) throw new BadRequestException('El depósito ya está anulado');

      const capitals = await queryRunner.manager.find(Capital);
      if (capitals.length === 0) throw new BadRequestException('Capital no inicializado');
      const capital = capitals[0];

      if (Number(capital.operativePlante) < Number(deposit.total)) {
        throw new BadRequestException('Fondos insuficientes en caja para anular este depósito');
      }

      // Subtract from Capital
      capital.operativePlante = Number(capital.operativePlante) - Number(deposit.total);
      capital.accumulatedProfit = Number(capital.accumulatedProfit) - Number(deposit.total);
      await queryRunner.manager.save(Capital, capital);

      // Mark as reversed
      deposit.isReversed = true;
      await queryRunner.manager.save(Deposit, deposit);

      await queryRunner.commitTransaction();
      return { message: 'Depósito anulado correctamente' };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async removeAll() {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
        const deposits = await queryRunner.manager.find(Deposit);
        const capitals = await queryRunner.manager.find(Capital);
        const capital = capitals.length > 0 ? capitals[0] : null;

        if (capital) {
            for (const deposit of deposits) {
                if (!deposit.isReversed) {
                     // Reverse the active ones from capital before deleting
                     capital.operativePlante = Number(capital.operativePlante) - Number(deposit.total);
                     capital.accumulatedProfit = Number(capital.accumulatedProfit) - Number(deposit.total);
                }
            }
            await queryRunner.manager.save(Capital, capital);
        }

        await queryRunner.manager.clear(Deposit); // deletes all rows

        await queryRunner.commitTransaction();
        return { message: 'Todos los depósitos fueron eliminados y la caja ajustada' };
    } catch (err) {
        await queryRunner.rollbackTransaction();
        throw err;
    } finally {
        await queryRunner.release();
    }
  }
}