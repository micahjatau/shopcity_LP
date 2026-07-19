import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsIn,
  IsOptional,
  IsUUID,
  IsEmail,
  IsString,
} from 'class-validator';
import { UserRole } from '@prisma/client';

export class CreateUserDto {
  @ApiProperty({ example: 'admin@shopcity.local' })
  @IsEmail()
  @IsString()
  username!: string;

  @ApiProperty({ minLength: 1 })
  @IsString()
  password!: string;

  @ApiProperty({ enum: UserRole })
  @IsEnum(UserRole)
  role!: UserRole;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  branchId?: string;
}

export class UpdateUserRoleDto {
  @ApiProperty({ enum: UserRole })
  @IsEnum(UserRole)
  role!: UserRole;
}

export class UpdateUserStatusDto {
  @ApiProperty({ enum: ['ACTIVE', 'DISABLED', 'SUSPENDED'] })
  @IsIn(['ACTIVE', 'DISABLED', 'SUSPENDED'])
  status!: 'ACTIVE' | 'DISABLED' | 'SUSPENDED';
}
