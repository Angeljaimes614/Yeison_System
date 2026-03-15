import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateProviderDto } from './dto/create-provider.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { Provider } from './entities/provider.entity';
import { Purchase } from '../purchases/entities/purchase.entity';
import { OldDebt } from '../old-debts/entities/old-debt.entity';

@Injectable()
export class ProvidersService {
  constructor(
    @InjectRepository(Provider)
    private readonly providerRepository: Repository<Provider>,
    @InjectRepository(Purchase)
    private readonly purchaseRepository: Repository<Purchase>,
    @InjectRepository(OldDebt)
    private readonly oldDebtRepository: Repository<OldDebt>,
  ) {}

  create(createProviderDto: CreateProviderDto) {
    const provider = this.providerRepository.create(createProviderDto);
    return this.providerRepository.save(provider);
  }

  findAll() {
    return this.providerRepository.find({
      order: {
        name: 'ASC',
      },
    });
  }

  findOne(id: string) {
    return this.providerRepository.findOne({ where: { id } });
  }

  update(id: string, updateProviderDto: UpdateProviderDto) {
    return this.providerRepository.update(id, updateProviderDto);
  }

  remove(id: string) {
    return this.providerRepository.delete(id);
  }

  async getTransactions(providerId: string) {
    const provider = await this.providerRepository.findOne({ where: { id: providerId } });
    if (!provider) return [];

    // 1. Get Purchases
    const purchases = await this.purchaseRepository.find({
      where: { providerId },
      relations: ['currency', 'branch', 'createdBy'],
      order: { date: 'DESC' },
    });

    const formattedPurchases = purchases.map(purchase => ({
      id: purchase.id,
      date: purchase.date,
      type: 'COMPRA',
      currency: purchase.currency?.code || 'N/A',
      rate: purchase.rate,
      amount: purchase.amount,
      totalPesos: purchase.totalPesos,
      paidAmount: purchase.paidAmount,
      pendingBalance: purchase.pendingBalance,
      status: purchase.status,
      branch: purchase.branch?.name || 'N/A',
      user: purchase.createdBy?.username || 'Sistema',
      isReversed: purchase.status === 'reversed',
      reversalReason: purchase.reversalReason,
    }));

    // 2. Get Old Debts (Deudas Antiguas Proveedor)
    const debts = await this.oldDebtRepository.find({
        where: { clientName: provider.name, type: 'PROVIDER' },
        order: { createdAt: 'DESC' }
    });

    const formattedDebts = debts.map(debt => ({
        id: debt.id,
        date: debt.createdAt,
        type: 'DEUDA ANTIGUA',
        currency: 'COP',
        rate: 1,
        amount: 0,
        totalPesos: debt.totalAmount,
        paidAmount: debt.paidAmount,
        pendingBalance: debt.pendingBalance,
        status: debt.isActive ? 'active' : 'completed',
        branch: 'N/A',
        user: 'Sistema',
        isReversed: false,
        reversalReason: null,
        description: debt.description
    }));

    return [...formattedPurchases, ...formattedDebts].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }
}
