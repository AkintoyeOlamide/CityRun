import { NextResponse } from "next/server";
import { resolvePlace } from "@/lib/city-run/places-server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const placeId = params.get("placeId")?.trim();
  if (!placeId) {
    return NextResponse.json({ error: "placeId is required" }, { status: 400 });
  }

  const description = params.get("description") ?? undefined;
  const lat = params.get("lat") ? Number.parseFloat(params.get("lat")!) : undefined;
  const lng = params.get("lng") ? Number.parseFloat(params.get("lng")!) : undefined;

  try {
    const address = await resolvePlace(placeId, description, lat, lng);
    return NextResponse.json(address);
  } catch {
    return NextResponse.json({ error: "Could not resolve place" }, { status: 500 });
  }
}
