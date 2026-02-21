import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CapitalService } from './capital.service';
import { CapitalController } from './capital.controller';
import { Capital } from './entities/capital.entity';
import { CapitalMovement } from './entities/capital-movement.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Capital, CapitalMovement])],
  controllers: [CapitalController],
  providers: [CapitalService],
  exports: [CapitalService],
})
export class CapitalModule {}
