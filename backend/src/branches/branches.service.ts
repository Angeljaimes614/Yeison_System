import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { Branch } from './entities/branch.entity';

@Injectable()
export class BranchesService {
  constructor(
    @InjectRepository(Branch)
    private readonly branchRepository: Repository<Branch>,
  ) {}

  create(createBranchDto: CreateBranchDto) {
    const branch = this.branchRepository.create(createBranchDto);
    return this.branchRepository.save(branch);
  }

  findAll() {
    return this.branchRepository.find();
  }

  async findOne(id: string) {
    const branch = await this.branchRepository.findOne({ where: { id } });
    if (!branch) {
      throw new NotFoundException(`Branch with ID ${id} not found`);
    }
    return branch;
  }

  async update(id: string, updateBranchDto: UpdateBranchDto) {
    const branch = await this.findOne(id);
    this.branchRepository.merge(branch, updateBranchDto);
    return this.branchRepository.save(branch);
  }

  async remove(id: string) {
    const branch = await this.findOne(id);
    return this.branchRepository.remove(branch);
  }
}
