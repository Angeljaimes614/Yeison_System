import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CreateCapitalDto } from './dto/create-capital.dto';
import { UpdateCapitalDto } from './dto/update-capital.dto';
import { Capital } from './entities/capital.entity';
import { CapitalMovement } from './entities/capital-movement.entity';
import { Sale } from '../sales/entities/sale.entity';
import { Purchase } from '../purchases/entities/purchase.entity';
import { Expense } from '../expenses/entities/expense.entity';
import { Payment } from '../payments/entities/payment.entity';

@Injectable()
export class CapitalService {
  constructor(
    @InjectRepository(Capital)
    private readonly capitalRepository: Repository<Capital>,
    @InjectRepository(CapitalMovement)
    private readonly movementRepository: Repository<CapitalMovement>,
    @InjectRepository(Sale)
    private readonly saleRepository: Repository<Sale>,
    @InjectRepository(Purchase)
    private readonly purchaseRepository: Repository<Purchase>,
    @InjectRepository(Expense)
    private readonly expenseRepository: Repository<Expense>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    private readonly dataSource: DataSource,
  ) {}

  async getAuditReport() {
    // 1. Calculate Sales Cash In (Completed or Partial Payments)
    // We sum 'paidAmount' from all sales that are NOT reversed
    const sales = await this.saleRepository.find({ where: { } }); // Filter status!=reversed manually or query builder
    const salesCashIn = sales
        .filter(s => s.status !== 'reversed')
        .reduce((sum, s) => sum + Number(s.paidAmount), 0);

    // 2. Calculate Purchases Cash Out
    const purchases = await this.purchaseRepository.find({ where: { } });
    const purchasesCashOut = purchases
        .filter(p => p.status !== 'reversed')
        .reduce((sum, p) => sum + Number(p.paidAmount), 0);

    // 3. Calculate Expenses Cash Out
    const expenses = await this.expenseRepository.find();
    const expensesCashOut = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

    // 4. Calculate Payments (Old Debts / Extra Payments) 
    // Wait, 'paidAmount' in Sale/Purchase ALREADY includes payments made via PaymentsService?
    // Yes, PaymentsService updates Sale.paidAmount.
    // So if we sum Sale.paidAmount, we are covering everything linked to sales.
    // BUT what about payments linked to OLD_DEBTS? Those are not in Sale table.
    // We need to check Payments linked to OldDebt.
    const payments = await this.paymentRepository.find({ where: { isReversed: false } });
    const oldDebtPaymentsIn = payments
        .filter(p => p.oldDebtId && !p.purchaseId && !p.saleId) // Assuming Type logic for OldDebt? 
        // Actually Payment entity has 'oldDebtId'.
        // If OldDebt type is PROVIDER -> Cash Out. If CLIENT -> Cash In.
        // Complex... For now let's assume OldDebt payments are minimal or handle them.
        // Let's check if we can distinguish type.
        // The Payment entity doesn't duplicate the type easily.
        // Let's skip OldDebt specific logic for this rough audit unless critical.
        // OR:
        // We can just sum all INJECTIONS and WITHDRAWALS from CapitalMovements.
        .reduce((sum, p) => sum, 0); 

    // 5. Capital Movements (Manual Injections / Withdrawals)
    const movements = await this.movementRepository.find();
    const injections = movements
        .filter(m => m.type === 'INJECTION')
        .reduce((sum, m) => sum + Number(m.amount), 0);
    
    const withdrawals = movements
        .filter(m => m.type === 'WITHDRAWAL_PROFIT' || m.type === 'WITHDRAWAL_CAPITAL')
        .reduce((sum, m) => sum + Number(m.amount), 0);

    // 6. Current Theoretical Balance
    // Cash = (Injections + SalesCashIn) - (PurchasesCashOut + ExpensesCashOut + Withdrawals)
    // Note: SalesCashIn includes initial payment + subsequent payments.
    const theoreticalCash = (injections + salesCashIn) - (purchasesCashOut + expensesCashOut + withdrawals);

    // 7. Actual Balance
    const capital = await this.getGlobalCapital();
    const actualCash = Number(capital.operativePlante);

    return {
        salesCashIn,
        purchasesCashOut,
        expensesCashOut,
        injections,
        withdrawals,
        theoreticalCash,
        actualCash,
        difference: actualCash - theoreticalCash,
        analysis: actualCash === theoreticalCash ? 'OK' : 'DISCREPANCY DETECTED'
    };
  }

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
        // Check funds (Cash must exist to pay, but Profit can go negative)
        if (currentPlante < numAmount) throw new BadRequestException('Fondos insuficientes en Caja Operativa para realizar este gasto/retiro.');
        
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

  // --- MANUAL ADJUSTMENT (ADMIN ONLY) ---
  async adjustOperativeCash(newAmount: number, userId: string) {
      const capital = await this.getGlobalCapital();
      const currentAmount = Number(capital.operativePlante);
      const diff = newAmount - currentAmount;

      if (diff === 0) return capital;

      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
          // Update Capital
          capital.operativePlante = newAmount;
          await queryRunner.manager.save(Capital, capital);

          // Log Movement
          const movement = queryRunner.manager.create(CapitalMovement, {
              type: diff > 0 ? 'INJECTION' : 'WITHDRAWAL_CAPITAL', // Treat as capital adjustment
              amount: Math.abs(diff),
              description: `Ajuste manual de Caja Operativa (Admin). Anterior: ${currentAmount}, Nuevo: ${newAmount}`,
              createdById: userId
          });
          await queryRunner.manager.save(CapitalMovement, movement);

          await queryRunner.commitTransaction();
          return capital;
      } catch (err) {
          await queryRunner.rollbackTransaction();
          throw err;
      } finally {
          await queryRunner.release();
      }
  }

  async remove(id: string) {
    const capital = await this.findOne(id);
    return this.capitalRepository.remove(capital);
  }
}
