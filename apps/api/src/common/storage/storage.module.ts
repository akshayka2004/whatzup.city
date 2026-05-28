import { Module, Global } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { RedisModule } from '../redis/redis.module';
import { StorageService } from './storage.service';

@Global()
@Module({
  imports: [SupabaseModule, RedisModule],
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
