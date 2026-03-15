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
    // Helper to extract YYYY-MM
    const getMonth = (date: Date) => date.toISOString().slice(0, 7);

    // Initialize Monthly Map
    const monthlyBreakdown: Record<string, any> = {};
    const initMonth = (month: string) => {
        if (!monthlyBreakdown[month]) {
            monthlyBreakdown[month] = { 
                month, 
                in: 0, 
                out: 0, 
                net: 0,
                details: { sales: 0, injections: 0, purchases: 0, expenses: 0, withdrawals: 0 }
            };
        }
    };

    // 1. Sales Cash In
    const sales = await this.saleRepository.find({ where: { } });
    const validSales = sales.filter(s => s.status !== 'reversed');
    const salesCashIn = validSales.reduce((sum, s) => {
        const amount = Number(s.paidAmount);
        const month = getMonth(s.date);
        initMonth(month);
        monthlyBreakdown[month].in += amount;
        monthlyBreakdown[month].details.sales += amount;
        return sum + amount;
    }, 0);

    // 2. Purchases Cash Out
    const purchases = await this.purchaseRepository.find({ where: { } });
    const validPurchases = purchases.filter(p => p.status !== 'reversed');
    const purchasesCashOut = validPurchases.reduce((sum, p) => {
        const amount = Number(p.paidAmount);
        const month = getMonth(p.date);
        initMonth(month);
        monthlyBreakdown[month].out += amount;
        monthlyBreakdown[month].details.purchases += amount;
        return sum + amount;
    }, 0);

    // 3. Expenses Cash Out
    const expenses = await this.expenseRepository.find();
    const expensesCashOut = expenses.reduce((sum, e) => {
        const amount = Number(e.amount);
        const month = getMonth(e.date);
        initMonth(month);
        monthlyBreakdown[month].out += amount;
        monthlyBreakdown[month].details.expenses += amount;
        return sum + amount;
    }, 0);

    // 4. Capital Movements
    const movements = await this.movementRepository.find();
    
    const injections = movements
        .filter(m => m.type === 'INJECTION')
        .reduce((sum, m) => {
            const amount = Number(m.amount);
            const month = getMonth(m.date);
            initMonth(month);
            monthlyBreakdown[month].in += amount;
            monthlyBreakdown[month].details.injections += amount;
            return sum + amount;
        }, 0);
    
    const withdrawals = movements
        .filter(m => m.type === 'WITHDRAWAL_PROFIT' || m.type === 'WITHDRAWAL_CAPITAL')
        .reduce((sum, m) => {
            const amount = Number(m.amount);
            const month = getMonth(m.date);
            initMonth(month);
            monthlyBreakdown[month].out += amount;
            monthlyBreakdown[month].details.withdrawals += amount;
            return sum + amount;
        }, 0);

    // 5. Calculate Net per Month
    Object.values(monthlyBreakdown).forEach((m: any) => {
        m.net = m.in - m.out;
    });

    // 6. Current Theoretical Balance
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
        analysis: actualCash === theoreticalCash ? 'OK' : 'DISCREPANCY DETECTED',
        monthlyBreakdown: Object.values(monthlyBreakdown).sort((a: any, b: any) => b.month.localeCompare(a.month))
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
