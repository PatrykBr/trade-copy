import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

// Standalone Supabase client for trade bridge service
// Uses service role key for full access without authentication context
export function createTradeClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl) {
    throw new Error('Missing SUPABASE_URL environment variable for trade bridge');
  }

  if (!supabaseServiceKey) {
    throw new Error('Missing SUPABASE_SERVICE_KEY environment variable for trade bridge');
  }

  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}