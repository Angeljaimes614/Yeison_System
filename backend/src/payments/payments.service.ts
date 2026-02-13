import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { Payment } from './entities/payment.entity';
import { Purchase } from '../purchases/entities/purchase.entity';
import { Sale } from '../sales/entities/sale.entity';
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
          throw new BadRequestException('Insufficient operative plante (cash) to make this payment');
        }
        capital.operativePlante = Number(capital.operativePlante) - Number(amount);
        await queryRunner.manager.save(capital);

      } else {
        // --- RECEIVING PAYMENT (Accounts Receivable) ---
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
