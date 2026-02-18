import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { Expense } from './entities/expense.entity';
import { CapitalService } from '../capital/capital.service';
import { Capital } from '../capital/entities/capital.entity';

@Injectable()
export class ExpensesService {
  constructor(
    @InjectRepository(Expense)
    private readonly expenseRepository: Repository<Expense>,
    private readonly capitalService: CapitalService,
    private readonly dataSource: DataSource,
  ) {}

  async create(createExpenseDto: CreateExpenseDto) {
    const { branchId, amount } = createExpenseDto;

    // Start Transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Check Global Capital
      // Re-fetch capital inside transaction to ensure freshness
      // We need to find the capital ID first, or just find the first one
      const capitals = await queryRunner.manager.find(Capital);
      let capital = capitals.length > 0 ? capitals[0] : null;

      if (!capital) {
         // Should not happen if initialized, but handle gracefully
         // Try to init
          capital = queryRunner.manager.create(Capital, {
              totalCapital: 0,
              operativePlante: 0,
              accumulatedProfit: 0
           });
           await queryRunner.manager.save(capital);
      } else {
         // Reload it to be safe within transaction context
         const freshCapital = await queryRunner.manager.findOne(Capital, { where: { id: capital.id } });
         if (freshCapital) capital = freshCapital;
      }

      // Requirement: Debe descontarse del capital automáticamente.
      // REMOVED BLOCKING CHECK: Allow negative balance if physical cash exists but system doesn't know.
      // if (Number(capital.operativePlante) < amount) {
      //   throw new BadRequestException('Insufficient operative plante (cash) for this expense');
      // }

      // 2. Create Expense
      // FIX: Use queryRunner.manager to create and save, not this.expenseRepository
      // This ensures it is part of the transaction
      // Ensure date is set if missing
      const expenseData = {
          ...createExpenseDto,
          date: createExpenseDto.date ? new Date(createExpenseDto.date) : new Date(),
          // Ensure amount is number
          amount: Number(createExpenseDto.amount)
      };
      
      const expense = queryRunner.manager.create(Expense, expenseData);
      const savedExpense = await queryRunner.manager.save(expense);

      // 3. Deduct from Capital
      const currentPlante = Number(capital.operativePlante);
      const expenseAmount = Number(amount);
      
      console.log('--- DEBUG EXPENSE CAPITAL UPDATE ---');
      console.log('Current Plante:', currentPlante);
      console.log('Deducting Expense:', expenseAmount);
      console.log('New Plante should be:', currentPlante - expenseAmount);

      capital.operativePlante = currentPlante - expenseAmount;
      await queryRunner.manager.save(capital);

      await queryRunner.commitTransaction();
      return savedExpense;

    } catch (err) {
      console.error('ERROR CREATING EXPENSE:', err);
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  findAll() {
    return this.expenseRepository.find({ relations: ['branch', 'createdBy'] });
  }

  async findOne(id: string) {
    const expense = await this.expenseRepository.findOne({
      where: { id },
      relations: ['branch', 'createdBy'],
    });
    if (!expense) throw new NotFoundException(`Expense ${id} not found`);
    return expense;
  }

  update(id: string, updateExpenseDto: UpdateExpenseDto) {
    return `This action updates a #${id} expense (Not implemented yet)`;
  }

  remove(id: string) {
    return `This action removes a #${id} expense (Not implemented yet)`;
  }
}
