import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { UpdatePurchaseDto } from './dto/update-purchase.dto';
import { Purchase } from './entities/purchase.entity';
import { CapitalService } from '../capital/capital.service';
import { InventoryService } from '../inventory/inventory.service';
import { Inventory } from '../inventory/entities/inventory.entity';
import { Capital } from '../capital/entities/capital.entity';

@Injectable()
export class PurchasesService {
  constructor(
    @InjectRepository(Purchase)
    private readonly purchaseRepository: Repository<Purchase>,
    private readonly capitalService: CapitalService,
    private readonly inventoryService: InventoryService,
    private readonly dataSource: DataSource,
  ) {}

  async create(createPurchaseDto: CreatePurchaseDto) {
    let { branchId } = createPurchaseDto;
    const { currencyId, amount, rate, paidAmount } = createPurchaseDto;
    const totalPesos = amount * rate;

    // Start Transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 0. Ensure Branch (If null, fetch first one)
      if (!branchId) {
         // This is a failsafe. Normally frontend sends it.
         // But let's check directly in DB if we can find one.
         const branches = await queryRunner.query(`SELECT id FROM branch LIMIT 1`);
         if (branches && branches.length > 0) {
            branchId = branches[0].id;
         } else {
            // If absolutely no branch exists, we can't link it, but let's proceed with null if entity allows
            // or throw error.
            // For now, let's assume one exists due to seed.
         }
      }

      // 1. Check Global Capital
      // REFACTOR: Use Global Capital
      const capitals = await queryRunner.manager.find(Capital);
      let capital = capitals.length > 0 ? capitals[0] : null;

      if (!capital) {
          // If no capital, we can't buy unless we init it. 
          // For safety, require it to exist or init with 0.
          capital = queryRunner.manager.create(Capital, {
              totalCapital: 0,
              operativePlante: 0,
              accumulatedProfit: 0
           });
           await queryRunner.manager.save(capital);
      }

      // Requirement: Warn but ALLOW purchase even if operative plante is insufficient (Negative Balance Allowed)
      // if (Number(capital.operativePlante) < paidAmount) {
      //    throw new BadRequestException('Insufficient operative plante (cash) for this purchase payment');
      // }

      // 2. Create Purchase Record
      const purchase = this.purchaseRepository.create({
        ...createPurchaseDto,
        totalPesos,
        pendingBalance: totalPesos - paidAmount,
        status: paidAmount >= totalPesos ? 'completed' : 'pending',
      });
      const savedPurchase = await queryRunner.manager.save(purchase);

      // 3. Update Capital (Deduct paid amount from operative plante)
      capital.operativePlante = Number(capital.operativePlante) - Number(paidAmount);
      await queryRunner.manager.save(capital);

      // 4. Create Inventory Lote (FIFO)
      // Note: branchId is saved for traceability but inventory is global
      const inventoryLote = queryRunner.manager.create(Inventory, {
        branchId,
        currencyId,
        originalAmount: amount,
        currentBalance: amount,
        purchaseRate: rate,
        status: 'active',
      });
      await queryRunner.manager.save(inventoryLote);

      await queryRunner.commitTransaction();
      return savedPurchase;

    } catch (err) {
      await queryRunner.rollbackTransaction();
      console.error('Purchase Transaction Failed:', err); // Log full error to console
      throw new BadRequestException(`Error processing purchase: ${err.message}`); // Return friendly error
    } finally {
      await queryRunner.release();
    }
  }

  findAll() {
    return this.purchaseRepository.find({
      relations: ['branch', 'provider', 'currency', 'createdBy'],
    });
  }

  async findOne(id: string) {
    const purchase = await this.purchaseRepository.findOne({
      where: { id },
      relations: ['branch', 'provider', 'currency', 'createdBy'],
    });
    if (!purchase) throw new NotFoundException(`Purchase ${id} not found`);
    return purchase;
  }

  update(id: string, updatePurchaseDto: UpdatePurchaseDto) {
    return `This action updates a #${id} purchase (Not implemented yet)`;
  }

  remove(id: string) {
    return `This action removes a #${id} purchase (Not implemented yet)`;
  }
}
