import type { DeliveryOrderStatus } from "@/lib/city-run/types";

export type StatusStep = {
  status: DeliveryOrderStatus;
  customerLabel: string;
  riderLabel: string;
  customerDetail: string;
};

/** Full delivery journey — shown to customers as a timeline */
export const deliveryTimeline: StatusStep[] = [
  {
    status: "pending",
    customerLabel: "Order placed",
    riderLabel: "New request",
    customerDetail: "We're finding a rider for your delivery.",
  },
  {
    status: "rider_assigned",
    customerLabel: "Rider assigned",
    riderLabel: "Accepted",
    customerDetail: "A rider has accepted your order.",
  },
  {
    status: "en_route_pickup",
    customerLabel: "Rider on the way to pickup",
    riderLabel: "Heading to pickup",
    customerDetail: "Your rider is travelling to collect the item.",
  },
  {
    status: "picked_up",
    customerLabel: "Item picked up",
    riderLabel: "Picked up",
    customerDetail: "Your rider has collected the item.",
  },
  {
    status: "in_transit",
    customerLabel: "On the way to you",
    riderLabel: "En route to customer",
    customerDetail: "Your rider is on the way to the delivery address.",
  },
  {
    status: "arrived_at_dropoff",
    customerLabel: "Rider has arrived",
    riderLabel: "At destination",
    customerDetail: "Your rider has arrived at the delivery location.",
  },
  {
    status: "delivered",
    customerLabel: "Delivered",
    riderLabel: "Completed",
    customerDetail: "Your items have been delivered.",
  },
];

export type RiderAction = {
  nextStatus: DeliveryOrderStatus;
  buttonLabel: string;
  notifyText: string;
};

/** Next action the rider can take for each status */
export const riderNextAction: Partial<Record<DeliveryOrderStatus, RiderAction>> =
  {
    pending: {
      nextStatus: "rider_assigned",
      buttonLabel: "Accept order",
      notifyText: "Customer notified: a rider has been assigned.",
    },
    rider_assigned: {
      nextStatus: "en_route_pickup",
      buttonLabel: "On my way to pickup",
      notifyText: "Customer notified: rider is heading to the pickup location.",
    },
    en_route_pickup: {
      nextStatus: "picked_up",
      buttonLabel: "Picked up item",
      notifyText: "Customer notified: item has been picked up.",
    },
    picked_up: {
      nextStatus: "in_transit",
      buttonLabel: "On my way to customer",
      notifyText: "Customer notified: rider is on the way to you.",
    },
    in_transit: {
      nextStatus: "arrived_at_dropoff",
      buttonLabel: "Arrived at destination",
      notifyText: "Customer notified: rider has arrived at the delivery address.",
    },
    arrived_at_dropoff: {
      nextStatus: "delivered",
      buttonLabel: "Mark as delivered",
      notifyText: "Customer notified: delivery complete.",
    },
  };

const stepIndex = new Map(
  deliveryTimeline.map((step, index) => [step.status, index]),
);

export function getStatusStep(status: DeliveryOrderStatus): StatusStep | undefined {
  return deliveryTimeline.find((s) => s.status === status);
}

export function getTimelineProgress(status: DeliveryOrderStatus): number {
  if (status === "cancelled") return 0;
  if (status === "confirmed") return stepIndex.get("pending") ?? 0;
  return stepIndex.get(status) ?? 0;
}

export const customerStatusLabels: Record<DeliveryOrderStatus, string> = {
  pending: "Request received",
  confirmed: "Confirmed",
  rider_assigned: "Rider assigned",
  en_route_pickup: "Rider heading to pickup",
  picked_up: "Item picked up",
  in_transit: "On the way to you",
  arrived_at_dropoff: "Rider has arrived",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const riderStatusLabels: Record<DeliveryOrderStatus, string> = {
  pending: "New",
  confirmed: "Confirmed",
  rider_assigned: "Accepted",
  en_route_pickup: "To pickup",
  picked_up: "Picked up",
  in_transit: "To customer",
  arrived_at_dropoff: "At destination",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const activeDeliveryStatuses: DeliveryOrderStatus[] = [
  "rider_assigned",
  "en_route_pickup",
  "picked_up",
  "in_transit",
  "arrived_at_dropoff",
];

export const mapTrackingStatuses: DeliveryOrderStatus[] = [
  ...activeDeliveryStatuses,
];

export function isActiveDelivery(status: DeliveryOrderStatus) {
  return activeDeliveryStatuses.includes(status);
}
