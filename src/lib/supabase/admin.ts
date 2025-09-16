// src/lib/supabase/admin.ts
import { createClient } from '@supabase/supabase-js';

// Validate environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error('[supabase-admin] SUPABASE_URL is not set. Required for Supabase client initialization.');
}

if (!supabaseServiceKey) {
  throw new Error('[supabase-admin] SUPABASE_SERVICE_ROLE_KEY is not set. Webhook/database background tasks will fail RLS.');
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export type SupabaseAdminClient = typeof supabaseAdmin;