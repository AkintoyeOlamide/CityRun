import { NextResponse } from "next/server";
import { getAdminUsername } from "@/lib/auth/admin-credentials";
import { isAdminSessionActive } from "@/lib/auth/admin-session";

export const runtime = "nodejs";

export async function GET() {
  const authenticated = await isAdminSessionActive();
  return NextResponse.json({
    authenticated,
    username: authenticated ? getAdminUsername() : null,
  });
}
