import { IsNotEmpty, IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateCurrencyDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  type?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
