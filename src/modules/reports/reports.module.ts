import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PrismaModule } from '../../database/prisma.module';
import { ReportExportService } from './report-export.service';
import { ReportMaterializerService } from './report-materializer.service';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [ReportsController],
  providers: [ReportMaterializerService, ReportsService, ReportExportService],
  exports: [ReportMaterializerService, ReportsService, ReportExportService],
})
export class ReportsModule {}
