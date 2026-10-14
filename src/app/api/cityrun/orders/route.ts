import { NextResponse } from "next/server";
import { attachOrderFare, createOrder } from "@/lib/city-run/orders-store";
import { estimateDeliveryFareKobo } from "@/lib/city-run/pricing";
import { parseServiceMode } from "@/lib/city-run/service-mode";
import { pushNotifyNewRideToRiders } from "@/lib/city-run/push-server";
import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/server";
import { createClient } from "@/utils/supabase/server";
import type { DeliveryKind, DeliveryOrderDraft, ServiceMode } from "@/lib/city-run/types";

export const runtime = "nodejs";

type CreateOrderBody = Partial<DeliveryOrderDraft> & { serviceMode?: ServiceMode };

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateOrderBody;

    if (
      !body.kind ||
      !body.pickup?.formatted ||
      !body.dropoff?.formatted ||
      !body.itemDescription ||
      !body.contactName ||
      !body.contactPhone
    ) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const validKinds: DeliveryKind[] = ["send", "receive", "store-pickup"];
    if (!validKinds.includes(body.kind)) {
      return NextResponse.json({ error: "Invalid delivery type" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user ?? null;
    const fareQuote = estimateDeliveryFareKobo({
      serviceMode: parseServiceMode(body.serviceMode) ?? "cityrun",
      pickup: body.pickup,
      dropoff: body.dropoff,
    });
    const fareKobo = fareQuote.fareKobo;

    const writeClient = user && hasServiceRoleKey() ? createAdminClient() : supabase;

    const order = await createOrder(
      {
        kind: body.kind,
        pickup: body.pickup,
        dropoff: body.dropoff,
        itemDescription: body.itemDescription,
        itemSize: body.itemSize ?? "medium",
        notes: body.notes ?? "",
        contactName: body.contactName,
        contactPhone: body.contactPhone,
        ...(body.itemPhotoUrl ? { itemPhotoUrl: body.itemPhotoUrl } : {}),
        ...(user ? { userId: user.id } : {}),
        ...(fareQuote.serviceMode ? { serviceMode: fareQuote.serviceMode } : {}),
      },
      user ? { supabase: writeClient } : undefined,
    );

    await attachOrderFare(order.id, fareKobo, {
      supabase: user ? writeClient : undefined,
    });

    void pushNotifyNewRideToRiders(order).catch(() => undefined);

    return NextResponse.json({
      id: order.id,
      status: order.status,
      fareKobo,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create order" },
      { status: 500 },
    );
  }
}
