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
      // REFACTOR: Simplified capital retrieval logic
      let capital = await queryRunner.manager.findOne(Capital, { where: {} }); // Find ANY capital

      if (!capital) {
         // Create default capital if none exists
          capital = queryRunner.manager.create(Capital, {
              totalCapital: 0,
              operativePlante: 0,
              accumulatedProfit: 0
           });
           await queryRunner.manager.save(capital);
      }

      // 2. Create Expense
      // Simplified creation logic
      const expense = new Expense();
      expense.branchId = createExpenseDto.branchId;
      expense.concept = createExpenseDto.concept;
      expense.amount = Number(createExpenseDto.amount);
      expense.type = createExpenseDto.type;
      expense.date = createExpenseDto.date ? new Date(createExpenseDto.date) : new Date();
      if (createExpenseDto.createdById) {
        expense.createdById = createExpenseDto.createdById;
      }

      const savedExpense = await queryRunner.manager.save(Expense, expense);

      // 3. Deduct from Capital
      const currentPlante = Number(capital.operativePlante);
      const expenseAmount = Number(amount);
      
      console.log('--- DEBUG EXPENSE CAPITAL UPDATE ---');
      console.log('Current Plante:', currentPlante);
      console.log('Deducting Expense:', expenseAmount);
      console.log('New Plante should be:', currentPlante - expenseAmount);

      capital.operativePlante = currentPlante - expenseAmount;
      await queryRunner.manager.save(Capital, capital);

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
