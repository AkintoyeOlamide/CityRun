import { NextResponse } from "next/server";
import { AdminAuthError, requireAdmin } from "@/lib/auth/admin";
import {
  createVendor,
  deleteVendors,
  listVendorsAdmin,
} from "@/lib/city-run/vendors-store";
import type { AddressValue } from "@/lib/city-run/types";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireAdmin();
    const vendors = await listVendorsAdmin();
    return NextResponse.json(vendors);
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load vendors" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = (await request.json()) as {
      email?: string;
      password?: string;
      fullName?: string;
      phone?: string;
      businessName?: string;
      businessAddress?: AddressValue;
    };

    if (
      !body.email?.trim() ||
      !body.password ||
      !body.fullName?.trim() ||
      !body.phone?.trim() ||
      !body.businessName?.trim() ||
      !body.businessAddress?.formatted ||
      body.businessAddress.formatted.trim().length <= 5
    ) {
      return NextResponse.json(
        {
          error:
            "Email, password, contact name, phone, vendor name, and pickup address are required.",
        },
        { status: 400 },
      );
    }

    const vendor = await createVendor({
      email: body.email.trim(),
      password: body.password,
      fullName: body.fullName.trim(),
      phone: body.phone.trim(),
      businessName: body.businessName.trim(),
      businessAddress: body.businessAddress,
    });

    return NextResponse.json(vendor);
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create vendor" },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    await requireAdmin();
    const body = (await request.json()) as { ids?: string[] };
    const ids = body.ids;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "Select at least one vendor to delete" },
        { status: 400 },
      );
    }

    const { deleted } = await deleteVendors(ids);
    if (deleted.length === 0) {
      return NextResponse.json({ error: "No vendors were deleted" }, { status: 404 });
    }

    return NextResponse.json({ deleted, count: deleted.length });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete vendors" },
      { status: 400 },
    );
  }
}
