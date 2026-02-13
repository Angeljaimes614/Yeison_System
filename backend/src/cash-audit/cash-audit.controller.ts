import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { CashAuditService } from './cash-audit.service';
import { CreateCashAuditDto } from './dto/create-cash-audit.dto';
import { UpdateCashAuditDto } from './dto/update-cash-audit.dto';

@Controller('cash-audit')
export class CashAuditController {
  constructor(private readonly cashAuditService: CashAuditService) {}

  @Post()
  create(@Body() createCashAuditDto: CreateCashAuditDto) {
    return this.cashAuditService.create(createCashAuditDto);
  }

  @Get()
  findAll() {
    return this.cashAuditService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.cashAuditService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCashAuditDto: UpdateCashAuditDto) {
    return this.cashAuditService.update(id, updateCashAuditDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.cashAuditService.remove(id);
  }
}
