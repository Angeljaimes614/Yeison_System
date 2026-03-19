import { Controller, Get, Post, Body, Param, Put } from '@nestjs/common';
import { DepositsService } from './deposits.service';

@Controller('deposits')
export class DepositsController {
  constructor(private readonly depositsService: DepositsService) {}

  @Post()
  create(@Body() createDepositDto: { amount: number; multiplier: number; description: string; userId: string }) {
    return this.depositsService.create(createDepositDto);
  }

  @Get()
  findAll() {
    return this.depositsService.findAll();
  }

  @Put(':id/reverse')
  reverse(@Param('id') id: string) {
    return this.depositsService.reverse(id);
  }
}