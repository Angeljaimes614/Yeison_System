import { IsNotEmpty, IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateBranchDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
