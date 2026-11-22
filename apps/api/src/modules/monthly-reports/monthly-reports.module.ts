import { Module } from '@nestjs/common';
import { MonthlyReportsController } from './monthly-reports.controller';
import { MonthlyReportsService } from './monthly-reports.service';

@Module({
  controllers: [MonthlyReportsController],
  providers: [MonthlyReportsService],
})
export class MonthlyReportsModule {}
