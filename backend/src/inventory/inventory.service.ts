import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';
import { Inventory } from './entities/inventory.entity';
import { GlobalInventory } from './entities/global-inventory.entity';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(Inventory)
    private readonly inventoryRepository: Repository<Inventory>,
    @InjectRepository(GlobalInventory)
    private readonly globalInventoryRepository: Repository<GlobalInventory>,
    private readonly dataSource: DataSource,
  ) {}

  async create(createInventoryDto: CreateInventoryDto) {
    const inventory = this.inventoryRepository.create(createInventoryDto);
    return this.inventoryRepository.save(inventory);
  }

  // === WEIGHTED AVERAGE COST LOGIC ===

  // 1. Get Global Inventory for Currency
  async getGlobalInventory(currencyId: string) {
    let globalInv = await this.globalInventoryRepository.findOne({ where: { currencyId } });
    if (!globalInv) {
      globalInv = this.globalInventoryRepository.create({
        currencyId,
        totalQuantity: 0,
        totalCostCOP: 0,
        averageCost: 0
      });
      await this.globalInventoryRepository.save(globalInv);
    }
    return globalInv;
  }

  // 2. Register Purchase (Updates WAC)
  // Must be called inside a transaction ideally
  async registerPurchase(currencyId: string, quantity: number, totalCostCOP: number, manager?: any) {
    const repo = manager ? manager.getRepository(GlobalInventory) : this.globalInventoryRepository;
    
    let globalInv = await repo.findOne({ where: { currencyId } });
    if (!globalInv) {
        globalInv = repo.create({ currencyId, totalQuantity: 0, totalCostCOP: 0, averageCost: 0 });
    }

    const oldQty = Number(globalInv.totalQuantity);
    const oldCost = Number(globalInv.totalCostCOP);
    
    const newQty = oldQty + Number(quantity);
    const newCost = oldCost + Number(totalCostCOP);
    
    // Avoid division by zero
    const newAvg = newQty > 0 ? newCost / newQty : 0;

    globalInv.totalQuantity = newQty;
    globalInv.totalCostCOP = newCost;
    globalInv.averageCost = newAvg;

    await repo.save(globalInv);
    return globalInv;
  }

  // 3. Register Sale (Updates Qty and TotalCost, keeps Avg)
  async registerSale(currencyId: string, quantity: number, manager?: any) {
    const repo = manager ? manager.getRepository(GlobalInventory) : this.globalInventoryRepository;
    
    const globalInv = await repo.findOne({ where: { currencyId } });
    if (!globalInv) throw new NotFoundException('Inventory not found for this currency');

    const currentAvg = Number(globalInv.averageCost);
    const costOfSale = Number(quantity) * currentAvg;

    globalInv.totalQuantity = Number(globalInv.totalQuantity) - Number(quantity);
    globalInv.totalCostCOP = Number(globalInv.totalCostCOP) - costOfSale;
    
    // Safety check: if qty goes to 0 or negative, reset
    if (globalInv.totalQuantity <= 0) {
        globalInv.totalQuantity = 0;
        globalInv.totalCostCOP = 0;
        globalInv.averageCost = 0; // Reset average only on zero inventory
    }

    await repo.save(globalInv);
    
    return {
        costOfSale,
        averageCostUsed: currentAvg
    };
  }

  // === END WAC LOGIC ===

  findAll() {
    return this.inventoryRepository.find({ relations: ['branch', 'currency'] });
  }

  async findAllGlobal() {
      return this.globalInventoryRepository.find({ relations: ['currency'] });
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
