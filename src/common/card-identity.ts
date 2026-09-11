import { BadRequestException } from '@nestjs/common';

export function normalizeCardSerial(value: string): string {
  const normalized = value.trim().toUpperCase();
  if (!normalized) {
    throw new BadRequestException('serialNumber is required');
  }
  if (normalized.length > 64 || !/^[A-Z0-9][A-Z0-9-]*$/.test(normalized)) {
    throw new BadRequestException(
      'serialNumber must contain only letters, numbers, and hyphens (maximum 64 characters)',
    );
  }

  return normalized;
}
