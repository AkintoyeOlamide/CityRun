import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/server";
import { verifyPaystackTransaction } from "@/lib/city-run/paystack";
import { creditWallet, getWalletOverview } from "@/lib/city-run/wallets-store";

export const runtime = "nodejs";

/** Applies any successful Paystack top-ups that were never credited (e.g. before return-url verify). */
export async function POST() {
  try {
    if (!hasServiceRoleKey()) {
      return NextResponse.json(
        { error: "Wallet service is not configured on the server." },
        { status: 503 },
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: intents, error: intentsError } = await admin
      .from("wallet_topup_intents")
      .select("id, reference, amount_kobo, status, wallet_transaction_id")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(10);

    if (intentsError) {
      throw new Error(intentsError.message);
    }

    let applied = 0;

    for (const intent of intents ?? []) {
      try {
        const verified = await verifyPaystackTransaction(intent.reference);
        if (verified.status !== "success") {
          await admin
            .from("wallet_topup_intents")
            .update({ status: "failed" })
            .eq("id", intent.id);
          continue;
        }

        const paidAmount = verified.amount ?? intent.amount_kobo;
        if (paidAmount !== intent.amount_kobo) {
          continue;
        }

        const { transaction } = await creditWallet({
          userId: user.id,
          amountKobo: intent.amount_kobo,
          description: "Wallet top-up via Paystack",
          type: "topup",
        });

        await admin
          .from("wallet_topup_intents")
          .update({
            status: "paid",
            paid_at: new Date().toISOString(),
            wallet_transaction_id: transaction.id,
          })
          .eq("id", intent.id);

        applied += 1;
      } catch {
        /* leave pending — user can retry or contact support */
      }
    }

    const overview = await getWalletOverview(user.id);
    return NextResponse.json({ applied, ...overview });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not sync wallet top-ups" },
      { status: 500 },
    );
  }
}
