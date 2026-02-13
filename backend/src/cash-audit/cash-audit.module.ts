import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CashAuditService } from './cash-audit.service';
import { CashAuditController } from './cash-audit.controller';
import { CashAudit } from './entities/cash-audit.entity';
import { CapitalModule } from '../capital/capital.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CashAudit]),
    CapitalModule,
  ],
  controllers: [CashAuditController],
  providers: [CashAuditService],
})
export class CashAuditModule {}
