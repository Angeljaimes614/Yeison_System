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
      const capitals = await queryRunner.manager.find(Capital);
      let capital = capitals.length > 0 ? capitals[0] : null;

      if (!capital) {
         // Should not happen if initialized, but handle gracefully
         throw new NotFoundException(`Global Capital not found`);
      }

      // Requirement: Debe descontarse del capital automáticamente.
      if (Number(capital.operativePlante) < amount) {
        throw new BadRequestException('Insufficient operative plante (cash) for this expense');
      }

      // 2. Create Expense
      const expense = this.expenseRepository.create(createExpenseDto);
      const savedExpense = await queryRunner.manager.save(expense);

      // 3. Deduct from Capital
      capital.operativePlante = Number(capital.operativePlante) - Number(amount);
      await queryRunner.manager.save(capital);

      await queryRunner.commitTransaction();
      return savedExpense;

    } catch (err) {
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
