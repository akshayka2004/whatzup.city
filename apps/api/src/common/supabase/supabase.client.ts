import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const SUPABASE_CLIENT = 'SUPABASE_CLIENT';

export const SupabaseClientProvider: Provider = {
  provide: SUPABASE_CLIENT,
  useFactory: (config: ConfigService): SupabaseClient => {
    const supabaseUrl = config.get<string>('SUPABASE_URL');
    const serviceRoleKey = config.get<string>('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error(
        'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured in environment variables.',
      );
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
