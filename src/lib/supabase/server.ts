import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabasePublishableKey, supabaseUrl } from "@/lib/public-config";

function readServiceRoleKey() {
  const candidates = [
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    process.env.SUPABASE_SECRET_KEY,
  ];

  for (const raw of candidates) {
    const key = raw?.trim();
    if (!key) continue;
    if (key.startsWith("eyJ") || key.startsWith("sb_secret_")) {
      return key;
    }
  }

  return null;
}

function pickServerKey() {
  return readServiceRoleKey() ?? supabasePublishableKey;
}

export function hasServiceRoleKey() {
  return Boolean(readServiceRoleKey());
}

/** Admin cross-user DB/auth operations require the service role key. */
export function assertServiceRoleConfigured(): void {
  if (!hasServiceRoleKey()) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not configured. Add it in your server environment (e.g. Vercel).",
    );
  }
}

/** Public auth client — safe for sign-up and password sign-in. */
export function createPublicAuthClient() {
  return createClient(supabaseUrl, supabasePublishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Server-side client for API routes (orders, riders, etc.) */
export function createAdminClient() {
  return createClient(supabaseUrl, pickServerKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type { SupabaseClient };

export function isSupabaseConfigured() {
  return Boolean(supabaseUrl && supabasePublishableKey);
}
