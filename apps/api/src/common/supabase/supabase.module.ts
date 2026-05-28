import { Module, Global } from '@nestjs/common';
import { SupabaseClientProvider } from './supabase.client';

@Global()
@Module({
  providers: [SupabaseClientProvider],
  exports: [SupabaseClientProvider],
})
export class SupabaseModule {}
