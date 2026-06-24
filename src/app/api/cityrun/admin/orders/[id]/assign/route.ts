import { NextResponse } from "next/server";
import { AdminAuthError, requireAdmin } from "@/lib/auth/admin";
import { getAdminActorLabel } from "@/lib/auth/admin-session";
import { listOrderEvents } from "@/lib/city-run/order-events";
import { assignOrderToRider } from "@/lib/city-run/orders-store";
import {
  pushNotifyRideAcceptedToCustomer,
  pushNotifyRideAssignedToRider,
} from "@/lib/city-run/push-server";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = (await request.json()) as { riderId?: string; note?: string };

    if (!body.riderId?.trim()) {
      return NextResponse.json({ error: "Select a rider to allocate" }, { status: 400 });
    }

    const order = await assignOrderToRider(id, body.riderId.trim(), {
      actor: getAdminActorLabel(),
      note: body.note?.trim() || undefined,
    });

    void pushNotifyRideAssignedToRider(order, body.riderId.trim()).catch(() => undefined);
    void pushNotifyRideAcceptedToCustomer(order).catch(() => undefined);

    const events = await listOrderEvents(id);
    return NextResponse.json({ order, events });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to assign rider" },
      { status: 400 },
    );
  }
}
