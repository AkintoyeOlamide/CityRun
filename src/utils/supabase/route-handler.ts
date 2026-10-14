import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { supabasePublishableKey, supabaseUrl } from "@/lib/public-config";

/** Supabase client for route handlers — writes auth cookies onto the response. */
export async function createRouteHandlerClient(response: NextResponse) {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });
}
