import { IsNotEmpty, IsNumber, IsUUID, IsOptional, IsString } from 'class-validator';

export class CreateSaleDto {
  @IsString()
  @IsNotEmpty()
  date: string; // ISO Date string

  @IsUUID()
  @IsNotEmpty()
  branchId: string;

  @IsUUID()
  @IsNotEmpty()
  clientId: string;

  @IsUUID()
  @IsNotEmpty()
  currencyId: string;

  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsNumber()
  @IsNotEmpty()
  rate: number;

  @IsString()
  @IsNotEmpty()
  paymentType: string;

  @IsNumber()
  @IsNotEmpty()
  paidAmount: number;

  @IsUUID()
  @IsOptional()
  createdById?: string;
}
