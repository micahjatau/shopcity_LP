import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsObject,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { UserRole } from '@prisma/client';

export class LoginDto {
  @ApiProperty({ example: 'admin@shopcity.local' })
  @IsEmail()
  username!: string;

  @ApiProperty({ minLength: 1, example: 'password' })
  @IsString()
  @MinLength(1)
  password!: string;
}

export class CashierLoginCompleteDto {
  @ApiProperty({ minLength: 43, maxLength: 43 })
  @IsString()
  @MinLength(43)
  @MaxLength(43)
  @Matches(/^[A-Za-z0-9_-]{43}$/)
  attemptToken!: string;

  @ApiProperty({ type: 'object', additionalProperties: true })
  @IsObject()
  assertion!: Record<string, unknown>;
}

export class SmokeSessionBootstrapDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  tenantId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  userId!: string;

  @ApiProperty({ enum: UserRole })
  @IsEnum(UserRole)
  role!: UserRole;
}

export class AuthUserDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'admin@shopcity.local' })
  username!: string;

  @ApiProperty({ enum: UserRole })
  role!: UserRole;

  @ApiProperty({ format: 'uuid', nullable: true })
  branchId!: string | null;
}

export class AuthSessionDto {
  @ApiProperty({ format: 'date-time' })
  expiresAt!: string;

  @ApiProperty({ format: 'uuid', nullable: true })
  deviceId!: string | null;
}

export class AuthResponseDto {
  @ApiProperty({ type: AuthUserDto })
  user!: AuthUserDto;

  @ApiProperty({ type: AuthSessionDto })
  session!: AuthSessionDto;
}

export function authResponseSchema() {
  return {
    type: 'object',
    required: ['user', 'session'],
    properties: {
      user: {
        type: 'object',
        required: ['id', 'username', 'role', 'branchId'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          username: { type: 'string', example: 'admin@shopcity.local' },
          role: { type: 'string', enum: Object.values(UserRole) },
          branchId: { type: 'string', format: 'uuid', nullable: true },
        },
      },
      session: {
        type: 'object',
        required: ['expiresAt', 'deviceId'],
        properties: {
          expiresAt: { type: 'string', format: 'date-time' },
          deviceId: { type: 'string', format: 'uuid', nullable: true },
        },
      },
    },
  };
}
