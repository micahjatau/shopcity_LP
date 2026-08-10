import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { ReportMaterializerService } from './report-materializer.service';

@Module({
  imports: [PrismaModule],
  providers: [ReportMaterializerService],
  exports: [ReportMaterializerService],
})
export class ReportsModule {}
