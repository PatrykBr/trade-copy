import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

// Standalone Supabase client for trade bridge service
// Uses service role key for full access without authentication context
export function createTradeClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables for trade bridge');
  }

  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}