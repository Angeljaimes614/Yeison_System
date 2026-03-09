import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CapitalService } from './capital.service';
import { CapitalController } from './capital.controller';
import { Capital } from './entities/capital.entity';
import { CapitalMovement } from './entities/capital-movement.entity';
import { Sale } from '../sales/entities/sale.entity';
import { Purchase } from '../purchases/entities/purchase.entity';
import { Expense } from '../expenses/entities/expense.entity';
import { Payment } from '../payments/entities/payment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Capital, CapitalMovement, Sale, Purchase, Expense, Payment])],
  controllers: [CapitalController],
  providers: [CapitalService],
  exports: [CapitalService],
})
export class CapitalModule {}
