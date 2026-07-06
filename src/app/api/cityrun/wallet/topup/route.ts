import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/server";
import {
  initializePaystackTransaction,
  isPaystackConfigured,
} from "@/lib/city-run/paystack";
import { parseNairaToKobo } from "@/lib/city-run/pricing";
import { ensureWallet } from "@/lib/city-run/wallets-store";

export const runtime = "nodejs";

const MIN_TOPUP_KOBO = 500_00;

function appOrigin(request: Request) {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    new URL(request.url).origin
  );
}

export async function POST(request: Request) {
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
        { error: "Wallet top-up is not available yet. Contact City Run support." },
        { status: 503 },
      );
    }

    if (!isPaystackConfigured()) {
      return NextResponse.json(
        {
          error:
            "Online wallet top-up is being set up. Contact City Run support to fund your wallet.",
          mode: "manual",
        },
        { status: 503 },
      );
    }

    const body = (await request.json()) as { amountNaira?: number };
    const amountNaira = Number(body.amountNaira);
    if (!Number.isFinite(amountNaira) || amountNaira <= 0) {
      return NextResponse.json({ error: "Enter a valid amount." }, { status: 400 });
    }

    const amountKobo = parseNairaToKobo(amountNaira);
    if (amountKobo < MIN_TOPUP_KOBO) {
      return NextResponse.json(
        { error: "Minimum top-up is ₦500." },
        { status: 400 },
      );
    }

    await ensureWallet(user.id);

    const reference = `cr_${user.id.replace(/-/g, "").slice(0, 12)}_${Date.now()}`;
    const admin = createAdminClient();

    const { error: intentError } = await admin.from("wallet_topup_intents").insert({
      user_id: user.id,
      amount_kobo: amountKobo,
      reference,
      status: "pending",
    });

    if (intentError) {
      if (intentError.message.includes("wallet_topup_intents")) {
        return NextResponse.json(
          {
            error:
              "Wallet top-up table is missing. Run supabase/migrations/add_wallet_paystack_topups.sql in Supabase.",
          },
          { status: 503 },
        );
      }
      throw new Error(intentError.message);
    }

    const email = user.email ?? "customer@citygateshl.org";
    const authorizationUrl = await initializePaystackTransaction({
      email,
      amountKobo,
      reference,
      callbackUrl: `${appOrigin(request)}/cityrun/account?wallet=verify&ref=${encodeURIComponent(reference)}`,
    });

    return NextResponse.json({ authorizationUrl, reference });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not start top-up" },
      { status: 500 },
    );
  }
}
