import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CapitalService } from './capital.service';
import { CapitalController } from './capital.controller';
import { Capital } from './entities/capital.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Capital])],
  controllers: [CapitalController],
  providers: [CapitalService],
  exports: [CapitalService],
})
export class CapitalModule {}
