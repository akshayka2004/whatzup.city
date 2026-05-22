import { Module } from '@nestjs/common';
import { GovernmentAlertsController } from './government-alerts.controller';
import { GovernmentAlertsService } from './government-alerts.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuditModule } from '../audit/audit.module';
import { RedisModule } from '../../common/redis/redis.module';

@Module({
  imports: [NotificationsModule, AuditModule, RedisModule],
  controllers: [GovernmentAlertsController],
  providers: [GovernmentAlertsService],
})
export class GovernmentAlertsModule {}
