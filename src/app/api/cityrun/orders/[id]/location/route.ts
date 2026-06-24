import { NextResponse } from "next/server";
import { getOrder } from "@/lib/city-run/orders-store";
import { isActiveDelivery } from "@/lib/city-run/status-config";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const order = await getOrder(id, { supabase });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json(
      {
        riderLocation: order.riderLocation ?? null,
        status: order.status,
        updatedAt: order.updatedAt,
        riderName: order.riderName ?? null,
        tracking: isActiveDelivery(order.status),
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load rider location",
      },
      { status: 500 },
    );
  }
}

export async function PATCH() {
  return NextResponse.json(
    { error: "Rider location updates must use the rider app API." },
    { status: 403 },
  );
}
