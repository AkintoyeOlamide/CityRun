import { NextResponse } from "next/server";
import { getProfile, upsertProfile, upsertProfileForSession } from "@/lib/auth/profile-store";
import { mergeProfileWithUserMetadata } from "@/lib/auth/profile-metadata";
import {
  profileUsableFromMetadata,
  repairProfileFromUserMetadata,
} from "@/lib/auth/server-auth";
import { hasServiceRoleKey } from "@/lib/supabase/server";
import { createClient } from "@/utils/supabase/server";
import type { AccountType, AddressValue, SavedClient } from "@/lib/city-run/types";

export const runtime = "nodejs";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user ?? null;

    if (!user) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    const metadataProfile = mergeProfileWithUserMetadata(null, user);

    if (profileUsableFromMetadata(user)) {
      void repairProfileFromUserMetadata(user).catch(() => undefined);
      return NextResponse.json(metadataProfile, {
        headers: { "Cache-Control": "private, no-store" },
      });
    }

    const dbProfile = await getProfile(user.id, user.email ?? "", supabase);
    const profile = mergeProfileWithUserMetadata(dbProfile, user);

    return NextResponse.json(profile, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load profile" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user ?? null;

    if (!user) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    const dbExisting = await getProfile(user.id, user.email ?? "", supabase);
    const existing = mergeProfileWithUserMetadata(dbExisting, user);

    const body = (await request.json()) as {
      fullName?: string;
      phone?: string;
      accountType?: AccountType;
      businessName?: string;
      natureOfGoods?: string;
      businessAddress?: AddressValue;
      savedClients?: SavedClient[];
    };

    const fullName = body.fullName?.trim() ?? existing?.fullName ?? "";
    const phone = body.phone?.trim() ?? existing?.phone ?? "";

    if (!fullName || !phone) {
      return NextResponse.json(
        { error: "Name and phone are required" },
        { status: 400 },
      );
    }

    const isVendor = existing?.accountType === "vendor";
    const isBusiness = existing?.accountType === "business";
    const businessAddress =
      isVendor || isBusiness
        ? existing?.businessAddress
        : body.businessAddress !== undefined
          ? body.businessAddress
          : existing?.businessAddress;

    const profilePatch = {
      fullName,
      phone,
      accountType: body.accountType ?? existing?.accountType ?? "individual",
      businessName: body.businessName ?? existing?.businessName,
      ...(isBusiness
        ? {
            natureOfGoods: (
              body.natureOfGoods ??
              existing?.natureOfGoods ??
              ""
            ).trim(),
          }
        : {}),
      ...(businessAddress?.formatted ? { businessAddress } : {}),
      savedClients: body.savedClients ?? existing?.savedClients ?? [],
    };

    const profile = hasServiceRoleKey()
      ? await upsertProfile(user.id, user.email ?? "", profilePatch)
      : await upsertProfileForSession(
          supabase,
          user.id,
          user.email ?? "",
          profilePatch,
        );

    return NextResponse.json(mergeProfileWithUserMetadata(profile, user));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update profile" },
      { status: 500 },
    );
  }
}
