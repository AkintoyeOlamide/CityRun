import { NextResponse } from "next/server";
import { getProfile } from "@/lib/auth/profile-store";
import {
  mergeProfileWithUserMetadata,
  resolveBusinessPickup,
  resolveNatureOfGoods,
} from "@/lib/auth/profile-metadata";
import { attachOrderFare, createOrder } from "@/lib/city-run/orders-store";
import { pushNotifyNewRideToRiders } from "@/lib/city-run/push-server";
import { isBusinessLikeProfile } from "@/lib/city-run/account-utils";
import { estimateDeliveryFareKobo } from "@/lib/city-run/pricing";
import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/server";
import { createClient } from "@/utils/supabase/server";
import type { AddressValue, DeliveryKind } from "@/lib/city-run/types";

export const runtime = "nodejs";

type BatchStop = {
  dropoff?: AddressValue;
  contactName?: string;
  contactPhone?: string;
};

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user ?? null;

    if (!user) {
      return NextResponse.json({ error: "Sign in required" }, { status: 401 });
    }

    const dbProfile = await getProfile(user.id, user.email ?? "", supabase);
    const profile = mergeProfileWithUserMetadata(dbProfile, user);
    if (!profile || !isBusinessLikeProfile(profile, user)) {
      return NextResponse.json(
        { error: "Batch delivery is for vendor and business accounts only" },
        { status: 403 },
      );
    }

    const pickup = resolveBusinessPickup(profile, user);
    if (!pickup?.formatted || pickup.formatted.trim().length <= 5) {
      return NextResponse.json(
        {
          error:
            "Pickup address is not set on your account. Sign out and sign in again, or contact support.",
        },
        { status: 400 },
      );
    }

    const body = (await request.json()) as {
      kind?: DeliveryKind;
      stops?: BatchStop[];
      itemDescription?: string;
      itemSize?: "small" | "medium" | "large";
      notes?: string;
      itemPhotoUrl?: string;
    };

    const kind: DeliveryKind = "send";
    const stops = body.stops ?? [];
    const itemSize = body.itemSize ?? "medium";
    const itemDescription =
      body.itemDescription?.trim() || resolveNatureOfGoods(profile, user) || "";

    if (!itemDescription) {
      return NextResponse.json(
        {
          error:
            "Set the nature of goods on your business profile before sending items.",
        },
        { status: 400 },
      );
    }

    if (stops.length === 0) {
      return NextResponse.json({ error: "Add at least one delivery stop" }, { status: 400 });
    }

    if (stops.length > 20) {
      return NextResponse.json({ error: "Maximum 20 deliveries per batch" }, { status: 400 });
    }

    for (let i = 0; i < stops.length; i += 1) {
      const stop = stops[i];
      if (!stop.dropoff?.formatted || stop.dropoff.formatted.trim().length <= 5) {
        return NextResponse.json(
          { error: `Delivery address is required for stop ${i + 1}` },
          { status: 400 },
        );
      }
      const receiverPhone = stop.contactPhone?.trim() ?? "";
      if (receiverPhone.replace(/\D/g, "").length < 10) {
        return NextResponse.json(
          { error: `Receiver phone is required for stop ${i + 1}` },
          { status: 400 },
        );
      }
    }

    const orderIds: string[] = [];
    const writeClient = hasServiceRoleKey() ? createAdminClient() : supabase;

    for (const stop of stops) {
      const contactPhone = stop.contactPhone!.trim();
      const order = await createOrder(
        {
          kind,
          pickup,
          dropoff: stop.dropoff!,
          itemDescription,
          itemSize,
          notes: body.notes ?? "",
          contactName:
            stop.contactName?.trim() ||
            profile.businessName?.trim() ||
            profile.fullName?.trim() ||
            "Recipient",
          contactPhone,
          userId: user.id,
          ...(body.itemPhotoUrl ? { itemPhotoUrl: body.itemPhotoUrl } : {}),
        },
        { supabase: writeClient },
      );

      try {
        const fareKobo = estimateDeliveryFareKobo(pickup, stop.dropoff!, itemSize);
        await attachOrderFare(order.id, fareKobo, { supabase: writeClient });
      } catch {
        // Fare is optional if schema is still updating
      }

      try {
        await pushNotifyNewRideToRiders(order);
      } catch {
        // Push is best-effort — order is already saved
      }

      orderIds.push(order.id);
    }

    return NextResponse.json({
      ids: orderIds,
      count: orderIds.length,
      redirectTo:
        orderIds.length === 1
          ? `/cityrun/order/${orderIds[0]}`
          : `/cityrun/account?batch=${orderIds.length}`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create deliveries" },
      { status: 500 },
    );
  }
}
