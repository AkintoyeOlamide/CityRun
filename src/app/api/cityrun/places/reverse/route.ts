import { NextResponse } from "next/server";
import { reverseGeocode } from "@/lib/city-run/places-server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = Number.parseFloat(searchParams.get("lat") ?? "");
    const lng = Number.parseFloat(searchParams.get("lng") ?? "");

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json({ error: "Valid lat and lng required" }, { status: 400 });
    }

    const address = await reverseGeocode(lat, lng);
    return NextResponse.json(address);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Reverse geocode failed" },
      { status: 500 },
    );
  }
}
