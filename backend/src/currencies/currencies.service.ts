import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateCurrencyDto } from './dto/create-currency.dto';
import { UpdateCurrencyDto } from './dto/update-currency.dto';
import { Currency } from './entities/currency.entity';

@Injectable()
export class CurrenciesService {
  constructor(
    @InjectRepository(Currency)
    private readonly currencyRepository: Repository<Currency>,
  ) {}

  create(createCurrencyDto: CreateCurrencyDto) {
    const currency = this.currencyRepository.create(createCurrencyDto);
    return this.currencyRepository.save(currency);
  }

  findAll() {
    return this.currencyRepository.find();
  }

  async findOne(id: string) {
    const currency = await this.currencyRepository.findOne({ where: { id } });
    if (!currency) {
      throw new NotFoundException(`Currency with ID ${id} not found`);
    }
    return currency;
  }

  async update(id: string, updateCurrencyDto: UpdateCurrencyDto) {
    const currency = await this.findOne(id);
    this.currencyRepository.merge(currency, updateCurrencyDto);
    return this.currencyRepository.save(currency);
  }

  async remove(id: string) {
    const currency = await this.findOne(id);
    return this.currencyRepository.remove(currency);
  }
}
