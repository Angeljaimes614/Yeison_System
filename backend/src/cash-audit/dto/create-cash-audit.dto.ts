import { IsNotEmpty, IsNumber, IsUUID, IsOptional, IsString } from 'class-validator';

export class CreateCashAuditDto {
  @IsString()
  @IsNotEmpty()
  date: string;

  @IsUUID()
  @IsNotEmpty()
  branchId: string;

  @IsNumber()
  @IsNotEmpty()
  physicalBalance: number;

  @IsString()
  @IsOptional()
  observations?: string;

  @IsUUID()
  @IsNotEmpty()
  createdById: string;
}
