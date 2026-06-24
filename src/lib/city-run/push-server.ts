import webpush from "web-push";
import type { DeliveryOrder } from "@/lib/city-run/types";
import {
  listAllRiderPushSubscriptions,
  listPushSubscriptions,
  removePushSubscription,
  type StoredPushSubscription,
} from "@/lib/city-run/push-subscriptions-store";

export type PushPayload = {
  title: string;
  body: string;
  url: string;
  tag?: string;
};

let configured = false;

function ensureWebPushConfigured() {
  if (configured) return true;

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject =
    process.env.VAPID_SUBJECT?.trim() || "mailto:info@citygateshl.com";

  if (!publicKey || !privateKey) return false;

  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

async function sendPushToSubscription(
  subscription: StoredPushSubscription,
  payload: PushPayload,
) {
  if (!ensureWebPushConfigured()) return;

  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      },
      JSON.stringify(payload),
    );
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode;
    if (statusCode === 404 || statusCode === 410) {
      await removePushSubscription(subscription.endpoint);
    }
  }
}

export async function sendPushToMany(
  subscriptions: StoredPushSubscription[],
  payload: PushPayload,
) {
  if (!subscriptions.length) return;
  await Promise.allSettled(
    subscriptions.map((subscription) => sendPushToSubscription(subscription, payload)),
  );
}

export async function pushNotifyRideAssignedToRider(
  order: DeliveryOrder,
  riderId: string,
) {
  const subscriptions = await listPushSubscriptions({
    audience: "rider",
    riderId,
  });

  const kindLabels = {
    send: "Send",
    receive: "Receive",
    "store-pickup": "Store pickup",
  } as const;

  await sendPushToMany(subscriptions, {
    title: "Ride assigned to you",
    body: `${kindLabels[order.kind]} · ${order.itemDescription}`,
    url: "/cityrun/rider",
    tag: `assigned-ride-${order.id}`,
  });
}

export async function pushNotifyNewRideToRiders(order: DeliveryOrder) {
  const subscriptions = await listAllRiderPushSubscriptions();
  const kindLabels = {
    send: "Send",
    receive: "Receive",
    "store-pickup": "Store pickup",
  } as const;

  await sendPushToMany(subscriptions, {
    title: "New ride request",
    body: `${kindLabels[order.kind]} · ${order.itemDescription}`,
    url: "/cityrun/rider",
    tag: `new-ride-${order.id}`,
  });
}

export async function pushNotifyRideAcceptedToCustomer(order: DeliveryOrder) {
  if (!order.userId) return;

  const subscriptions = await listPushSubscriptions({
    audience: "customer",
    userId: order.userId,
  });

  await sendPushToMany(subscriptions, {
    title: "Rider assigned",
    body: order.riderName
      ? `${order.riderName} is on your delivery — tap to track live.`
      : "A rider has been allocated — tap to track live.",
    url: `/cityrun/order/${order.id}`,
    tag: `order-${order.id}-assigned`,
  });
}

export function isWebPushConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() &&
      process.env.VAPID_PRIVATE_KEY?.trim(),
  );
}
