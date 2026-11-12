import { validateSync } from 'class-validator';
import { UserRole } from '@prisma/client';
import { CreateUserDto } from './users.dto';

describe('CreateUserDto staff profile validation', () => {
  function validPayload(): CreateUserDto {
    return Object.assign(new CreateUserDto(), {
      username: 'staff@example.test',
      firstName: 'Ada',
      lastName: 'Lovelace',
      phoneNumber: '+234 801 234 5678',
      password: 'a valid passphrase',
      role: UserRole.CASHIER,
      branchId: 'a2bdc5df-5854-4ab1-88c3-0ca661787e9b',
    });
  }

  it('accepts the required contact fields and an assignable staff role', () => {
    expect(validateSync(validPayload())).toHaveLength(0);
  });

  it('rejects the internal SYSTEM role', () => {
    const payload = validPayload();
    payload.role = UserRole.SYSTEM;

    expect(
      validateSync(payload).some((error) => error.property === 'role'),
    ).toBe(true);
  });

  it('rejects blank names and malformed phone numbers', () => {
    const payload = validPayload();
    payload.firstName = '   ';
    payload.phoneNumber = 'not a phone';

    const errors = validateSync(payload).map((error) => error.property);
    expect(errors).toContain('firstName');
    expect(errors).toContain('phoneNumber');
  });
});
