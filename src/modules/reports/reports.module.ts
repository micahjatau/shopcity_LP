import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { ReportMaterializerService } from './report-materializer.service';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [PrismaModule],
  controllers: [ReportsController],
  providers: [ReportMaterializerService, ReportsService],
  exports: [ReportMaterializerService, ReportsService],
})
export class ReportsModule {}
