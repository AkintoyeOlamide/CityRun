import { NextResponse } from "next/server";
import { getOrder } from "@/lib/city-run/orders-store";
import { isOrderPaid, orderDueKobo } from "@/lib/city-run/order-payment";
import {
  initializePaystackTransaction,
  isPaystackConfigured,
} from "@/lib/city-run/paystack";
import { WALLET_TRIP_PRICE_KOBO } from "@/lib/city-run/wallet-config";
import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/server";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

function appOrigin(request: Request) {
  return process.env.NEXT_PUBLIC_APP_URL?.trim() || new URL(request.url).origin;
}

function payerEmailFromOrder(
  order: { contactPhone: string; contactName: string },
  userEmail?: string | null,
  bodyEmail?: string,
) {
  const trimmed = bodyEmail?.trim();
  if (trimmed && trimmed.includes("@")) return trimmed;
  if (userEmail?.trim()) return userEmail.trim();
  const digits = order.contactPhone.replace(/\D/g, "").slice(-10);
  return `customer${digits || "guest"}@citygateshl.org`;
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params;

    if (!isPaystackConfigured()) {
      return NextResponse.json(
        { error: "Online payment is not configured. Contact City Run support." },
        { status: 503 },
      );
    }

    if (!hasServiceRoleKey()) {
      return NextResponse.json(
        { error: "Payment service is not available yet." },
        { status: 503 },
      );
    }

    const body = (await request.json().catch(() => ({}))) as { email?: string };
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user ?? null;

    const order = await getOrder(id, { supabase });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.status !== "arrived_at_dropoff") {
      return NextResponse.json(
        { error: "Payment opens when your rider arrives at the destination." },
        { status: 400 },
      );
    }

    if (isOrderPaid(order)) {
      return NextResponse.json({ order, paid: true });
    }

    const dueKobo = orderDueKobo(order) || WALLET_TRIP_PRICE_KOBO;
    const email = payerEmailFromOrder(order, user?.email, body.email);
    const reference = `cr_order_${id.replace(/-/g, "").slice(0, 12)}_${Date.now()}`;
    const admin = createAdminClient();

    const { error: intentError } = await admin.from("order_payment_intents").insert({
      order_id: id,
      amount_kobo: dueKobo,
      reference,
      payer_email: email,
      status: "pending",
    });

    if (intentError) {
      if (intentError.message.includes("order_payment_intents")) {
        return NextResponse.json(
          {
            error:
              "Payment table is missing. Run supabase/migrations/add_order_paystack_payments.sql in Supabase.",
          },
          { status: 503 },
        );
      }
      throw new Error(intentError.message);
    }

    const authorizationUrl = await initializePaystackTransaction({
      email,
      amountKobo: dueKobo,
      reference,
      callbackUrl: `${appOrigin(request)}/cityrun/order/${id}?payment=verify&ref=${encodeURIComponent(reference)}`,
    });

    return NextResponse.json({ authorizationUrl, reference });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not start payment" },
      { status: 500 },
    );
  }
}
