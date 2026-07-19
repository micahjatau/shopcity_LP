import { Controller, Get, Version } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';
import { PublicRoute } from './common/auth/public-route.decorator';
import {
  apiErrorEnvelopeResponses,
  apiSuccessEnvelopeResponse,
} from './common/openapi-envelope';

@Controller()
@ApiTags('system')
@apiErrorEnvelopeResponses()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Version('1')
  @PublicRoute()
  @apiSuccessEnvelopeResponse({
    description: 'Returns the foundation status for the versioned API root.',
    dataSchema: {
      type: 'string',
      example: 'ShopCity backend foundation is ready',
    },
  })
  @ApiOperation({
    summary: 'Check API status',
    description: 'Returns the foundation status for the versioned API root.',
  })
  getHello(): string {
    return this.appService.getHello();
  }
}
