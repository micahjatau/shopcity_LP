import { normalizePhoneToE164 } from './phone';

describe('normalizePhoneToE164', () => {
  it('normalizes local Nigerian numbers to E.164', () => {
    expect(normalizePhoneToE164('08012345678')).toBe('+2348012345678');
  });

  it('preserves already-normalized values', () => {
    expect(normalizePhoneToE164('+2348012345678')).toBe('+2348012345678');
  });
});
