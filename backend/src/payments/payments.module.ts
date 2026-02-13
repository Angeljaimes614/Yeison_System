import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { Payment } from './entities/payment.entity';
import { CapitalModule } from '../capital/capital.module';
import { PurchasesModule } from '../purchases/purchases.module'; // Import to update Purchase
import { SalesModule } from '../sales/sales.module'; // Import to update Sale
// Wait, circular dependency if I import PurchasesModule/SalesModule directly if they use PaymentsModule?
// Payments update balances.
// Ideally, Payment service should update the Purchase/Sale entity directly using repositories if possible, or forwardRef.
// Let's use TypeOrmModule.forFeature to access Repositories of Purchase/Sale directly here to avoid circular module dependency if possible, or use simple service calls.
// PurchasesModule imports Capital, Inventory.
// SalesModule imports Capital, Inventory.
// PaymentsModule needs Capital, Purchase, Sale.
// It seems safe to import repositories.

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
