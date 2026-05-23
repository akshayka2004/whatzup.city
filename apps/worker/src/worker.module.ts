import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './common/database/database.module';
import { BillVerificationProcessor } from './processors/bill-verification.processor';
import { NotificationProcessor } from './processors/notification.processor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env', '../../.env.local', '../../.env'],
    }),
    DatabaseModule,
  ],
  providers: [BillVerificationProcessor, NotificationProcessor],
})
export class WorkerModule {}
