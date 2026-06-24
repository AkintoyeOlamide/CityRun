import { NextResponse } from "next/server";
import { AdminAuthError, requireAdmin } from "@/lib/auth/admin";
import { deleteOrders, listOrders } from "@/lib/city-run/orders-store";
import { isActiveDelivery } from "@/lib/city-run/status-config";
import type { DeliveryKind, DeliveryOrderStatus } from "@/lib/city-run/types";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get("filter");
    const q = searchParams.get("q")?.trim().toLowerCase();

    let orders = await listOrders();

    if (filter === "pending") {
      orders = orders.filter((o) => o.status === "pending");
    } else if (filter === "active") {
      orders = orders.filter(
        (o) => isActiveDelivery(o.status) || o.status === "confirmed",
      );
    } else if (filter === "completed") {
      orders = orders.filter((o) => o.status === "delivered");
    } else if (filter === "cancelled") {
      orders = orders.filter((o) => o.status === "cancelled");
    }

    const kind = searchParams.get("kind") as DeliveryKind | null;
    if (kind && ["send", "receive", "store-pickup"].includes(kind)) {
      orders = orders.filter((o) => o.kind === kind);
    }

    if (q) {
      orders = orders.filter((o) => {
        const haystack = [
          o.id,
          o.contactName,
          o.contactPhone,
          o.pickup.formatted,
          o.dropoff.formatted,
          o.riderName ?? "",
          o.itemDescription,
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      });
    }

    return NextResponse.json(orders);
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load orders" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    await requireAdmin();
    const body = (await request.json()) as { ids?: string[] };
    const ids = body.ids;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "Select at least one ride to delete" },
        { status: 400 },
      );
    }

    const { deleted } = await deleteOrders(ids);
    if (deleted.length === 0) {
      return NextResponse.json(
        { error: "No rides were deleted. They may already be removed." },
        { status: 404 },
      );
    }

    return NextResponse.json({ deleted, count: deleted.length });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete rides" },
      { status: 400 },
    );
  }
}
