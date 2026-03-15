import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProvidersService } from './providers.service';
import { ProvidersController } from './providers.controller';
import { Provider } from './entities/provider.entity';
import { Purchase } from '../purchases/entities/purchase.entity';
import { OldDebt } from '../old-debts/entities/old-debt.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Provider, Purchase, OldDebt])],
  controllers: [ProvidersController],
  providers: [ProvidersService],
  exports: [ProvidersService],
})
export class ProvidersModule {}
