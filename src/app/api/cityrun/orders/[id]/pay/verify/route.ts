import { NextResponse } from "next/server";
import { getOrder, markOrderPaid } from "@/lib/city-run/orders-store";
import { isOrderPaid } from "@/lib/city-run/order-payment";
import { verifyPaystackTransaction } from "@/lib/city-run/paystack";
import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/server";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  try {
    const { id } = await params;

    if (!hasServiceRoleKey()) {
      return NextResponse.json(
        { error: "Payment service is not configured on the server." },
        { status: 503 },
      );
    }

    const reference =
      new URL(request.url).searchParams.get("reference")?.trim() ?? "";
    if (!reference) {
      return NextResponse.json({ error: "Payment reference is required." }, { status: 400 });
    }

    const supabase = await createClient();
    const order = await getOrder(id, { supabase });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (isOrderPaid(order)) {
      return NextResponse.json({ ok: true, alreadyPaid: true, order });
    }

    const admin = createAdminClient();
    const { data: intent, error: intentError } = await admin
      .from("order_payment_intents")
      .select("id, order_id, amount_kobo, status")
      .eq("reference", reference)
      .maybeSingle();

    if (intentError) {
      throw new Error(intentError.message);
    }

    if (!intent || intent.order_id !== id) {
      return NextResponse.json({ error: "Payment not found for this order." }, { status: 404 });
    }

    if (intent.status === "paid") {
      const refreshed = await getOrder(id, { supabase });
      return NextResponse.json({ ok: true, alreadyPaid: true, order: refreshed });
    }

    const verified = await verifyPaystackTransaction(reference);
    if (verified.status !== "success") {
      await admin
        .from("order_payment_intents")
        .update({ status: "failed" })
        .eq("reference", reference);

      return NextResponse.json({ error: "Payment was not successful." }, { status: 400 });
    }

    const paidAmount = verified.amount ?? intent.amount_kobo;
    if (paidAmount !== intent.amount_kobo) {
      return NextResponse.json(
        { error: "Paid amount does not match the delivery fee." },
        { status: 400 },
      );
    }

    const paidOrder = await markOrderPaid(id, {
      paymentMethod: "paystack",
      supabase: admin,
    });

    await admin
      .from("order_payment_intents")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
      })
      .eq("reference", reference);

    return NextResponse.json({ ok: true, order: paidOrder });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not verify payment" },
      { status: 500 },
    );
  }
}
