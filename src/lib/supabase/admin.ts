// src/lib/supabase/admin.ts
import { createClient } from '@supabase/supabase-js';

// Validate environment variables - use public URL as fallback
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  console.warn('[supabase-admin] SUPABASE_URL is not set. Admin operations may fail.');
}

if (!supabaseServiceKey) {
  console.warn('[supabase-admin] SUPABASE_SERVICE_ROLE_KEY is not set. Webhook/database background tasks will fail RLS.');
}

// Only create client if we have both values
export const supabaseAdmin = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

export type SupabaseAdminClient = typeof supabaseAdmin;