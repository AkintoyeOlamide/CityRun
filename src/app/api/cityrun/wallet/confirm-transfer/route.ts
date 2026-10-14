import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { hasServiceRoleKey } from "@/lib/supabase/server";
import { parseNairaToKobo } from "@/lib/city-run/pricing";
import {
  WALLET_BANK_DETAILS,
  WALLET_TRIP_PRICE_NAIRA,
  walletTripsFromNaira,
} from "@/lib/city-run/wallet-config";
import { creditWallet, ensureWallet } from "@/lib/city-run/wallets-store";

export const runtime = "nodejs";

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
        { error: "Wallet service is not configured on the server." },
        { status: 503 },
      );
    }

    const body = (await request.json()) as { amountNaira?: number };
    const amountNaira = Number(body.amountNaira);

    if (!Number.isFinite(amountNaira) || amountNaira <= 0) {
      return NextResponse.json({ error: "Enter a valid amount." }, { status: 400 });
    }

    if (amountNaira < WALLET_TRIP_PRICE_NAIRA) {
      return NextResponse.json(
        { error: `Minimum top-up is ₦${WALLET_TRIP_PRICE_NAIRA.toLocaleString("en-NG")}.` },
        { status: 400 },
      );
    }

    if (amountNaira % WALLET_TRIP_PRICE_NAIRA !== 0) {
      return NextResponse.json(
        {
          error: `Amount must be in ₦${WALLET_TRIP_PRICE_NAIRA.toLocaleString("en-NG")} steps (1 trip each).`,
        },
        { status: 400 },
      );
    }

    await ensureWallet(user.id);

    const trips = walletTripsFromNaira(amountNaira);
    const result = await creditWallet({
      userId: user.id,
      amountKobo: parseNairaToKobo(amountNaira),
      type: "topup",
      description: `Bank transfer to ${WALLET_BANK_DETAILS.accountNumber} (${trips} trip${trips === 1 ? "" : "s"})`,
    });

    return NextResponse.json({
      ok: true,
      wallet: result.wallet,
      transaction: result.transaction,
      trips,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not confirm transfer" },
      { status: 500 },
    );
  }
}
