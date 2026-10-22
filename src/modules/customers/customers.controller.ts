import {
  Body,
  Controller,
  Headers,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Version,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import type { AuthenticatedRequest } from '../../common/auth/session.types';
import { Roles } from '../../common/auth/roles.decorator';
import { CustomersService } from './customers.service';
import {
  CreateCustomerDto,
  UpdateCustomerDto,
  UpdateCustomerStatusDto,
  WithdrawCustomerMarketingPreferenceDto,
} from './customers.dto';
import {
  apiErrorEnvelopeResponses,
  apiSuccessEnvelopeResponse,
} from '../../common/openapi-envelope';
import { parseCursorPageRequest } from '../../common/pagination/cursor-pagination';

@ApiTags('customers')
@ApiBearerAuth()
@Controller('customers')
@apiErrorEnvelopeResponses()
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @Version('1')
  @Roles(UserRole.CASHIER, UserRole.SUPERVISOR, UserRole.ADMIN)
  @apiSuccessEnvelopeResponse({
    dataSchema: {
      type: 'object',
      required: ['items', 'nextCursor', 'hasMore'],
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: true,
            properties: {
              cardNumber: {
                type: 'string',
                nullable: true,
                description:
                  'Assigned card number, serial, or barcode; these refer to the same value.',
              },
              activeCardSerialNumber: {
                type: 'string',
                nullable: true,
                description: 'Compatibility alias for cardNumber.',
              },
              email: {
                type: 'string',
                nullable: true,
                description: 'Masked email for cashier-safe customer display.',
              },
              birthdayMonth: { type: 'string', nullable: true },
              availableBalanceKobo: { type: 'integer' },
              lastPurchaseAmountKobo: {
                type: 'integer',
                nullable: true,
                description:
                  'Full basket total in integer kobo from the latest captured and approved receipt.',
              },
              lifetimeEarnedKobo: { type: 'integer', nullable: true },
            },
          },
        },
        nextCursor: { type: 'string', nullable: true },
        hasMore: { type: 'boolean' },
      },
    },
  })
  listCustomers(
    @Req() request: AuthenticatedRequest,
    @Query('q') query?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.customersService.listCustomers(
      request.authContext!.user.tenantId,
      request.authContext!,
      query,
      parseCursorPageRequest(limit, cursor),
    );
  }

  @Post()
  @Version('1')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  @apiSuccessEnvelopeResponse({ description: 'Customer created', status: 201 })
  @ApiOperation({ summary: 'Register customer' })
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  createCustomer(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateCustomerDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
  ) {
    return this.customersService.createCustomer(
      request.authContext!.user.tenantId,
      request.authContext!,
      dto,
      idempotencyKey,
    );
  }

  @Get(':id/profile-projection')
  @Version('1')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Read the authenticated customer profile projection',
  })
  @apiSuccessEnvelopeResponse({
    dataSchema: {
      type: 'object',
      required: [
        'customerId',
        'sourceErrors',
        'memberSince',
        'pendingApprovalsCount',
        'lifetimeEarnedKobo',
        'expirySchedule',
        'recentActivity',
        'transactions',
        'redemptions',
        'walletLedger',
        'approvals',
        'consent',
        'marketingPreference',
        'card',
      ],
      properties: {
        customerId: { type: 'string' },
        sourceErrors: {
          type: 'array',
          items: {
            type: 'string',
            enum: [
              'card',
              'consent',
              'lifetimeEarned',
              'pendingApprovals',
              'expirySchedule',
              'walletLedger',
              'transactions',
              'redemptions',
              'approvals',
              'statusEvents',
              'marketingPreference',
            ],
          },
        },
        memberSince: { type: 'string', format: 'date-time' },
        pendingApprovalsCount: { type: 'integer', nullable: true },
        lifetimeEarnedKobo: { type: 'integer', nullable: true },
        expirySchedule: {
          type: 'array',
          description:
            'At most the next 12 future credit lots with positive remaining integer-kobo balances.',
          items: {
            type: 'object',
            required: ['expiresAt', 'remainingAmountKobo'],
            properties: {
              expiresAt: { type: 'string', format: 'date-time' },
              remainingAmountKobo: { type: 'integer' },
            },
          },
        },
        expiryScheduleIsUpcomingWindow: {
          type: 'boolean',
          description:
            'True when expirySchedule is a bounded upcoming window, not a complete all-time list.',
        },
        expiryScheduleLimit: { type: 'integer' },
        recentActivity: {
          type: 'array',
          items: {
            type: 'object',
            required: ['id', 'type', 'status', 'occurredAt', 'amountKobo'],
            properties: {
              id: { type: 'string' },
              type: {
                type: 'string',
                enum: [
                  'EARNING',
                  'REDEMPTION',
                  'WALLET_ADJUSTMENT',
                  'APPROVAL_REQUEST',
                  'APPROVAL_OUTCOME',
                  'APPROVAL_EXPIRED',
                  'CUSTOMER_STATUS',
                  'CARD_STATUS',
                  'CARD_ISSUED',
                ],
              },
              targetType: { type: 'string', enum: ['EARN', 'REDEEM'] },
              status: { type: 'string' },
              occurredAt: { type: 'string', format: 'date-time' },
              amountKobo: { type: 'integer', nullable: true },
            },
          },
        },
        transactions: {
          type: 'array',
          items: {
            type: 'object',
            required: [
              'id',
              'occurredAt',
              'purchaseAmountKobo',
              'captureStatus',
              'reviewStatus',
              'operation',
              'status',
              'loyaltyAmountKobo',
              'redeemedAmountKobo',
              'earnedAmountKobo',
            ],
            properties: {
              id: { type: 'string' },
              occurredAt: { type: 'string', format: 'date-time' },
              purchaseAmountKobo: { type: 'integer', nullable: true },
              captureStatus: { type: 'string' },
              reviewStatus: { type: 'string' },
              operation: { type: 'string', enum: ['EARN', 'REDEEM'] },
              status: { type: 'string' },
              loyaltyAmountKobo: { type: 'integer', nullable: true },
              redeemedAmountKobo: { type: 'integer', nullable: true },
              earnedAmountKobo: { type: 'integer', nullable: true },
            },
          },
        },
        redemptions: {
          type: 'array',
          items: {
            type: 'object',
            required: [
              'id',
              'occurredAt',
              'requestedAmountKobo',
              'confirmedAmountKobo',
              'status',
            ],
            properties: {
              id: { type: 'string' },
              occurredAt: { type: 'string', format: 'date-time' },
              requestedAmountKobo: { type: 'integer', nullable: true },
              confirmedAmountKobo: { type: 'integer', nullable: true },
              status: { type: 'string' },
            },
          },
        },
        walletLedger: {
          type: 'array',
          items: {
            type: 'object',
            required: [
              'id',
              'type',
              'direction',
              'amountKobo',
              'status',
              'effectiveAt',
            ],
            properties: {
              id: { type: 'string' },
              type: { type: 'string' },
              direction: { type: 'string' },
              amountKobo: { type: 'integer', nullable: true },
              status: { type: 'string' },
              effectiveAt: { type: 'string', format: 'date-time' },
            },
          },
        },
        approvals: {
          type: 'array',
          items: {
            type: 'object',
            required: [
              'id',
              'targetType',
              'status',
              'requestedAt',
              'decidedAt',
            ],
            properties: {
              id: { type: 'string' },
              targetType: { type: 'string' },
              status: { type: 'string' },
              requestedAt: { type: 'string', format: 'date-time' },
              decidedAt: {
                type: 'string',
                format: 'date-time',
                nullable: true,
              },
            },
          },
        },
        consent: {
          type: 'object',
          nullable: true,
          required: [
            'loyaltyConsent',
            'marketingOptIn',
            'consentVersion',
            'privacyNoticeVersion',
            'capturedAt',
          ],
          properties: {
            loyaltyConsent: { type: 'boolean' },
            marketingOptIn: { type: 'boolean' },
            consentVersion: { type: 'string' },
            privacyNoticeVersion: { type: 'string' },
            capturedAt: { type: 'string', format: 'date-time' },
          },
        },
        marketingPreference: {
          type: 'object',
          required: ['status', 'source', 'updatedAt'],
          properties: {
            status: {
              type: 'string',
              enum: ['OPTED_IN', 'OPTED_OUT', 'NOT_OPTED_IN', 'UNAVAILABLE'],
            },
            source: {
              type: 'string',
              nullable: true,
              enum: ['IN_STORE', 'REGISTRATION', 'NOT_RECORDED'],
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              nullable: true,
            },
          },
        },
        card: {
          type: 'object',
          nullable: true,
          required: ['identifier', 'status', 'issuedAt', 'blockedAt'],
          properties: {
            identifier: { type: 'string' },
            status: { type: 'string' },
            issuedAt: { type: 'string', format: 'date-time' },
            blockedAt: { type: 'string', format: 'date-time', nullable: true },
          },
        },
      },
    },
  })
  getCustomerProfileProjection(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.customersService.getCustomerProfileProjection(
      request.authContext!.user.tenantId,
      id,
      request.authContext!,
    );
  }

  @Get(':id/marketing-preference')
  @Version('1')
  @Roles(UserRole.CASHIER, UserRole.SUPERVISOR, UserRole.ADMIN)
  @ApiOperation({ summary: 'Read a customer marketing preference' })
  @apiSuccessEnvelopeResponse({
    dataSchema: {
      type: 'object',
      required: ['status', 'source', 'updatedAt'],
      properties: {
        status: {
          type: 'string',
          enum: ['OPTED_IN', 'OPTED_OUT', 'NOT_OPTED_IN', 'UNAVAILABLE'],
        },
        source: {
          type: 'string',
          nullable: true,
          enum: ['IN_STORE', 'REGISTRATION', 'NOT_RECORDED'],
        },
        updatedAt: { type: 'string', format: 'date-time', nullable: true },
      },
    },
  })
  getMarketingPreference(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.customersService.getCustomerMarketingPreference(
      request.authContext!.user.tenantId,
      id,
      request.authContext!,
    );
  }

  @Post(':id/marketing-preference/withdrawal')
  @Version('1')
  @Roles(UserRole.CASHIER, UserRole.SUPERVISOR, UserRole.ADMIN)
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiOperation({
    summary: 'Record an in-store marketing preference withdrawal',
  })
  @apiSuccessEnvelopeResponse({
    description: 'Marketing preference is opted out',
    status: 201,
    dataSchema: {
      type: 'object',
      required: ['status', 'source', 'updatedAt', 'alreadyOptedOut'],
      properties: {
        status: { type: 'string', enum: ['OPTED_OUT'] },
        source: { type: 'string', enum: ['IN_STORE'] },
        updatedAt: { type: 'string', format: 'date-time' },
        alreadyOptedOut: { type: 'boolean' },
      },
    },
  })
  withdrawMarketingPreference(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: WithdrawCustomerMarketingPreferenceDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
  ) {
    return this.customersService.withdrawCustomerMarketingPreference(
      request.authContext!.user.tenantId,
      request.authContext!,
      id,
      dto.confirmedInPersonRequest,
      idempotencyKey,
    );
  }

  @Get(':id')
  @Version('1')
  @Roles(UserRole.CASHIER, UserRole.SUPERVISOR, UserRole.ADMIN)
  @apiSuccessEnvelopeResponse({
    dataSchema: {
      type: 'object',
      properties: {
        customerId: { type: 'string', format: 'uuid' },
        fullName: { type: 'string' },
        maskedPhone: { type: 'string' },
        email: { type: 'string', nullable: true },
        birthdayMonth: { type: 'string', nullable: true },
        cardNumber: { type: 'string', nullable: true },
        cardStatus: { type: 'string' },
        availableBalanceKobo: { type: 'integer' },
      },
    },
  })
  getCustomer(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.customersService.getCustomer(
      request.authContext!.user.tenantId,
      id,
      request.authContext!,
    );
  }

  @Patch(':id')
  @Version('1')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  @apiSuccessEnvelopeResponse({ dataSchema: { type: 'object' } })
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  updateCustomer(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
  ) {
    return this.customersService.updateCustomer(
      request.authContext!.user.tenantId,
      request.authContext!,
      id,
      dto,
      idempotencyKey,
    );
  }

  @Patch(':id/status')
  @Version('1')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  @apiSuccessEnvelopeResponse({ dataSchema: { type: 'object' } })
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  updateStatus(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateCustomerStatusDto,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
  ) {
    return this.customersService.updateCustomerStatus(
      request.authContext!.user.tenantId,
      request.authContext!,
      id,
      dto.status,
      idempotencyKey,
    );
  }
}
