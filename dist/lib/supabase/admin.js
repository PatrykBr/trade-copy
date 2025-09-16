"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabaseAdmin = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    // eslint-disable-next-line no-console
    console.warn('[supabase-admin] SUPABASE_SERVICE_ROLE_KEY is not set. Webhook/database background tasks will fail RLS.');
}
exports.supabaseAdmin = (0, supabase_js_1.createClient)(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || 'missing-service-role-key', {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});
