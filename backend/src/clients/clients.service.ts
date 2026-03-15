import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { Client } from './entities/client.entity';
import { Sale } from '../sales/entities/sale.entity';
import { OldDebt } from '../old-debts/entities/old-debt.entity';

@Injectable()
export class ClientsService {
  constructor(
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
    @InjectRepository(Sale)
    private readonly saleRepository: Repository<Sale>,
    @InjectRepository(OldDebt)
    private readonly oldDebtRepository: Repository<OldDebt>,
  ) {}

  create(createClientDto: CreateClientDto) {
    const client = this.clientRepository.create(createClientDto);
    return this.clientRepository.save(client);
  }

  findAll() {
    return this.clientRepository.find({
      order: {
        name: 'ASC',
      },
    });
  }

  findOne(id: string) {
    return this.clientRepository.findOne({ where: { id } });
  }

  update(id: string, updateClientDto: UpdateClientDto) {
    return this.clientRepository.update(id, updateClientDto);
  }

  remove(id: string) {
    return this.clientRepository.delete(id);
  }

  async getTransactions(clientId: string) {
    const client = await this.clientRepository.findOne({ where: { id: clientId } });
    if (!client) return [];

    // 1. Get Sales
    const sales = await this.saleRepository.find({
      where: { clientId },
      relations: ['currency', 'branch', 'createdBy'],
      order: { date: 'DESC' },
    });

    const formattedSales = sales.map(sale => ({
      id: sale.id,
      date: sale.date,
      type: 'VENTA',
      currency: sale.currency?.code || 'N/A',
      rate: sale.rate,
      amount: sale.amount,
      totalPesos: sale.totalPesos,
      paidAmount: sale.paidAmount,
      pendingBalance: sale.pendingBalance,
      status: sale.status,
      branch: sale.branch?.name || 'N/A',
      user: sale.createdBy?.username || 'Sistema',
      isReversed: sale.status === 'reversed',
      reversalReason: sale.reversalReason,
    }));

    // 2. Get Old Debts / Loans linked to this client (by Name match for now, as OldDebt doesn't have clientId yet)
    // Ideally we should link them by ID, but for now we use name matching or just fetch all for display.
    // Since OldDebt is a separate entity, we fetch debts where clientName matches client.name
    
    const debts = await this.oldDebtRepository.find({
        where: [
            { clientName: client.name, type: 'CLIENT' },
            { clientName: client.name, type: 'LOAN' }
        ],
        order: { createdAt: 'DESC' }
    });

    const formattedDebts = debts.map(debt => ({
        id: debt.id,
        date: debt.createdAt,
        type: debt.type === 'LOAN' ? 'PRÉSTAMO' : 'DEUDA ANTIGUA',
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

    // Merge and Sort
    return [...formattedSales, ...formattedDebts].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }
}
