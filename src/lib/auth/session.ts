import { createClient } from "@/utils/supabase/server";

/** Read auth user from the session cookie — faster than getUser() for own-data routes. */
export async function getAuthUser() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user ?? null;
}
