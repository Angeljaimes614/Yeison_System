import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { Payment } from './entities/payment.entity';
import { Purchase } from '../purchases/entities/purchase.entity';
import { Sale } from '../sales/entities/sale.entity';
import { OldDebt } from '../old-debts/entities/old-debt.entity';
import { Capital } from '../capital/entities/capital.entity';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    private readonly dataSource: DataSource,
  ) {}

  async create(createPaymentDto: CreatePaymentDto) {
    const { purchaseId, saleId, amount } = createPaymentDto;

    if (!purchaseId && !saleId) {
      throw new BadRequestException('Payment must be associated with either a Purchase or a Sale');
    }
    if (purchaseId && saleId) {
      throw new BadRequestException('Payment cannot be associated with both Purchase and Sale');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Get Global Capital
      const capitals = await queryRunner.manager.find(Capital);
      let capital = capitals.length > 0 ? capitals[0] : null;

      if (!capital) {
          capital = queryRunner.manager.create(Capital, {
              totalCapital: 0,
              operativePlante: 0,
              accumulatedProfit: 0
           });
           await queryRunner.manager.save(capital);
      }

      if (purchaseId) {
        // --- PAYING A DEBT (Accounts Payable) ---
        // Money LEAVES the business
        const purchase = await queryRunner.manager.findOne(Purchase, { where: { id: purchaseId } });
        if (!purchase) throw new NotFoundException(`Purchase ${purchaseId} not found`);

        // Check if amount exceeds pending balance
        if (amount > Number(purchase.pendingBalance)) {
           throw new BadRequestException(`Payment amount ${amount} exceeds pending balance ${purchase.pendingBalance}`);
        }

        // 1. Update Purchase
        purchase.paidAmount = Number(purchase.paidAmount) + Number(amount);
        purchase.pendingBalance = Number(purchase.pendingBalance) - Number(amount);
        if (purchase.pendingBalance <= 0) {
          purchase.status = 'completed';
        }
        await queryRunner.manager.save(purchase);

        // 2. Update Global Capital (Money leaves)
        if (Number(capital.operativePlante) < amount) {
          // Warning but allow? No, you can't pay with money you don't have.
          throw new BadRequestException('Insufficient operative plante (cash) to make this payment');
        }
        capital.operativePlante = Number(capital.operativePlante) - Number(amount);
        await queryRunner.manager.save(capital);

      } else {
        // --- RECEIVING PAYMENT (Accounts Receivable) ---
        // Money ENTERS the business
        const sale = await queryRunner.manager.findOne(Sale, { where: { id: saleId } });
        if (!sale) throw new NotFoundException(`Sale ${saleId} not found`);

        // Check if amount exceeds pending balance
        if (amount > Number(sale.pendingBalance)) {
          throw new BadRequestException(`Payment amount ${amount} exceeds pending balance ${sale.pendingBalance}`);
        }

        // 1. Update Sale
        sale.paidAmount = Number(sale.paidAmount) + Number(amount);
        sale.pendingBalance = Number(sale.pendingBalance) - Number(amount);
        if (sale.pendingBalance <= 0) {
          sale.status = 'completed';
        }
        await queryRunner.manager.save(sale);

        // 2. Update Global Capital (Money enters)
        capital.operativePlante = Number(capital.operativePlante) + Number(amount);
        await queryRunner.manager.save(capital);
      }

      // 3. Create Payment Record
      const payment = this.paymentRepository.create(createPaymentDto);
      const savedPayment = await queryRunner.manager.save(payment);

      await queryRunner.commitTransaction();
      return savedPayment;

    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  // REVERSE PAYMENT
  async reverse(paymentId: string, userId: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const payment = await queryRunner.manager.findOne(Payment, { where: { id: paymentId } });
      if (!payment) throw new NotFoundException('Payment not found');
      if (payment.isReversed) throw new BadRequestException('Payment already reversed');

      const amount = Number(payment.amount);

      // Get Capital
      const capitals = await queryRunner.manager.find(Capital);
      const capital = capitals[0]; // Assume initialized

      if (payment.purchaseId) {
          // Reversing a payment to provider (We get money back)
          const purchase = await queryRunner.manager.findOne(Purchase, { where: { id: payment.purchaseId } });
          if (purchase) {
              purchase.paidAmount = Number(purchase.paidAmount) - amount;
              purchase.pendingBalance = Number(purchase.pendingBalance) + amount;
              purchase.status = 'pending'; // Re-open
              await queryRunner.manager.save(purchase);
          }
          // Add money back to Capital
          capital.operativePlante = Number(capital.operativePlante) + amount;

      } else if (payment.saleId) {
          // Reversing a payment from client (We give money back)
          const sale = await queryRunner.manager.findOne(Sale, { where: { id: payment.saleId } });
          if (sale) {
              sale.paidAmount = Number(sale.paidAmount) - amount;
              sale.pendingBalance = Number(sale.pendingBalance) + amount;
              sale.status = 'pending'; // Re-open
              await queryRunner.manager.save(sale);
          }
          // Remove money from Capital
          if (Number(capital.operativePlante) < amount) {
              throw new BadRequestException('Fondos insuficientes para devolver este pago');
          }
          capital.operativePlante = Number(capital.operativePlante) - amount;

      } else if (payment.oldDebtId) {
          // Reversing a payment to old debt (We give money back)
          const oldDebt = await queryRunner.manager.findOne(OldDebt, { where: { id: payment.oldDebtId } });
          if (oldDebt) {
              oldDebt.paidAmount = Number(oldDebt.paidAmount) - amount;
              oldDebt.pendingBalance = Number(oldDebt.pendingBalance) + amount;
              oldDebt.isActive = true; // Re-activate
              await queryRunner.manager.save(oldDebt);
          }
          // Remove money from Capital
          if (Number(capital.operativePlante) < amount) {
              throw new BadRequestException('Fondos insuficientes para devolver este pago');
          }
          capital.operativePlante = Number(capital.operativePlante) - amount;
      }

      await queryRunner.manager.save(capital);

      // Mark as reversed
      payment.isReversed = true;
      payment.reversedAt = new Date();
      payment.reversedBy = userId;
      await queryRunner.manager.save(payment);

      await queryRunner.commitTransaction();
      return payment;

    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async findByTransaction(type: 'sale' | 'purchase' | 'old-debt', id: string) {
      const where: any = {};
      if (type === 'sale') where.saleId = id;
      else if (type === 'purchase') where.purchaseId = id;
      else if (type === 'old-debt') where.oldDebtId = id;

      return this.paymentRepository.find({
          where,
          order: { date: 'DESC' },
          relations: ['createdBy']
      });
  }

  findAll() {
    return this.paymentRepository.find({ relations: ['purchase', 'sale', 'createdBy'] });
  }

  async findOne(id: string) {
    const payment = await this.paymentRepository.findOne({
      where: { id },
      relations: ['purchase', 'sale', 'createdBy'],
    });
    if (!payment) throw new NotFoundException(`Payment ${id} not found`);
    return payment;
  }

  update(id: string, updatePaymentDto: UpdatePaymentDto) {
    return `This action updates a #${id} payment (Not implemented yet)`;
  }

  remove(id: string) {
    return `This action removes a #${id} payment (Not implemented yet)`;
  }
}
