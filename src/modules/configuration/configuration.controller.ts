import { Controller, Get, Version } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ConfigurationService } from './configuration.service';
import { PublicRoute } from '../../common/auth/public-route.decorator';
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
          ],
          properties: {
            defaultEarnRateBps: { type: 'integer' },
            minRedemptionKobo: { type: 'integer' },
            maxRedemptionBasketPercent: { type: 'integer' },
            purchaseFlagThresholdKobo: { type: 'integer' },
            purchaseApprovalThresholdKobo: { type: 'integer' },
            redemptionApprovalThresholdKobo: { type: 'integer' },
          },
        },
      },
    },
  })
  @ApiOperation({ summary: 'Get public configuration' })
  async getPublicConfig() {
    return this.configurationService.getPublicConfig();
  }
}
