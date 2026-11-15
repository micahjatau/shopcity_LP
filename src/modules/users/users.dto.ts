import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsIn,
  IsOptional,
  IsUUID,
  IsEmail,
  IsString,
  IsNotEmpty,
  MaxLength,
  Matches,
} from 'class-validator';
import { UserRole } from '@prisma/client';

const assignableStaffRoles = [
  UserRole.CASHIER,
  UserRole.SUPERVISOR,
  UserRole.ADMIN,
] as const;

export class CreateUserDto {
  @ApiProperty({
    example: 'admin@shopcity.local',
    description: 'Staff email address; retained as the username API field.',
    maxLength: 254,
  })
  @IsEmail()
  @IsString()
  @MaxLength(254)
  username!: string;

  @ApiProperty({ minLength: 1, maxLength: 80 })
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(80)
  firstName!: string;

  @ApiProperty({ minLength: 1, maxLength: 80 })
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(80)
  lastName!: string;

  @ApiProperty({ minLength: 7, maxLength: 32 })
  @IsString()
  @Matches(/^\+?[0-9][0-9\s().-]{5,30}[0-9]$/)
  phoneNumber!: string;

  @ApiProperty({ minLength: 1 })
  @IsString()
  @IsNotEmpty()
  password!: string;

  @ApiProperty({ enum: assignableStaffRoles })
  @IsIn(assignableStaffRoles)
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
