import { NextResponse } from "next/server";
import { riderSessionCookieOptions } from "@/lib/auth/rider-session";
import { toPublicRider, verifyRiderLogin } from "@/lib/city-run/riders-store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
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
  } catch {
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
