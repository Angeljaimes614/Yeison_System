import { IsNotEmpty, IsNumber, IsUUID, IsOptional, IsString } from 'class-validator';

export class CreatePaymentDto {
  @IsString()
  @IsNotEmpty()
  date: string;

  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsString()
  @IsNotEmpty()
  method: string;

  @IsUUID()
  @IsOptional()
  purchaseId?: string;

  @IsUUID()
  @IsOptional()
  saleId?: string;

  @IsUUID()
  @IsOptional()
  createdById?: string;
}
