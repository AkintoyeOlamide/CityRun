import { NextResponse } from "next/server";
import { AdminAuthError, requireAdmin } from "@/lib/auth/admin";
import { getAdminActorLabel } from "@/lib/auth/admin-session";
import { listOrderEvents } from "@/lib/city-run/order-events";
import {
  deleteOrders,
  getOrder,
  updateOrderStatus,
} from "@/lib/city-run/orders-store";
import type { DeliveryOrderStatus } from "@/lib/city-run/types";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;
    const order = await getOrder(id);

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const events = await listOrderEvents(id);
    return NextResponse.json({ order, events });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load order" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = (await request.json()) as {
      status?: DeliveryOrderStatus;
      riderName?: string;
      note?: string;
    };

    if (!body.status) {
      return NextResponse.json({ error: "Status is required" }, { status: 400 });
    }

    const order = await updateOrderStatus(id, body.status, {
      ...(body.riderName !== undefined ? { riderName: body.riderName } : {}),
      actor: getAdminActorLabel(),
      note: body.note,
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const events = await listOrderEvents(id);
    return NextResponse.json({ order, events });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update order" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;
    const { deleted } = await deleteOrders([id]);
    if (deleted.length === 0) {
      return NextResponse.json({ error: "Ride not found" }, { status: 404 });
    }
    return NextResponse.json({ deleted: id });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete ride" },
      { status: 400 },
    );
  }
}
