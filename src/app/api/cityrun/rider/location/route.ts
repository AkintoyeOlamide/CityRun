import { NextResponse } from "next/server";
import { RiderAuthError, requireRider } from "@/lib/auth/rider-session";
import { updateActiveRiderLocations } from "@/lib/city-run/orders-store";
import { updateRiderLiveLocation } from "@/lib/city-run/riders-store";

export const runtime = "nodejs";

export async function PATCH(request: Request) {
  try {
    const rider = await requireRider();
    const body = (await request.json()) as {
      lat?: number;
      lng?: number;
      accuracy?: number;
    };

    if (typeof body.lat !== "number" || typeof body.lng !== "number") {
      return NextResponse.json(
        { error: "lat and lng are required" },
        { status: 400 },
      );
    }

    const location = {
      lat: body.lat,
      lng: body.lng,
      ...(typeof body.accuracy === "number" ? { accuracy: body.accuracy } : {}),
    };

    await updateRiderLiveLocation(rider.id, location);
    const updatedCount = await updateActiveRiderLocations(rider.id, location);

    return NextResponse.json({
      ok: true,
      updatedCount,
      location,
    });
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
