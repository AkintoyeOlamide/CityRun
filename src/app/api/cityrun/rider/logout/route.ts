import { NextResponse } from "next/server";
import { RiderAuthError, clearRiderSessionCookieOptions, requireRider } from "@/lib/auth/rider-session";
import { clearRiderLiveLocation } from "@/lib/city-run/riders-store";

export const runtime = "nodejs";

export async function POST() {
  try {
    const rider = await requireRider();
    await clearRiderLiveLocation(rider.id);
  } catch (error) {
    if (!(error instanceof RiderAuthError)) {
      /* proceed with logout */
    }
  }

  const response = NextResponse.json({ ok: true });
  const cookie = clearRiderSessionCookieOptions();
  response.cookies.set(cookie.name, cookie.value, {
    httpOnly: cookie.httpOnly,
    secure: cookie.secure,
    sameSite: cookie.sameSite,
    path: cookie.path,
    maxAge: cookie.maxAge,
  });
  return response;
}
