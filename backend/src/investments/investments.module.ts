import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvestmentsService } from './investments.service';
import { InvestmentsController } from './investments.controller';
import { Investment } from './entities/investment.entity';
import { InvestmentTransaction } from './entities/investment-transaction.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Investment, InvestmentTransaction])],
  providers: [InvestmentsService],
  controllers: [InvestmentsController]
})
export class InvestmentsModule {}
