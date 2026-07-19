import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';

@Controller()
@ApiTags('system')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Check API status' })
  @ApiOkResponse({
    schema: { type: 'string', example: 'ShopCity backend foundation is ready' },
  })
  getHello(): string {
    return this.appService.getHello();
  }
}
