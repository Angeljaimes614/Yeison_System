import { Controller, Get, Post, Body, Param, Delete } from '@nestjs/common';
import { OldDebtsService } from './old-debts.service';

@Controller('old-debts')
export class OldDebtsController {
  constructor(private readonly oldDebtsService: OldDebtsService) {}

  @Post()
  create(@Body() dto: { clientName: string; description: string; totalAmount: number; userId: string; type?: 'CLIENT' | 'PROVIDER' | 'LOAN' }) {
    return this.oldDebtsService.create(dto);
  }

  @Post('payment')
  registerPayment(@Body() dto: { debtId: string; amount: number; userId: string }) {
    return this.oldDebtsService.registerPayment(dto);
  }

  @Post('increase')
  increase(@Body() dto: { debtId: string; amount: number; userId: string }) {
    return this.oldDebtsService.increase(dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.oldDebtsService.remove(id);
  }

  @Get()
  findAll() {
    return this.oldDebtsService.findAll();
  }
}
