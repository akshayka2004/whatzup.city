import { Module } from '@nestjs/common';
import { CivicController } from './civic.controller';
import { CivicService } from './civic.service';
import { PasswordService } from '../auth/password.service';
import { RedisModule } from '../../common/redis/redis.module';

@Module({
  imports: [RedisModule],
  controllers: [CivicController],
  providers: [CivicService, PasswordService],
})
export class CivicModule {}
