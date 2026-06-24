import { NextResponse } from "next/server";
import { getRiderSession } from "@/lib/auth/rider-session";

export const runtime = "nodejs";

export async function GET() {
  const rider = await getRiderSession();
  return NextResponse.json({
    authenticated: Boolean(rider),
    rider,
  });
}
