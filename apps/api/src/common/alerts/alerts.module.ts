import { Global, Module } from '@nestjs/common';
import { SecurityAlertService } from './security-alert.service';

@Global()
@Module({ providers: [SecurityAlertService], exports: [SecurityAlertService] })
export class AlertsModule {}
