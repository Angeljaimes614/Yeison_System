import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CreateCapitalDto } from './dto/create-capital.dto';
import { UpdateCapitalDto } from './dto/update-capital.dto';
import { Capital } from './entities/capital.entity';
import { CapitalMovement } from './entities/capital-movement.entity';

@Injectable()
export class CapitalService {
  constructor(
    @InjectRepository(Capital)
    private readonly capitalRepository: Repository<Capital>,
    @InjectRepository(CapitalMovement)
    private readonly movementRepository: Repository<CapitalMovement>,
    private readonly dataSource: DataSource,
  ) {}

  async create(createCapitalDto: CreateCapitalDto) {
    // Check if global capital exists
    const existing = await this.getGlobalCapital();
    if (existing) {
       // Optionally update it or return it
       return existing;
    }
    const capital = this.capitalRepository.create(createCapitalDto);
    return this.capitalRepository.save(capital);
  }

  async registerMovement(type: 'INJECTION' | 'WITHDRAWAL_PROFIT' | 'WITHDRAWAL_CAPITAL', amount: number, description: string, userId: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let capital = await queryRunner.manager.findOne(Capital, { where: {} });
      if (!capital) {
         capital = queryRunner.manager.create(Capital, { totalCapital: 0, operativePlante: 0, accumulatedProfit: 0 });
         await queryRunner.manager.save(capital);
      }

      const numAmount = Number(amount);
      const currentPlante = Number(capital.operativePlante);
      const currentProfit = Number(capital.accumulatedProfit);
      const currentTotal = Number(capital.totalCapital);

      if (type === 'INJECTION') {
        // Increase Cash and Equity
        capital.operativePlante = currentPlante + numAmount;
        capital.totalCapital = currentTotal + numAmount;
      } else if (type === 'WITHDRAWAL_PROFIT') {
        // Check funds
        if (currentPlante < numAmount) throw new BadRequestException('Insufficient Cash in Operative Plante');
        if (currentProfit < numAmount) throw new BadRequestException('Insufficient Accumulated Profit');
        
        // Decrease Cash and Profit
        capital.operativePlante = currentPlante - numAmount;
        capital.accumulatedProfit = currentProfit - numAmount;
      } else if (type === 'WITHDRAWAL_CAPITAL') {
        // Decrease Cash and Equity
        if (currentPlante < numAmount) throw new BadRequestException('Insufficient Cash in Operative Plante');
        if (currentTotal < numAmount) throw new BadRequestException('Insufficient Total Capital');

        capital.operativePlante = currentPlante - numAmount;
        capital.totalCapital = currentTotal - numAmount;
      }

      await queryRunner.manager.save(Capital, capital);

      // Log movement
      const movement = queryRunner.manager.create(CapitalMovement, {
        type,
        amount: numAmount,
        description,
        createdById: userId
      });
      await queryRunner.manager.save(CapitalMovement, movement);

      await queryRunner.commitTransaction();
      return movement;

    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async getMovements() {
    return this.movementRepository.find({ 
      order: { date: 'DESC' },
      relations: ['createdBy'],
      take: 50 
    });
  }

  findAll() {
    return this.capitalRepository.find({ relations: ['branch'] });
  }

  async findOne(id: string) {
    const capital = await this.capitalRepository.findOne({ where: { id }, relations: ['branch'] });
    if (!capital) {
      throw new NotFoundException(`Capital with ID ${id} not found`);
    }
    return capital;
  }

  async findByBranch(branchId: string) {
    // REFACTOR: Ignore branchId, return Global Capital
    return this.getGlobalCapital();
  }

  async getGlobalCapital() {
    // Assuming there is only one record or the first one is global
    const capitals = await this.capitalRepository.find();
    if (capitals.length > 0) {
      return capitals[0];
    }
    // If no capital exists, initialize it automatically
    const newCapital = this.capitalRepository.create({
      totalCapital: 0,
      operativePlante: 0,
      accumulatedProfit: 0,
    });
    return this.capitalRepository.save(newCapital);
  }
  
  // Helper to ensure capital exists for transactions
  async getOrInitGlobalCapital() {
      let capital = await this.getGlobalCapital();
      if (!capital) {
          capital = this.capitalRepository.create({
              totalCapital: 0,
              operativePlante: 0,
              accumulatedProfit: 0,
              // branchId can be null
          });
          await this.capitalRepository.save(capital);
      }
      return capital;
  }

  async update(id: string, updateCapitalDto: UpdateCapitalDto) {
    const capital = await this.findOne(id);
    this.capitalRepository.merge(capital, updateCapitalDto);
    return this.capitalRepository.save(capital);
  }

  async remove(id: string) {
    const capital = await this.findOne(id);
    return this.capitalRepository.remove(capital);
  }
}
