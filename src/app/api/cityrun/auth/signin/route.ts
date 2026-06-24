import { NextResponse } from "next/server";
import {
  confirmUserEmail,
  isEmailNotConfirmedError,
} from "@/lib/auth/customer-auth";
import { createRouteHandlerClient } from "@/utils/supabase/route-handler";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
    };

    const email = body.email?.trim() ?? "";
    const password = body.password ?? "";

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 },
      );
    }

    // App does not require inbox verification — confirm only if sign-in fails for that reason.
    const response = NextResponse.json({ ok: true });
    const supabase = await createRouteHandlerClient(response);
    let { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error && isEmailNotConfirmedError(error)) {
      await confirmUserEmail(email);
      const retry = await supabase.auth.signInWithPassword({ email, password });
      error = retry.error;
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sign in failed" },
      { status: 400 },
    );
  }
}
