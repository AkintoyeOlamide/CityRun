import { NextResponse } from "next/server";
import { getOrder, markOrderPaid } from "@/lib/city-run/orders-store";
import { isOrderPaid, orderDueKobo } from "@/lib/city-run/order-payment";
import { WALLET_TRIP_PRICE_KOBO } from "@/lib/city-run/wallet-config";
import { debitWallet, ensureWallet, getWallet } from "@/lib/city-run/wallets-store";
import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/server";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

type PayOrderBody = {
  useWallet?: boolean;
};

export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as PayOrderBody;
    const useWallet = Boolean(body.useWallet);

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
    const writeClient = hasServiceRoleKey() ? createAdminClient() : supabase;

    if (useWallet && user && hasServiceRoleKey()) {
      const wallet = (await getWallet(user.id)) ?? (await ensureWallet(user.id));
      if (wallet.balanceKobo < dueKobo) {
        return NextResponse.json(
          {
            error: "Insufficient wallet balance. Pay with Paystack instead.",
            needsPayment: true,
            fareKobo: dueKobo,
          },
          { status: 402 },
        );
      }

      const { transaction } = await debitWallet({
        userId: user.id,
        amountKobo: dueKobo,
        orderId: order.id,
        description: `City Run delivery #${order.id.slice(0, 8).toUpperCase()}`,
      });

      const paid = await markOrderPaid(order.id, {
        paymentMethod: "wallet",
        walletTransactionId: transaction.id,
        supabase: writeClient,
      });

      return NextResponse.json({ order: paid, paid: true });
    }

    return NextResponse.json(
      {
        error: "Use Paystack to pay for this delivery.",
        needsPayment: true,
        fareKobo: dueKobo,
      },
      { status: 402 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Payment failed" },
      { status: 500 },
    );
  }
}
