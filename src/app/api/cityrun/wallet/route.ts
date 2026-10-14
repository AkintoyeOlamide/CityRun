import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getWalletOverview } from "@/lib/city-run/wallets-store";
import { hasServiceRoleKey } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user ?? null;

    if (!user) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    }

    if (!hasServiceRoleKey()) {
      return NextResponse.json(
        { error: "Wallet service is not configured on the server." },
        { status: 503 },
      );
    }

    const overview = await getWalletOverview(user.id);
    return NextResponse.json(overview);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load wallet" },
      { status: 500 },
    );
  }
}
