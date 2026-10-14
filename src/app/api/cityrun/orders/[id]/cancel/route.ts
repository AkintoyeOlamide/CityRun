import { NextResponse } from "next/server";
import { cancelOrderByCustomer } from "@/lib/city-run/orders-store";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const order = await cancelOrderByCustomer(id, {
      userId: user?.id ?? null,
      supabase,
    });

    return NextResponse.json({ order });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not cancel delivery";
    const status =
      message === "Order not found"
        ? 404
        : message.startsWith("Sign in")
          ? 401
          : message.includes("no longer be cancelled") ||
              message.includes("cannot be cancelled")
            ? 409
            : 400;

    return NextResponse.json({ error: message }, { status });
  }
}
