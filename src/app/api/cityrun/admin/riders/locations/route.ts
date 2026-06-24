import { NextResponse } from "next/server";
import { AdminAuthError, requireAdmin } from "@/lib/auth/admin";
import { listAdminRiderFleet } from "@/lib/city-run/orders-store";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireAdmin();
    const fleet = await listAdminRiderFleet();
    const withGps = fleet.filter((r) => r.hasGps && r.location);

    return NextResponse.json(
      {
        riders: fleet,
        withGps,
        onDelivery: fleet.filter((r) => r.onDelivery).length,
        available: fleet.filter((r) => r.hasGps && !r.onDelivery).length,
        liveCount: withGps.length,
        updatedAt: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load rider locations",
      },
      { status: 500 },
    );
  }
}
