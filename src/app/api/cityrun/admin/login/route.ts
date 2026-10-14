import { NextResponse } from "next/server";
import {
  adminSessionCookieOptions,
  verifyAdminCredentials,
} from "@/lib/auth/admin-session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      username?: string;
      password?: string;
    };

    const username = body.username?.trim() ?? "";
    const password = body.password ?? "";

    if (!verifyAdminCredentials(username, password)) {
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 },
      );
    }

    const response = NextResponse.json({ ok: true, username });
    const cookie = adminSessionCookieOptions();
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
