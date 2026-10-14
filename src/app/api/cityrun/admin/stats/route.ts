import { NextResponse } from "next/server";
import { AdminAuthError, requireAdmin } from "@/lib/auth/admin";
import { listOrders } from "@/lib/city-run/orders-store";
import { isActiveDelivery } from "@/lib/city-run/status-config";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireAdmin();
    const orders = await listOrders();
    const today = new Date().toDateString();

    const stats = {
      total: orders.length,
      pending: orders.filter((o) => o.status === "pending").length,
      active: orders.filter((o) => isActiveDelivery(o.status) || o.status === "confirmed").length,
      delivered: orders.filter((o) => o.status === "delivered").length,
      cancelled: orders.filter((o) => o.status === "cancelled").length,
      deliveredToday: orders.filter(
        (o) =>
          o.status === "delivered" &&
          new Date(o.updatedAt).toDateString() === today,
      ).length,
    };

    return NextResponse.json(stats);
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load stats" },
      { status: 500 },
    );
  }
}
