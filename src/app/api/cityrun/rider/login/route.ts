import { NextResponse } from "next/server";
import { riderSessionCookieOptions } from "@/lib/auth/rider-session";
import { toPublicRider, verifyRiderLogin } from "@/lib/city-run/riders-store";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Rider login requires Supabase. Check your Supabase URL and keys." },
        { status: 503 },
      );
    }

    const body = (await request.json()) as {
      username?: string;
      password?: string;
    };

    const rider = await verifyRiderLogin(
      body.username ?? "",
      body.password ?? "",
    );

    if (!rider) {
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 },
      );
    }

    const response = NextResponse.json({
      ok: true,
      rider: toPublicRider(rider),
    });
    const cookie = riderSessionCookieOptions(rider.id);
    response.cookies.set(cookie.name, cookie.value, {
      httpOnly: cookie.httpOnly,
      secure: cookie.secure,
      sameSite: cookie.sameSite,
      path: cookie.path,
      maxAge: cookie.maxAge,
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Login failed" },
      { status: 500 },
    );
  }
}
