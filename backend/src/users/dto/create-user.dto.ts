import { IsNotEmpty, IsString, IsOptional, IsEnum, IsUUID } from 'class-validator';
import { UserRole } from '../entities/user.entity';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @IsUUID()
  @IsOptional()
  branchId?: string;
}
