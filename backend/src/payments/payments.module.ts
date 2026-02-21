import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { Payment } from './entities/payment.entity';
import { CapitalModule } from '../capital/capital.module';
import { Purchase } from '../purchases/entities/purchase.entity';
import { Sale } from '../sales/entities/sale.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, Purchase, Sale]),
    CapitalModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
})
export class PaymentsModule {}
