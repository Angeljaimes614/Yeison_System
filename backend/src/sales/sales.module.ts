import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SalesService } from './sales.service';
import { SalesController } from './sales.controller';
import { Sale } from './entities/sale.entity';
import { CapitalModule } from '../capital/capital.module';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Sale]),
    CapitalModule,
    InventoryModule,
  ],
  controllers: [SalesController],
  providers: [SalesService],
})
export class SalesModule {}
