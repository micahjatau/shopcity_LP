import { BadRequestException } from '@nestjs/common';
import { CardsController } from './cards.controller';
import { CardsService } from './cards.service';
import type { AuthenticatedRequest } from '../../common/auth/session.types';

describe('CardsController issued-card directory', () => {
  const request = {
    authContext: { user: { tenantId: 'authenticated-tenant' } },
  } as unknown as AuthenticatedRequest;
  const listIssuedManagementCards = jest.fn().mockResolvedValue({
    items: [],
    nextCursor: null,
    hasMore: false,
  });
  const service = { listIssuedManagementCards } as unknown as CardsService;
  const controller = new CardsController(service);

  beforeEach(() => jest.clearAllMocks());

  it('uses the authenticated tenant and bounded default page size', async () => {
    await controller.listIssuedManagementCards(request, {});

    expect(listIssuedManagementCards).toHaveBeenCalledWith(
      'authenticated-tenant',
      { limit: 25, cursor: undefined },
      {
        search: undefined,
        status: undefined,
        issuedFrom: undefined,
        issuedTo: undefined,
      },
    );
  });

  it('caps requested page size and forwards the cursor', async () => {
    await controller.listIssuedManagementCards(request, {
      limit: '1000',
      cursor: 'opaque-cursor',
    });

    expect(listIssuedManagementCards).toHaveBeenCalledWith(
      'authenticated-tenant',
      { limit: 100, cursor: 'opaque-cursor' },
      {
        search: undefined,
        status: undefined,
        issuedFrom: undefined,
        issuedTo: undefined,
      },
    );
  });

  it('rejects invalid page limits', () => {
    expect(() =>
      controller.listIssuedManagementCards(request, { limit: '0' }),
    ).toThrow(BadRequestException);
  });

  it('forwards issued-card filters to the service', async () => {
    await controller.listIssuedManagementCards(request, {
      q: 'CARD-42',
      status: 'REPLACED',
      issuedFrom: '2025-01-01',
      issuedTo: '2025-01-31',
    });

    expect(listIssuedManagementCards).toHaveBeenCalledWith(
      'authenticated-tenant',
      { limit: 25, cursor: undefined },
      {
        search: 'CARD-42',
        status: 'REPLACED',
        issuedFrom: '2025-01-01',
        issuedTo: '2025-01-31',
      },
    );
  });
});
