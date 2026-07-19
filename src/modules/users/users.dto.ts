import { IsOptional, IsString } from 'class-validator';
import { UserRole } from '@prisma/client';

export class CreateUserDto {
  @IsString()
  username!: string;

  @IsString()
  password!: string;

  @IsString()
  role!: UserRole;

  @IsOptional()
  @IsString()
  branchId?: string;
}

export class UpdateUserRoleDto {
  @IsString()
  role!: UserRole;
}

export class UpdateUserStatusDto {
  @IsString()
  status!: string;
}
