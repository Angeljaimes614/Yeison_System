import { IsNotEmpty, IsNumber, IsUUID, IsOptional, IsString } from 'class-validator';

export class CreatePurchaseDto {
  @IsString()
  @IsNotEmpty()
  date: string; // ISO Date string

  @IsUUID()
  @IsNotEmpty()
  branchId: string;

  @IsUUID()
  @IsOptional()
  providerId?: string;

  @IsString()
  @IsOptional()
  providerName?: string;

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
