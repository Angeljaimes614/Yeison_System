import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { OldDebtsService } from './old-debts.service';

@Controller('old-debts')
export class OldDebtsController {
  constructor(private readonly oldDebtsService: OldDebtsService) {}

  @Post()
  create(@Body() dto: { clientName: string; description: string; totalAmount: number; userId: string }) {
    return this.oldDebtsService.create(dto);
  }

  @Post('payment')
  registerPayment(@Body() dto: { debtId: string; amount: number; userId: string }) {
    return this.oldDebtsService.registerPayment(dto);
  }

  @Get()
  findAll() {
    return this.oldDebtsService.findAll();
  }
}
