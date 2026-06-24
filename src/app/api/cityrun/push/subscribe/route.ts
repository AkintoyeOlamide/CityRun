import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/session";
import { RiderAuthError, requireRider } from "@/lib/auth/rider-session";
import {
  removePushSubscription,
  savePushSubscription,
  type PushAudience,
} from "@/lib/city-run/push-subscriptions-store";

export const runtime = "nodejs";

type SubscribeBody = {
  audience?: PushAudience;
  subscription?: {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
  };
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SubscribeBody;
    const audience = body.audience;
    const endpoint = body.subscription?.endpoint?.trim();
    const p256dh = body.subscription?.keys?.p256dh?.trim();
    const auth = body.subscription?.keys?.auth?.trim();

    if (!audience || !endpoint || !p256dh || !auth) {
      return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
    }

    if (audience === "customer") {
      const user = await getAuthUser();
      if (!user) {
        return NextResponse.json({ error: "Sign in required" }, { status: 401 });
      }

      await savePushSubscription({
        endpoint,
        p256dh,
        auth,
        audience,
        userId: user.id,
      });

      return NextResponse.json({ ok: true });
    }

    if (audience === "rider") {
      try {
        const rider = await requireRider();
        await savePushSubscription({
          endpoint,
          p256dh,
          auth,
          audience,
          riderId: rider.id,
        });
        return NextResponse.json({ ok: true });
      } catch (error) {
        if (error instanceof RiderAuthError) {
          await savePushSubscription({ endpoint, p256dh, auth, audience });
          return NextResponse.json({ ok: true });
        }
        throw error;
      }
    }

    return NextResponse.json({ error: "Invalid audience" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Subscribe failed" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body = (await request.json()) as { endpoint?: string };
    if (!body.endpoint) {
      return NextResponse.json({ error: "endpoint required" }, { status: 400 });
    }
    await removePushSubscription(body.endpoint);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unsubscribe failed" },
      { status: 500 },
    );
  }
}
