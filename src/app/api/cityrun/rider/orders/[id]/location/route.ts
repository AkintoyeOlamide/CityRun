import { NextResponse } from "next/server";
import { RiderAuthError, requireRider } from "@/lib/auth/rider-session";
import { getOrder, updateRiderLocation } from "@/lib/city-run/orders-store";
import { isActiveDelivery } from "@/lib/city-run/status-config";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const rider = await requireRider();
    const { id } = await params;
    const order = await getOrder(id);

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.riderId !== rider.id) {
      return NextResponse.json({ error: "Not your order" }, { status: 403 });
    }

    if (!isActiveDelivery(order.status)) {
      return NextResponse.json({ error: "Order is not active" }, { status: 400 });
    }

    const body = (await request.json()) as { lat?: number; lng?: number };
    if (typeof body.lat !== "number" || typeof body.lng !== "number") {
      return NextResponse.json(
        { error: "lat and lng are required" },
        { status: 400 },
      );
    }

    const updated = await updateRiderLocation(id, { lat: body.lat, lng: body.lng });
    if (!updated) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof RiderAuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to update location",
      },
      { status: 500 },
    );
  }
}
