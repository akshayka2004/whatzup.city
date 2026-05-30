import { resolve } from 'path';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './common/database/database.module';
import { BillVerificationProcessor } from './processors/bill-verification.processor';
import { NotificationProcessor } from './processors/notification.processor';

// Absolute env paths — pm2 fork cwd is unreliable, so cwd-relative envFilePath
// (e.g. '../../.env') fails to resolve the repo-root .env. __dirname is stable:
// at runtime this file lives in apps/worker/dist, so repo root = ../../.. .
const ENV_PATHS = [
  resolve(process.cwd(), '.env.local'),
  resolve(process.cwd(), '.env'),
  resolve(__dirname, '../.env'), // apps/worker/.env (sibling of dist)
  resolve(__dirname, '../../.env'), // apps/worker/.env (from dist/)
  resolve(__dirname, '../../../.env'), // repo root from apps/worker/dist
  resolve(__dirname, '../../../../.env'), // repo root if dist nested deeper
];

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ENV_PATHS,
    }),
    DatabaseModule,
  ],
  providers: [BillVerificationProcessor, NotificationProcessor],
})
export class WorkerModule {}
