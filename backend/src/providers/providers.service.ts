import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateProviderDto } from './dto/create-provider.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { Provider } from './entities/provider.entity';
import { Purchase } from '../purchases/entities/purchase.entity';

@Injectable()
export class ProvidersService {
  constructor(
    @InjectRepository(Provider)
    private readonly providerRepository: Repository<Provider>,
    @InjectRepository(Purchase)
    private readonly purchaseRepository: Repository<Purchase>,
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
    const purchases = await this.purchaseRepository.find({
      where: { providerId },
      relations: ['currency', 'branch', 'createdBy'],
      order: { date: 'DESC' },
    });

    return purchases.map(purchase => ({
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
  }
}
