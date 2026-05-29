import { Provider, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const SUPABASE_CLIENT = 'SUPABASE_CLIENT';

const logger = new Logger('SupabaseClientProvider');

export const SupabaseClientProvider: Provider = {
  provide: SUPABASE_CLIENT,
  useFactory: (config: ConfigService): SupabaseClient | null => {
    const supabaseUrl = config.get<string>('SUPABASE_URL');
    const serviceRoleKey = config.get<string>('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      logger.warn(
        'SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not configured — storage features disabled. ' +
        'Set both env vars to enable file uploads.',
      );
      // Return null — StorageService throws ServiceUnavailableException when called without a client.
      return null as unknown as SupabaseClient;
    }

    return createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  },
  inject: [ConfigService],
};
