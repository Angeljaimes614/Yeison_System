import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExchangesService } from './exchanges.service';
import { ExchangesController } from './exchanges.controller';
import { Exchange } from './entities/exchange.entity';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Exchange]),
    InventoryModule
  ],
  providers: [ExchangesService],
  controllers: [ExchangesController],
  exports: [ExchangesService]
})
export class ExchangesModule {}
