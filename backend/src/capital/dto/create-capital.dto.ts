import { IsNotEmpty, IsNumber, IsOptional, IsUUID } from 'class-validator';

export class CreateCapitalDto {
  @IsUUID()
  @IsNotEmpty()
  branchId: string;

  @IsNumber()
  @IsOptional()
  totalCapital?: number;

  @IsNumber()
  @IsOptional()
  operativePlante?: number;
}
