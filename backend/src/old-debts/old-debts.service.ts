import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { OldDebt } from './entities/old-debt.entity';
import { Capital } from '../capital/entities/capital.entity';

@Injectable()
export class OldDebtsService {
  constructor(
    @InjectRepository(OldDebt)
    private readonly oldDebtRepository: Repository<OldDebt>,
    private readonly dataSource: DataSource,
  ) {}

  // 1. REGISTER OLD DEBT (Only creates record, does NOT affect Capital yet because money was lent long ago)
  async create(data: { clientName: string; description: string; totalAmount: number; userId: string }) {
    const { clientName, description, totalAmount, userId } = data;

    const debt = this.oldDebtRepository.create({
        clientName,
        description,
        totalAmount,
        paidAmount: 0,
        pendingBalance: totalAmount,
        isActive: true,
        createdById: userId
    });

    return this.oldDebtRepository.save(debt);
  }

  // 2. REGISTER PAYMENT (Money ENTERS Capital)
  async registerPayment(data: { debtId: string; amount: number; userId: string }) {
    const { debtId, amount, userId } = data;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
        const debt = await queryRunner.manager.findOne(OldDebt, { where: { id: debtId } });
        if (!debt) throw new NotFoundException('Deuda no encontrada');

        if (Number(debt.pendingBalance) < Number(amount)) {
            throw new BadRequestException(`El abono excede el saldo pendiente ($${debt.pendingBalance})`);
        }

        // Update Debt
        debt.paidAmount = Number(debt.paidAmount) + Number(amount);
        debt.pendingBalance = Number(debt.pendingBalance) - Number(amount);
        
        if (debt.pendingBalance <= 0) {
            debt.isActive = false;
            debt.pendingBalance = 0;
        }

        await queryRunner.manager.save(debt);

        // Update Capital (Money In)
        const capitals = await queryRunner.manager.find(Capital);
        let capital = capitals.length > 0 ? capitals[0] : null;

        if (!capital) {
             capital = queryRunner.manager.create(Capital, { totalCapital: 0, operativePlante: 0, accumulatedProfit: 0 });
        }

        capital.operativePlante = Number(capital.operativePlante) + Number(amount);
        // Note: Does this count as Profit? 
        // If it's returning capital, it's just cash flow. Profit depends on interest.
        // For simplicity, we just add to Cash Flow (Operative Plante).
        
        await queryRunner.manager.save(capital);

        await queryRunner.commitTransaction();
        return debt;

    } catch (err) {
        await queryRunner.rollbackTransaction();
        throw err;
    } finally {
        await queryRunner.release();
    }
  }

  findAll() {
    return this.oldDebtRepository.find({
        order: { createdAt: 'DESC' }
    });
  }
}
