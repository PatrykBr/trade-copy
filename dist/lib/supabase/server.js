"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createClient = createClient;
// src/lib/supabase/server.ts
const ssr_1 = require("@supabase/ssr");
const headers_1 = require("next/headers");
async function createClient() {
    const cookieStore = await (0, headers_1.cookies)();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl) {
        throw new Error('[supabase-server] NEXT_PUBLIC_SUPABASE_URL is not set');
    }
    if (!supabaseAnonKey) {
        throw new Error('[supabase-server] NEXT_PUBLIC_SUPABASE_ANON_KEY is not set');
    }
    return (0, ssr_1.createServerClient)(supabaseUrl, supabaseAnonKey, {
        cookies: {
            getAll() {
                return cookieStore.getAll();
            },
            setAll(cookiesToSet) {
                try {
                    cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
                }
                catch {
                    // The `setAll` method was called from a Server Component.
                    // This can be ignored if you have middleware refreshing
                    // user sessions.
                }
            },
        },
    });
}
