import { NextResponse } from "next/server";
import {
  isBrowserMapsKeyConfigured,
  isServerMapsKeyConfigured,
  readBrowserMapsApiKey,
} from "@/lib/city-run/maps-config-server";

export const runtime = "nodejs";

/** Supplies the browser Maps JS key when build-time NEXT_PUBLIC_* was empty. */
export async function GET() {
  const apiKey = readBrowserMapsApiKey();
  return NextResponse.json(
    {
      configured: isBrowserMapsKeyConfigured(),
      serverConfigured: isServerMapsKeyConfigured(),
      apiKey: apiKey || null,
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
