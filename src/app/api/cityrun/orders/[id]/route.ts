import { NextResponse } from "next/server";
import { getOrder } from "@/lib/city-run/orders-store";
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

    return NextResponse.json(order);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load order" },
      { status: 500 },
    );
  }
}

export async function PATCH() {
  return NextResponse.json(
    { error: "Use admin or rider APIs to update order status." },
    { status: 403 },
  );
}
