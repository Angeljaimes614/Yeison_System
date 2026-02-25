import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OldDebtsService } from './old-debts.service';
import { OldDebtsController } from './old-debts.controller';
import { OldDebt } from './entities/old-debt.entity';

@Module({
  imports: [TypeOrmModule.forFeature([OldDebt])],
  providers: [OldDebtsService],
  controllers: [OldDebtsController],
  exports: [OldDebtsService]
})
export class OldDebtsModule {}
