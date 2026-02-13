import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateCashAuditDto } from './dto/create-cash-audit.dto';
import { UpdateCashAuditDto } from './dto/update-cash-audit.dto';
import { CashAudit } from './entities/cash-audit.entity';
import { CapitalService } from '../capital/capital.service';

@Injectable()
export class CashAuditService {
  constructor(
    @InjectRepository(CashAudit)
    private readonly cashAuditRepository: Repository<CashAudit>,
    private readonly capitalService: CapitalService,
  ) {}

  async create(createCashAuditDto: CreateCashAuditDto) {
    const { branchId, physicalBalance } = createCashAuditDto;

    // 1. Get System Balance (Global Capital)
    // REFACTOR: Use global capital
    const capital = await this.capitalService.getGlobalCapital();
    if (!capital) {
      throw new NotFoundException(`Global Capital not found`);
    }

    const systemBalance = Number(capital.operativePlante);
    const difference = physicalBalance - systemBalance;

    // 2. Create Audit Record
    const cashAudit = this.cashAuditRepository.create({
      ...createCashAuditDto,
      systemBalance,
      difference,
      status: difference === 0 ? 'approved' : 'pending',
    });

    return this.cashAuditRepository.save(cashAudit);
  }

  findAll() {
    return this.cashAuditRepository.find({ relations: ['branch', 'createdBy'] });
  }

  async findOne(id: string) {
    const cashAudit = await this.cashAuditRepository.findOne({
      where: { id },
      relations: ['branch', 'createdBy'],
    });
    if (!cashAudit) throw new NotFoundException(`CashAudit ${id} not found`);
    return cashAudit;
  }

  update(id: string, updateCashAuditDto: UpdateCashAuditDto) {
    return `This action updates a #${id} cashAudit (Not implemented yet)`;
  }

  remove(id: string) {
    return `This action removes a #${id} cashAudit (Not implemented yet)`;
  }
}
