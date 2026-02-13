import { IsNotEmpty, IsNumber, IsUUID, IsOptional, IsEnum } from 'class-validator';

export class CreateInventoryDto {
  @IsUUID()
  @IsNotEmpty()
  branchId: string;

  @IsUUID()
  @IsNotEmpty()
  currencyId: string;

  @IsNumber()
  @IsNotEmpty()
  originalAmount: number;

  @IsNumber()
  @IsNotEmpty()
  currentBalance: number;

  @IsNumber()
  @IsNotEmpty()
  purchaseRate: number;

  @IsOptional()
  @IsEnum(['active', 'depleted'])
  status?: string;
}
