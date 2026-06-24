import { tryCreateClient } from "@/utils/supabase/client";
import { isSupabaseConfigured } from "@/lib/public-config";

export function createBrowserClient() {
  const client = tryCreateClient();
  if (!client) {
    throw new Error("Supabase is not available.");
  }
  return client;
}

export function isSupabaseBrowserConfigured() {
  return isSupabaseConfigured();
}
