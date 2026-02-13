import { IsNotEmpty, IsNumber, IsUUID, IsOptional, IsString } from 'class-validator';

export class CreateExpenseDto {
  @IsString()
  @IsNotEmpty()
  date: string;

  @IsUUID()
  @IsNotEmpty()
  branchId: string;

  @IsString()
  @IsNotEmpty()
  concept: string;

  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsString()
  @IsNotEmpty()
  type: string;

  @IsUUID()
  @IsOptional()
  createdById?: string;
}
