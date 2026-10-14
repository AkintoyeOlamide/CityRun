import { NextResponse } from "next/server";
import { resolveSiteOrigin } from "@/lib/auth/site-origin";
import { createPublicAuthClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string };
    const email = body.email?.trim().toLowerCase() ?? "";

    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    const origin = resolveSiteOrigin(request);
    const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent("/cityrun/reset-password")}`;

    const supabase = createPublicAuthClient();
    await supabase.auth.resetPasswordForEmail(email, { redirectTo });

    return NextResponse.json({
      ok: true,
      message:
        "If an account exists for that email, we sent a link to reset your password. Check your inbox.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not send reset email. Try again shortly.",
      },
      { status: 500 },
    );
  }
}
