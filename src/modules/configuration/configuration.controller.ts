import { Controller, Get, Req, Version } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { ConfigurationService } from './configuration.service';
import type { AuthenticatedRequest } from '../../common/auth/session.types';
import { Roles } from '../../common/auth/roles.decorator';
import { PublicRoute } from '../../common/auth/public-route.decorator';
import { Throttle } from '../../common/throttle/throttle.decorator';
import {
  apiErrorEnvelopeResponses,
  apiSuccessEnvelopeResponse,
} from '../../common/openapi-envelope';

@ApiTags('configuration')
@Controller('config')
@apiErrorEnvelopeResponses()
export class ConfigurationController {
  constructor(private readonly configurationService: ConfigurationService) {}

  @Get('public')
  @PublicRoute()
  @Throttle({
    bucket: 'config.public',
    limit: 30,
    windowMs: 60 * 1000,
  })
  @Version('1')
  @apiSuccessEnvelopeResponse({
    description: 'Frontend-safe branch and policy config',
    dataSchema: {
      type: 'object',
      required: ['tenant', 'branch', 'policies'],
      properties: {
        tenant: {
          type: 'object',
          required: ['id', 'name'],
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
          },
        },
        branch: {
          type: 'object',
          required: ['id', 'name', 'timezone', 'receiptWeekStartDay'],
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            timezone: { type: 'string' },
            receiptWeekStartDay: { type: 'integer' },
          },
        },
        policies: {
          type: 'object',
          required: [
            'defaultEarnRateBps',
            'minRedemptionKobo',
            'maxRedemptionBasketPercent',
            'purchaseFlagThresholdKobo',
            'purchaseApprovalThresholdKobo',
            'redemptionApprovalThresholdKobo',
            'offlineRedemptionDisabled',
          ],
          properties: {
            defaultEarnRateBps: { type: 'integer' },
            minRedemptionKobo: { type: 'integer' },
            maxRedemptionBasketPercent: { type: 'integer' },
            purchaseFlagThresholdKobo: { type: 'integer' },
            purchaseApprovalThresholdKobo: { type: 'integer' },
            redemptionApprovalThresholdKobo: { type: 'integer' },
            offlineRedemptionDisabled: { type: 'boolean' },
          },
        },
      },
    },
  })
  @ApiOperation({ summary: 'Get public configuration' })
  async getPublicConfig() {
    return this.configurationService.getPublicConfig();
  }

  @Get('operational')
  @Version('1')
  @Roles(UserRole.CASHIER, UserRole.SUPERVISOR, UserRole.ADMIN)
  @apiSuccessEnvelopeResponse({
    description: 'Session-branch-scoped operational config',
    dataSchema: { type: 'object' },
  })
  @ApiOperation({ summary: 'Get authenticated operational configuration' })
  async getOperationalConfig(@Req() request: AuthenticatedRequest) {
    const authContext = request.authContext!;
    const branchId = authContext.user.branchId;
    if (!branchId) {
      throw new Error('Authenticated branch context is required');
    }

    return this.configurationService.getOperationalConfig(
      authContext.user.tenantId,
      branchId,
    );
  }
}
