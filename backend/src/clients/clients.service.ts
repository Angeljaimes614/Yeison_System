import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { Client } from './entities/client.entity';
import { Sale } from '../sales/entities/sale.entity';

@Injectable()
export class ClientsService {
  constructor(
    @InjectRepository(Client)
    private readonly clientRepository: Repository<Client>,
    @InjectRepository(Sale)
    private readonly saleRepository: Repository<Sale>,
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
    const sales = await this.saleRepository.find({
      where: { clientId },
      relations: ['currency', 'branch', 'createdBy'],
      order: { date: 'DESC' },
    });

    return sales.map(sale => ({
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
  }
}
