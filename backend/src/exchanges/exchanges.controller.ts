import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { ExchangesService } from './exchanges.service';

@Controller('exchanges')
export class ExchangesController {
  constructor(private readonly exchangesService: ExchangesService) {}

  @Post()
  create(@Body() body: { sourceCurrencyId: string; targetCurrencyId: string; sourceAmount: number; targetAmount: number; userId: string }) {
    return this.exchangesService.create(body);
  }

  @Post(':id/reverse')
  reverse(@Param('id') id: string, @Body() body: { userId: string }) {
    return this.exchangesService.reverse(id, body.userId);
  }

  @Get()
  findAll() {
    return this.exchangesService.findAll();
  }
}
