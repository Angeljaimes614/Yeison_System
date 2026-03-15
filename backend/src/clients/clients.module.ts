import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsService } from './clients.service';
import { ClientsController } from './clients.controller';
import { Client } from './entities/client.entity';
import { Sale } from '../sales/entities/sale.entity';
import { OldDebt } from '../old-debts/entities/old-debt.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Client, Sale, OldDebt])],
  controllers: [ClientsController],
  providers: [ClientsService],
  exports: [ClientsService],
})
export class ClientsModule {}
