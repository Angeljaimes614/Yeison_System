import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PurchasesService } from './purchases.service';
import { PurchasesController } from './purchases.controller';
import { Purchase } from './entities/purchase.entity';
import { CapitalModule } from '../capital/capital.module';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Purchase]),
    CapitalModule,
    InventoryModule,
  ],
  controllers: [PurchasesController],
  providers: [PurchasesService],
})
export class PurchasesModule {}
