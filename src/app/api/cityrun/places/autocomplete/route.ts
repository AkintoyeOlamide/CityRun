import { NextResponse } from "next/server";
import { autocompletePlaces } from "@/lib/city-run/places-server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const input = new URL(request.url).searchParams.get("input")?.trim() ?? "";
  if (input.length < 3) {
    return NextResponse.json({ predictions: [] });
  }

  try {
    const result = await autocompletePlaces(input);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ predictions: [] }, { status: 500 });
  }
}
