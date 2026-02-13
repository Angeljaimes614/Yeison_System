import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { CapitalService } from './capital.service';
import { CreateCapitalDto } from './dto/create-capital.dto';
import { UpdateCapitalDto } from './dto/update-capital.dto';

@Controller('capital')
export class CapitalController {
  constructor(private readonly capitalService: CapitalService) {}

  @Post()
  create(@Body() createCapitalDto: CreateCapitalDto) {
    return this.capitalService.create(createCapitalDto);
  }

  @Get()
  findAll() {
    return this.capitalService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.capitalService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCapitalDto: UpdateCapitalDto) {
    return this.capitalService.update(id, updateCapitalDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.capitalService.remove(id);
  }
}
