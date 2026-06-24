import { NextResponse } from "next/server";
import { attachOrderFare, createOrder } from "@/lib/city-run/orders-store";
import { estimateDeliveryFareKobo } from "@/lib/city-run/pricing";
import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/server";
import { createClient } from "@/utils/supabase/server";
import type { DeliveryKind, DeliveryOrderDraft } from "@/lib/city-run/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<DeliveryOrderDraft>;

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

    const fareKobo = estimateDeliveryFareKobo(
      body.pickup,
      body.dropoff,
      body.itemSize ?? "medium",
    );

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
      },
      user ? { supabase: writeClient } : undefined,
    );

    try {
      await attachOrderFare(order.id, fareKobo, user ? { supabase: writeClient } : undefined);
    } catch {
      // Fare is optional if schema is still updating
    }

    return NextResponse.json({ id: order.id, status: order.status, fareKobo });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create order" },
      { status: 500 },
    );
  }
}
