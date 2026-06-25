import { NextResponse } from "next/server";
import {
  isGoogleMapsKeyConfigured,
  readGoogleMapsApiKey,
} from "@/lib/city-run/maps-config-server";

export const runtime = "nodejs";

/** Supplies the Maps JS API key to the browser when build-time NEXT_PUBLIC_* was empty. */
export async function GET() {
  const apiKey = readGoogleMapsApiKey();
  return NextResponse.json(
    {
      configured: isGoogleMapsKeyConfigured(),
      apiKey: apiKey || null,
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
