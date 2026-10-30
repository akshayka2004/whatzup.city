import { Module } from '@nestjs/common';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { AuditModule } from '../audit/audit.module';
import { EventTicketsModule } from '../event-tickets/event-tickets.module';

@Module({
  imports: [AuditModule, EventTicketsModule],
  controllers: [EventsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
