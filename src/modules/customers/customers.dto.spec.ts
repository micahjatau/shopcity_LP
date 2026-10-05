import { validate } from 'class-validator';
import { CreateCustomerDto } from './customers.dto';

describe('CreateCustomerDto consent contract', () => {
  it('requires explicit loyalty and marketing choices', async () => {
    const dto = Object.assign(new CreateCustomerDto(), {
      fullName: 'Ada Customer',
      phone: '+2348012345678',
      cardSerialNumber: 'CARD-001',
    });
    const errors = await validate(dto);
    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['loyaltyConsent', 'marketingOptIn']),
    );
  });

  it('accepts explicit affirmative loyalty consent and declined marketing', async () => {
    const dto = Object.assign(new CreateCustomerDto(), {
      fullName: 'Ada Customer',
      phone: '+2348012345678',
      cardSerialNumber: 'CARD-001',
      loyaltyConsent: true,
      marketingOptIn: false,
    });
    await expect(validate(dto)).resolves.toHaveLength(0);
  });
});
