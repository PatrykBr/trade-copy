"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createClient = createClient;
// Simple Supabase client for server-side applications (without Next.js dependencies)
const supabase_js_1 = require("@supabase/supabase-js");
function createClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl) {
        throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
    }
    if (!supabaseServiceKey) {
        throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
    }
    return (0, supabase_js_1.createClient)(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
}
