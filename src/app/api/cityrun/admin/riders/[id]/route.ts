import { NextResponse } from "next/server";
import { AdminAuthError, requireAdmin } from "@/lib/auth/admin";
import { listOrdersForRider } from "@/lib/city-run/orders-store";
import { isActiveDelivery } from "@/lib/city-run/status-config";
import {
  deleteRiders,
  getRiderAdmin,
  setRiderActive,
  updateRiderPassword,
  updateRiderProfile,
} from "@/lib/city-run/riders-store";
import type { DeliveryOrder } from "@/lib/city-run/types";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

function mergeRiderOrders(
  byId: DeliveryOrder[],
  byName: DeliveryOrder[],
  riderId: string,
): DeliveryOrder[] {
  const map = new Map<string, DeliveryOrder>();
  for (const order of byId) map.set(order.id, order);
  for (const order of byName) {
    if (!order.riderId && order.riderName) {
      map.set(order.id, { ...order, riderId });
    }
  }
  return [...map.values()].sort(
    (a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export async function GET(_request: Request, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;
    const rider = await getRiderAdmin(id);

    if (!rider) {
      return NextResponse.json({ error: "Rider not found" }, { status: 404 });
    }

    const byId = await listOrdersForRider(id);
    const { listOrders } = await import("@/lib/city-run/orders-store");
    const all = await listOrders();
    const byName = all.filter(
      (o) => !o.riderId && o.riderName === rider.fullName,
    );
    const orders = mergeRiderOrders(byId, byName, id);

    const stats = {
      total: orders.length,
      active: orders.filter(
        (o) => isActiveDelivery(o.status) || o.status === "confirmed",
      ).length,
      completed: orders.filter((o) => o.status === "delivered").length,
      cancelled: orders.filter((o) => o.status === "cancelled").length,
    };

    return NextResponse.json({ rider, orders, stats });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load rider" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = (await request.json()) as {
      active?: boolean;
      password?: string;
      fullName?: string;
      phone?: string;
    };

    if (body.password !== undefined) {
      const exists = await getRiderAdmin(id);
      if (!exists) {
        return NextResponse.json({ error: "Rider not found" }, { status: 404 });
      }
      const rider = await updateRiderPassword(id, body.password);
      if (!rider) {
        return NextResponse.json(
          { error: "Password update failed. Try again." },
          { status: 500 },
        );
      }
      return NextResponse.json(rider);
    }

    if (typeof body.active === "boolean") {
      const rider = await setRiderActive(id, body.active);
      if (!rider) {
        return NextResponse.json({ error: "Rider not found" }, { status: 404 });
      }
      return NextResponse.json(rider);
    }

    if (body.fullName !== undefined || body.phone !== undefined) {
      const rider = await updateRiderProfile(id, {
        ...(body.fullName !== undefined ? { fullName: body.fullName } : {}),
        ...(body.phone !== undefined ? { phone: body.phone } : {}),
      });
      if (!rider) {
        return NextResponse.json({ error: "Rider not found" }, { status: 404 });
      }
      return NextResponse.json(rider);
    }

    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update rider" },
      { status: 400 },
    );
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;
    const { deleted } = await deleteRiders([id]);
    if (deleted.length === 0) {
      return NextResponse.json({ error: "Rider not found" }, { status: 404 });
    }
    return NextResponse.json({ deleted: id });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete rider" },
      { status: 400 },
    );
  }
}
