import { BadRequestException } from '@nestjs/common';
import { normalizeCardSerial } from './card-identity';

describe('normalizeCardSerial', () => {
  it('canonicalizes surrounding whitespace and identity case', () => {
    expect(normalizeCardSerial('  card-01  ')).toBe('CARD-01');
  });

  it('rejects an empty serial', () => {
    expect(() => normalizeCardSerial('   ')).toThrow(BadRequestException);
  });
});
