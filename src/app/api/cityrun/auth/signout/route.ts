import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/utils/supabase/route-handler";

export const runtime = "nodejs";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  try {
    const supabase = await createRouteHandlerClient(response);
    await supabase.auth.signOut();
  } catch {
    /* still clear cookies on the client */
  }
  return response;
}
