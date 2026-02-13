import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';
import { Inventory } from './entities/inventory.entity';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(Inventory)
    private readonly inventoryRepository: Repository<Inventory>,
  ) {}

  create(createInventoryDto: CreateInventoryDto) {
    const inventory = this.inventoryRepository.create(createInventoryDto);
    return this.inventoryRepository.save(inventory);
  }

  findAll() {
    return this.inventoryRepository.find({ relations: ['branch', 'currency'] });
  }

  async findOne(id: string) {
    const inventory = await this.inventoryRepository.findOne({ where: { id }, relations: ['branch', 'currency'] });
    if (!inventory) {
      throw new NotFoundException(`Inventory with ID ${id} not found`);
    }
    return inventory;
  }

  // REFACTOR: Remove branchId dependency for FIFO
  async findGlobalByCurrency(currencyId: string) {
    return this.inventoryRepository.find({
      where: { currencyId, status: 'active' },
      order: { purchaseDate: 'ASC' }, // FIFO: Oldest first, GLOBAL
    });
  }

  // Deprecated or mapped to global
  async findByBranchAndCurrency(branchId: string, currencyId: string) {
    return this.findGlobalByCurrency(currencyId);
  }

  async update(id: string, updateInventoryDto: UpdateInventoryDto) {
    const inventory = await this.findOne(id);
    this.inventoryRepository.merge(inventory, updateInventoryDto);
    return this.inventoryRepository.save(inventory);
  }

  async remove(id: string) {
    const inventory = await this.findOne(id);
    return this.inventoryRepository.remove(inventory);
  }
}
