import type { DeliveryKind } from "./types";
import { googleMapsApiKey, isGoogleMapsConfigured } from "@/lib/public-config";

export { googleMapsApiKey };
export const hasGoogleMaps = isGoogleMapsConfigured();

export const flowConfig: Record<
  DeliveryKind,
  {
    title: string;
    pickupLabel: string;
    dropoffLabel: string;
    pickupPlaceholder: string;
    dropoffPlaceholder: string;
  }
> = {
  send: {
    title: "Send items",
    pickupLabel: "Pickup address",
    dropoffLabel: "Deliver to",
    pickupPlaceholder: "Where should we collect the item?",
    dropoffPlaceholder: "Where should we deliver it?",
  },
  receive: {
    title: "Receive items",
    pickupLabel: "Item location",
    dropoffLabel: "Your address",
    pickupPlaceholder: "Where is the item coming from?",
    dropoffPlaceholder: "Where should we deliver it to you?",
  },
  "store-pickup": {
    title: "Store pickup",
    pickupLabel: "Store address",
    dropoffLabel: "Deliver to",
    pickupPlaceholder: "Which store or pickup point?",
    dropoffPlaceholder: "Your delivery address",
  },
};
