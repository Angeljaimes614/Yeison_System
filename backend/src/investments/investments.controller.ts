import { Controller, Get, Post, Body, Param, Delete } from '@nestjs/common';
import { InvestmentsService } from './investments.service';

@Controller('investments')
export class InvestmentsController {
  constructor(private readonly investmentsService: InvestmentsService) {}

  // 1. Create New Investment (Product)
  @Post()
  create(@Body() dto: { name: string; category?: string; quantity: number; totalCost: number; userId: string }) {
    return this.investmentsService.createInvestment(dto);
  }

  // 2. Register Sale of Investment
  @Post('sell')
  sell(@Body() dto: { investmentId: string; quantity: number; salePrice: number; userId: string }) {
    return this.investmentsService.registerSale(dto);
  }

  // 3. Restock
  @Post('restock')
  restock(@Body() dto: { investmentId: string; quantity: number; totalCost: number; userId: string }) {
    return this.investmentsService.restock(dto);
  }

  // 4. Delete
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.investmentsService.remove(id);
  }

  @Get()
  findAll() {
    return this.investmentsService.findAll();
  }

  @Get(':id/transactions')
  findTransactions(@Param('id') id: string) {
      return this.investmentsService.findTransactions(id);
  }
}
