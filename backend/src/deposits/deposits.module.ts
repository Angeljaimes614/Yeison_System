import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DepositsService } from './deposits.service';
import { DepositsController } from './deposits.controller';
import { Deposit } from './entities/deposit.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Deposit])],
  controllers: [DepositsController],
  providers: [DepositsService],
  exports: [DepositsService],
})
export class DepositsModule {}