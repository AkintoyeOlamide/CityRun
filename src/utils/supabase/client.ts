import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  isSupabaseConfigured,
  supabasePublishableKey,
  supabaseUrl,
} from "@/lib/public-config";

export { isSupabaseConfigured };

let browserClient: SupabaseClient | null | undefined;

export function createClient(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }

  if (browserClient === undefined) {
    try {
      browserClient = createBrowserClient(supabaseUrl, supabasePublishableKey);
    } catch {
      browserClient = null;
    }
  }

  if (!browserClient) {
    throw new Error("Could not connect to Supabase. Check your project URL and API key.");
  }

  return browserClient;
}

/** Safe for hooks — returns null instead of throwing when config or client init fails. */
export function tryCreateClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  try {
    return createClient();
  } catch {
    return null;
  }
}
