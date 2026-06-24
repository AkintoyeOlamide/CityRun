import { NextResponse } from "next/server";
import { RiderAuthError, requireRider } from "@/lib/auth/rider-session";
import {
  listAvailableOrders,
  listOrdersForRider,
} from "@/lib/city-run/orders-store";
import { isActiveDelivery } from "@/lib/city-run/status-config";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const rider = await requireRider();
    const filter = new URL(request.url).searchParams.get("filter");

    if (filter === "available") {
      return NextResponse.json(await listAvailableOrders(rider.id));
    }

    const mine = await listOrdersForRider(rider.id);

    if (filter === "active") {
      return NextResponse.json(
        mine.filter(
          (o) => isActiveDelivery(o.status) || o.status === "confirmed",
        ),
      );
    }

    if (filter === "history") {
      return NextResponse.json(
        mine.filter((o) => o.status === "delivered" || o.status === "cancelled"),
      );
    }

    return NextResponse.json(mine);
  } catch (error) {
    if (error instanceof RiderAuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load orders" },
      { status: 500 },
    );
  }
}
