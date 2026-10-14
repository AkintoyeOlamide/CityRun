import { NextResponse } from "next/server";
import { AdminAuthError, requireAdmin } from "@/lib/auth/admin";
import {
  getVendorAdmin,
  updateVendorPassword,
} from "@/lib/city-run/vendors-store";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    await requireAdmin();
    const { id } = await context.params;
    const vendor = await getVendorAdmin(id);
    if (!vendor) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }
    return NextResponse.json(vendor);
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load vendor" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await requireAdmin();
    const { id } = await context.params;
    const vendor = await getVendorAdmin(id);
    if (!vendor) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    const body = (await request.json()) as { password?: string };
    if (!body.password) {
      return NextResponse.json({ error: "Password is required" }, { status: 400 });
    }

    await updateVendorPassword(id, vendor.email, body.password, {
      fullName: vendor.fullName,
      phone: vendor.phone,
      businessName: vendor.businessName,
      businessAddress: vendor.businessAddress,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update vendor" },
      { status: 400 },
    );
  }
}
