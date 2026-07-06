import { NextResponse } from "next/server";
import { AdminAuthError, requireAdmin } from "@/lib/auth/admin";
import { parseNairaToKobo } from "@/lib/city-run/pricing";
import { creditWallet, getWalletOverview } from "@/lib/city-run/wallets-store";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;
    const overview = await getWalletOverview(id);
    return NextResponse.json(overview);
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load wallet" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = (await request.json()) as {
      amountNaira?: number;
      description?: string;
    };

    const amountNaira = Number(body.amountNaira);
    if (!Number.isFinite(amountNaira) || amountNaira <= 0) {
      return NextResponse.json({ error: "Enter a valid amount." }, { status: 400 });
    }

    const result = await creditWallet({
      userId: id,
      amountKobo: parseNairaToKobo(amountNaira),
      description: body.description?.trim() || "Admin wallet credit",
      type: "adjustment",
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not credit wallet" },
      { status: 500 },
    );
  }
}
