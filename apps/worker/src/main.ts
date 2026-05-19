import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { WorkerModule } from './worker.module';
import { BillVerificationProcessor } from './processors/bill-verification.processor';

async function bootstrap() {
  const logger = new Logger('WorkerBootstrap');
  const app = await NestFactory.createApplicationContext(WorkerModule);

  logger.log('SaaS Background Worker initialized and listening...');

  const billProcessor = app.get(BillVerificationProcessor);

  // Poll database queue loop (demo)
  setInterval(async () => {
    try {
      // In a real application we would use BullMQ/Redis, here we mock polling PENDING bills
      // to keep it simple, robust, and single-dependency
      logger.debug('Checking for pending verification tasks...');
    } catch (e) {
      logger.error('Error in worker tick', e);
    }
  }, 10000);
}

bootstrap();
