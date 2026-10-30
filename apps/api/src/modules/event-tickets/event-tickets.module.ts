import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { CrewGuard } from './crew.guard';
import { EventAnalyticsService } from './event-analytics.service';
import { EventCrewService } from './event-crew.service';
import { EventPaymentsService } from './event-payments.service';
import { EventScanService } from './event-scan.service';
import { EventTicketsController } from './event-tickets.controller';
import { EventTicketsService } from './event-tickets.service';
import { ScanController } from './scan.controller';
import { TicketsController } from './tickets.controller';

@Module({
  imports: [AuditModule, NotificationsModule],
  controllers: [EventTicketsController, TicketsController, ScanController],
  providers: [
    EventTicketsService,
    EventPaymentsService,
    EventCrewService,
    EventScanService,
    EventAnalyticsService,
    CrewGuard,
  ],
  exports: [EventTicketsService],
})
export class EventTicketsModule {}
