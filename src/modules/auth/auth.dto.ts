import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';
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
