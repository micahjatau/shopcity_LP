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
  })
  @ApiOperation({ summary: 'Get public configuration' })
  getPublicConfig() {
    return this.configurationService.getPublicConfig();
  }
}
