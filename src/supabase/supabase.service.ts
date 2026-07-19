import { Injectable } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';

const TEST_SUPABASE_URL = 'http://127.0.0.1:54321';
const TEST_SUPABASE_KEY = 'test-key';
type SupabaseClientType = ReturnType<typeof createClient>;

function requiredEnv(name: string, fallback: string): string {
  const value = process.env[name];
  if (value) {
    return value;
  }

  if (process.env.NODE_ENV === 'test') {
    return fallback;
  }

  throw new Error(`${name} is required for Supabase integration`);
}

@Injectable()
export class SupabaseService {
  readonly publicClient: SupabaseClientType;
  readonly serviceRoleClient: SupabaseClientType;

  constructor() {
    const supabaseUrl = requiredEnv('SUPABASE_URL', TEST_SUPABASE_URL);
    const anonKey = requiredEnv('SUPABASE_ANON_KEY', TEST_SUPABASE_KEY);
    const serviceRoleKey = requiredEnv(
      'SUPABASE_SERVICE_ROLE_KEY',
      TEST_SUPABASE_KEY,
    );

    const authOptions = {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    };

    this.publicClient = createClient(supabaseUrl, anonKey, authOptions);
    this.serviceRoleClient = createClient(
      supabaseUrl,
      serviceRoleKey,
      authOptions,
    );
  }
}
