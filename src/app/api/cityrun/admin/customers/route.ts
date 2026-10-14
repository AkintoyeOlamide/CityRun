import { NextResponse } from "next/server";
import { AdminAuthError, requireAdmin } from "@/lib/auth/admin";
import {
  deleteCustomerAccounts,
  listCustomerAccounts,
} from "@/lib/city-run/customers-store";
import type { AccountType } from "@/lib/city-run/types";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const typeParam = searchParams.get("type");
    const accountType =
      typeParam === "individual" ||
      typeParam === "business" ||
      typeParam === "vendor"
        ? (typeParam as AccountType)
        : "all";

    const accounts = await listCustomerAccounts({ accountType });
    return NextResponse.json(accounts);
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load accounts" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    await requireAdmin();
    const body = (await request.json()) as { ids?: string[] };
    const ids = body.ids?.map((id) => id.trim()).filter(Boolean) ?? [];

    if (ids.length === 0) {
      return NextResponse.json({ error: "Select at least one account" }, { status: 400 });
    }

    const { deleted, errors } = await deleteCustomerAccounts(ids);
    return NextResponse.json({
      deleted,
      count: deleted.length,
      ...(errors.length ? { warnings: errors } : {}),
    });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete accounts" },
      { status: 400 },
    );
  }
}
