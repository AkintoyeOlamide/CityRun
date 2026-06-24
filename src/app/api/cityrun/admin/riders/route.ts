import { NextResponse } from "next/server";
import { AdminAuthError, requireAdmin } from "@/lib/auth/admin";
import {
  createRider,
  deleteRiders,
  listRidersAdmin,
} from "@/lib/city-run/riders-store";
import { listOrdersForRider } from "@/lib/city-run/orders-store";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireAdmin();
    const riders = await listRidersAdmin();
    const ridersWithStats = await Promise.all(
      riders.map(async (rider) => {
        try {
          const orders = await listOrdersForRider(rider.id);
          return {
            ...rider,
            rideCount: orders.length,
            completedCount: orders.filter((o) => o.status === "delivered").length,
          };
        } catch {
          return { ...rider, rideCount: 0, completedCount: 0 };
        }
      }),
    );
    return NextResponse.json(ridersWithStats);
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load riders" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = (await request.json()) as {
      username?: string;
      password?: string;
      fullName?: string;
      phone?: string;
    };

    if (!body.username || !body.password || !body.fullName) {
      return NextResponse.json(
        { error: "Username, password, and full name are required" },
        { status: 400 },
      );
    }

    const rider = await createRider({
      username: body.username,
      password: body.password,
      fullName: body.fullName,
      phone: body.phone,
    });

    return NextResponse.json(rider);
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create rider" },
      { status: 400 },
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
        { error: "Select at least one rider to delete" },
        { status: 400 },
      );
    }

    const { deleted } = await deleteRiders(ids);
    if (deleted.length === 0) {
      return NextResponse.json({ error: "No riders were deleted" }, { status: 404 });
    }

    return NextResponse.json({ deleted, count: deleted.length });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete riders" },
      { status: 400 },
    );
  }
}
