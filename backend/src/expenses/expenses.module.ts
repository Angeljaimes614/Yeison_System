import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExpensesService } from './expenses.service';
import { ExpensesController } from './expenses.controller';
import { Expense } from './entities/expense.entity';
import { CapitalModule } from '../capital/capital.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Expense]),
    CapitalModule,
  ],
  controllers: [ExpensesController],
  providers: [ExpensesService],
})
export class ExpensesModule {}
