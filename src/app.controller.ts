import { Controller, Get, Version } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';

@Controller()
@ApiTags('system')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Version('1')
  @ApiOperation({
    summary: 'Check API status',
    description: 'Returns the foundation status for the versioned API root.',
  })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'string',
          example: 'ShopCity backend foundation is ready',
        },
        meta: {
          type: 'object',
          properties: {
            timestamp: { type: 'string', example: '2026-07-19T00:00:00.000Z' },
            path: { type: 'string', example: '/api/v1' },
          },
        },
      },
    },
  })
  getHello(): string {
    return this.appService.getHello();
  }
}
