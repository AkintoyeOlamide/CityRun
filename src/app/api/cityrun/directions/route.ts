import { NextResponse } from "next/server";
import { fetchDrivingRouteServer } from "@/lib/city-run/directions-server";

export const runtime = "nodejs";

function parseLatLng(raw: string | null): { lat: number; lng: number } | null {
  if (!raw) return null;
  const [latStr, lngStr] = raw.split(",");
  const lat = Number(latStr);
  const lng = Number(lngStr);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const origin = parseLatLng(params.get("origin"));
    const destination = parseLatLng(params.get("destination"));

    if (!origin || !destination) {
      return NextResponse.json(
        { error: "origin and destination required as lat,lng" },
        { status: 400 },
      );
    }

    const path = await fetchDrivingRouteServer(origin, destination);
    return NextResponse.json({ path });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Directions failed" },
      { status: 500 },
    );
  }
}
