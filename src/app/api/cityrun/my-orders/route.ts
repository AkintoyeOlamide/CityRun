import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/session";
import { listOrdersForUser } from "@/lib/city-run/orders-store";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    const supabase = await createClient();
    const orders = await listOrdersForUser(user.id, { supabase });
    return NextResponse.json(orders);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load orders" },
      { status: 500 },
    );
  }
}
