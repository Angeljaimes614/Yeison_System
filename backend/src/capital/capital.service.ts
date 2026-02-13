import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateCapitalDto } from './dto/create-capital.dto';
import { UpdateCapitalDto } from './dto/update-capital.dto';
import { Capital } from './entities/capital.entity';

@Injectable()
export class CapitalService {
  constructor(
    @InjectRepository(Capital)
    private readonly capitalRepository: Repository<Capital>,
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
