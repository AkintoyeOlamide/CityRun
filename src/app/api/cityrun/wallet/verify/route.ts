import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/server";
import { verifyPaystackTransaction } from "@/lib/city-run/paystack";
import { creditWallet, getWallet } from "@/lib/city-run/wallets-store";

export const runtime = "nodejs";

export async function GET(request: Request) {
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

    const reference =
      new URL(request.url).searchParams.get("reference")?.trim() ?? "";
    if (!reference) {
      return NextResponse.json({ error: "Payment reference is required." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: intent, error: intentError } = await admin
      .from("wallet_topup_intents")
      .select("id, user_id, amount_kobo, status, wallet_transaction_id")
      .eq("reference", reference)
      .maybeSingle();

    if (intentError) {
      throw new Error(intentError.message);
    }

    if (!intent || intent.user_id !== user.id) {
      return NextResponse.json({ error: "Top-up not found." }, { status: 404 });
    }

    if (intent.status === "paid") {
      const wallet = await getWallet(user.id);
      return NextResponse.json({
        ok: true,
        alreadyPaid: true,
        wallet,
      });
    }

    const verified = await verifyPaystackTransaction(reference);
    if (verified.status !== "success") {
      await admin
        .from("wallet_topup_intents")
        .update({ status: "failed" })
        .eq("reference", reference);

      return NextResponse.json({ error: "Payment was not successful." }, { status: 400 });
    }

    const paidAmount = verified.amount ?? intent.amount_kobo;
    if (paidAmount !== intent.amount_kobo) {
      return NextResponse.json({ error: "Paid amount does not match top-up request." }, { status: 400 });
    }

    const { wallet, transaction } = await creditWallet({
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
      .eq("reference", reference);

    return NextResponse.json({ ok: true, wallet, transaction });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not verify payment" },
      { status: 500 },
    );
  }
}
