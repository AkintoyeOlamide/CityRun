import { NextResponse } from "next/server";
import { estimateDeliveryFareKobo } from "@/lib/city-run/pricing";
import type { AddressValue } from "@/lib/city-run/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      pickup?: AddressValue;
      dropoff?: AddressValue;
      itemSize?: "small" | "medium" | "large";
    };

    if (!body.pickup?.formatted || !body.dropoff?.formatted) {
      return NextResponse.json({ error: "Pickup and dropoff required" }, { status: 400 });
    }

    const fareKobo = estimateDeliveryFareKobo(
      body.pickup,
      body.dropoff,
      body.itemSize ?? "medium",
    );

    return NextResponse.json({ fareKobo });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Quote failed" },
      { status: 500 },
    );
  }
}
