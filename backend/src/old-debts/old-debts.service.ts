import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { OldDebt } from './entities/old-debt.entity';
import { Capital } from '../capital/entities/capital.entity';
import { Payment } from '../payments/entities/payment.entity';

@Injectable()
export class OldDebtsService {
  constructor(
    @InjectRepository(OldDebt)
    private readonly oldDebtRepository: Repository<OldDebt>,
    private readonly dataSource: DataSource,
  ) {}

  // 1. REGISTER OLD DEBT / LOAN
  async create(data: { clientName: string; description: string; totalAmount: number; userId: string; type?: 'CLIENT' | 'PROVIDER' | 'LOAN' }) {
    const { clientName, description, totalAmount, userId, type } = data;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
        const debt = this.oldDebtRepository.create({
            clientName,
            description,
            totalAmount,
            paidAmount: 0,
            pendingBalance: totalAmount,
            isActive: true,
            createdById: userId,
            type: type || 'CLIENT'
        });

        await queryRunner.manager.save(debt);

        // If it's a NEW LOAN ('LOAN'), money leaves the Cash Register immediately
        if (type === 'LOAN') {
            const capitals = await queryRunner.manager.find(Capital);
            let capital = capitals.length > 0 ? capitals[0] : null;
            
            if (!capital) {
                 // Should not happen in production, but handle init
                 capital = queryRunner.manager.create(Capital, { totalCapital: 0, operativePlante: 0, accumulatedProfit: 0 });
            }

            if (Number(capital.operativePlante) < Number(totalAmount)) {
                throw new BadRequestException('Fondos insuficientes en caja para realizar este préstamo');
            }

            capital.operativePlante = Number(capital.operativePlante) - Number(totalAmount);
            await queryRunner.manager.save(Capital, capital);

            // Register Capital Movement (Money Out)
            const payment = queryRunner.manager.create(Payment, {
                date: new Date(),
                amount: totalAmount,
                method: 'cash',
                oldDebtId: debt.id,
                createdById: userId,
                type: 'DEBT_INCREASE' // Using DEBT_INCREASE to signify money out for loan creation
            });
            await queryRunner.manager.save(Payment, payment);
        }

        await queryRunner.commitTransaction();
        return debt;

    } catch (err) {
        await queryRunner.rollbackTransaction();
        throw err;
    } finally {
        await queryRunner.release();
    }
  }

  // 2. REGISTER PAYMENT (Money ENTERS or LEAVES Capital)
  async registerPayment(data: { debtId: string; amount: number; userId: string }) {
    const { debtId, amount, userId } = data;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
        const debt = await queryRunner.manager.findOne(OldDebt, { where: { id: debtId } });
        if (!debt) throw new NotFoundException('Deuda no encontrada');

        if (Number(debt.pendingBalance) < Number(amount)) {
            // Allow overpayment! Do not throw error.
            // throw new BadRequestException(`El abono excede el saldo pendiente ($${debt.pendingBalance})`);
        }



        // Update Debt
        debt.paidAmount = Number(debt.paidAmount) + Number(amount);
        debt.pendingBalance = Number(debt.pendingBalance) - Number(amount);
        
        if (debt.pendingBalance <= 0) {
            debt.isActive = false;
            debt.pendingBalance = 0;
        }

        await queryRunner.manager.save(debt);

        // Update Capital (Money In or Out)
        const capitals = await queryRunner.manager.find(Capital);
        let capital = capitals.length > 0 ? capitals[0] : null;

        if (!capital) {
             capital = queryRunner.manager.create(Capital, { totalCapital: 0, operativePlante: 0, accumulatedProfit: 0 });
        }

        if (debt.type === 'PROVIDER') {
            // I am paying the provider, so money leaves the cash register (OUT)
            if (Number(capital.operativePlante) < Number(amount)) {
                throw new BadRequestException('Fondos insuficientes en caja para realizar este abono a proveedor');
            }
            capital.operativePlante = Number(capital.operativePlante) - Number(amount);
        } else {
            // Client/Loan paying me, so money enters the cash register (IN)
            capital.operativePlante = Number(capital.operativePlante) + Number(amount);
        }
        
        await queryRunner.manager.save(capital);


        // Create Payment Record
        const payment = queryRunner.manager.create(Payment, {
            date: new Date(),
            amount: amount,
            method: 'cash',
            oldDebtId: debt.id,
            createdById: userId,
            type: 'PAYMENT' // Explicitly set type to PAYMENT for clarity
        });
        await queryRunner.manager.save(payment);

        await queryRunner.commitTransaction();
        return debt;

    } catch (err) {
        await queryRunner.rollbackTransaction();
        throw err;
    } finally {
        await queryRunner.release();
    }
  }

  async increase(data: { debtId: string; amount: number; userId: string }) {
    const { debtId, amount, userId } = data;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
        const debt = await queryRunner.manager.findOne(OldDebt, { where: { id: debtId } });
        if (!debt) throw new NotFoundException('Deuda no encontrada');

        // Update Debt
        debt.totalAmount = Number(debt.totalAmount) + Number(amount);
        debt.pendingBalance = Number(debt.pendingBalance) + Number(amount);
        debt.isActive = true;

        await queryRunner.manager.save(debt);

        // Update Capital
        const capitals = await queryRunner.manager.find(Capital);
        let capital = capitals.length > 0 ? capitals[0] : null;
        if (!capital) capital = queryRunner.manager.create(Capital, { totalCapital: 0, operativePlante: 0, accumulatedProfit: 0 });

        if (debt.type === 'CLIENT' || debt.type === 'LOAN' || !debt.type) {
            // Lending MORE money to client/loan -> Money OUT
            if (Number(capital.operativePlante) < Number(amount)) {
                throw new BadRequestException('Fondos insuficientes en caja para aumentar este préstamo');
            }
            capital.operativePlante = Number(capital.operativePlante) - Number(amount);
        } else {
            // Borrowing MORE money from provider -> Money IN
            capital.operativePlante = Number(capital.operativePlante) + Number(amount);
        }
        await queryRunner.manager.save(capital);

        // Create Payment Record (as DEBT_INCREASE)
        const payment = queryRunner.manager.create(Payment, {
            date: new Date(),
            amount: amount,
            method: 'cash',
            oldDebtId: debt.id,
            createdById: userId,
            type: 'DEBT_INCREASE'
        });
        await queryRunner.manager.save(payment);

        await queryRunner.commitTransaction();
        return debt;

    } catch (err) {
        await queryRunner.rollbackTransaction();
        throw err;
    } finally {
        await queryRunner.release();
    }
  }

    // 3. REMOVE DEBT (Reverse Everything)
    async remove(id: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
        const debt = await queryRunner.manager.findOne(OldDebt, { where: { id } });
        if (!debt) throw new NotFoundException('Deuda no encontrada');

        // Find all payments/movements linked to this debt
        const payments = await queryRunner.manager.find(Payment, { where: { oldDebtId: id } });

        const capitals = await queryRunner.manager.find(Capital);
        let capital = capitals.length > 0 ? capitals[0] : null;
        if (!capital) capital = queryRunner.manager.create(Capital, { totalCapital: 0, operativePlante: 0, accumulatedProfit: 0 });

        for (const payment of payments) {
            // Reverse logic based on payment type
            if (payment.type === 'DEBT_INCREASE') {
                // This was a LOAN given (Money OUT) or RECEIVED (Money IN)
                if (debt.type === 'PROVIDER') {
                    // We borrowed from Provider (Money IN) -> Reverse: Money OUT
                     if (Number(capital.operativePlante) < Number(payment.amount)) {
                         throw new BadRequestException('Fondos insuficientes para revertir el préstamo del proveedor');
                     }
                     capital.operativePlante = Number(capital.operativePlante) - Number(payment.amount);
                } else {
                    // We lent to Client (Money OUT) -> Reverse: Money IN
                    capital.operativePlante = Number(capital.operativePlante) + Number(payment.amount);
                }
            } else {
                // This was a PAYMENT/ABONO
                // If Client paid us (Money IN) -> Reverse: Money OUT
                // If We paid Provider (Money OUT) -> Reverse: Money IN
                
                if (debt.type === 'PROVIDER') {
                    // We paid provider (Money OUT) -> Reverse: Money IN
                    capital.operativePlante = Number(capital.operativePlante) + Number(payment.amount);
                } else {
                    // Client paid us (Money IN) -> Reverse: Money OUT
                     if (Number(capital.operativePlante) < Number(payment.amount)) {
                         throw new BadRequestException('Fondos insuficientes para devolver los abonos de esta deuda');
                     }
                     capital.operativePlante = Number(capital.operativePlante) - Number(payment.amount);
                }
            }
            
            // Delete payment
            await queryRunner.manager.remove(payment);
        }

        // Save Capital
        await queryRunner.manager.save(capital);

        // Delete Debt
        await queryRunner.manager.remove(debt);

        await queryRunner.commitTransaction();
        return { message: 'Deuda eliminada correctamente' };

    } catch (err) {
        await queryRunner.rollbackTransaction();
        throw err;
    } finally {
        await queryRunner.release();
    }
  }

    async findAll() {
    return this.oldDebtRepository.find({
        order: { createdAt: 'DESC' },
        // where: { isActive: true } // Removed to show ALL debts including negative/zero if needed
    });
  }
}
