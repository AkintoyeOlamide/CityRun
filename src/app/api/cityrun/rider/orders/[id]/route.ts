import { NextResponse } from "next/server";
import { getRiderActorLabel, RiderAuthError, requireRider } from "@/lib/auth/rider-session";
import { acceptOrderByRider, getOrder, updateOrderStatus } from "@/lib/city-run/orders-store";
import { isOrderPaid } from "@/lib/city-run/order-payment";
import { pushNotifyRideAcceptedToCustomer } from "@/lib/city-run/push-server";
import { riderNextAction } from "@/lib/city-run/status-config";
import type { DeliveryOrderStatus } from "@/lib/city-run/types";

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

    const body = (await request.json()) as { status?: DeliveryOrderStatus };
    const nextStatus = body.status;

    if (!nextStatus) {
      return NextResponse.json({ error: "Status is required" }, { status: 400 });
    }

    const expected = riderNextAction[order.status];
    if (!expected || expected.nextStatus !== nextStatus) {
      return NextResponse.json(
        { error: "Invalid status transition for this order" },
        { status: 400 },
      );
    }

    if (order.status === "pending" || order.status === "confirmed") {
      if (!order.riderId) {
        const accepted = await acceptOrderByRider(id, rider.id, {
          actor: getRiderActorLabel(rider.username),
          note: expected.notifyText,
        });
        void pushNotifyRideAcceptedToCustomer(accepted).catch(() => undefined);
        return NextResponse.json(accepted);
      }
      if (order.riderId !== rider.id) {
        return NextResponse.json(
          { error: "Order accepted by another rider" },
          { status: 409 },
        );
      }
    } else if (order.riderId !== rider.id) {
      return NextResponse.json(
        { error: "This order is assigned to another rider" },
        { status: 403 },
      );
    }

    if (nextStatus === "delivered" && !isOrderPaid(order)) {
      return NextResponse.json(
        {
          error: "Customer must pay ₦1,000 before you can mark this as delivered.",
          awaitingPayment: true,
        },
        { status: 402 },
      );
    }

    const updated = await updateOrderStatus(id, nextStatus, {
      riderId: rider.id,
      riderName: rider.fullName,
      actor: getRiderActorLabel(rider.username),
      note: expected.notifyText,
    });

    if (!updated) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (nextStatus === "rider_assigned") {
      void pushNotifyRideAcceptedToCustomer(updated).catch(() => undefined);
    }

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof RiderAuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update order" },
      { status: 500 },
    );
  }
}
