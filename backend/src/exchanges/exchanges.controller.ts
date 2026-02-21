import { Controller, Post, Get, Body } from '@nestjs/common';
import { ExchangesService } from './exchanges.service';

@Controller('exchanges')
export class ExchangesController {
  constructor(private readonly exchangesService: ExchangesService) {}

  @Post()
  create(@Body() body: { sourceCurrencyId: string; targetCurrencyId: string; sourceAmount: number; targetAmount: number; userId: string }) {
    return this.exchangesService.create(body);
  }

  @Get()
  findAll() {
    return this.exchangesService.findAll();
  }
}
