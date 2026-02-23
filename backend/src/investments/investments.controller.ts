import { Controller, Get, Post, Body } from '@nestjs/common';
import { InvestmentsService } from './investments.service';

@Controller('investments')
export class InvestmentsController {
  constructor(private readonly investmentsService: InvestmentsService) {}

  @Post()
  create(@Body() createInvestmentDto: { type: 'INVERSION' | 'RETORNO', concept: string, amount: number, profit?: number, userId: string }) {
    return this.investmentsService.create(createInvestmentDto);
  }

  @Get()
  findAll() {
    return this.investmentsService.findAll();
  }
}
