import type { ServiceMode } from "@/lib/city-run/types";

export type { ServiceMode };

export const SERVICE_MODE_STORAGE_KEY = "cityrun-service-mode";

export const serviceModes: ServiceMode[] = ["cityrun", "cityrun-plus"];

export const serviceModeCatalog: Record<
  ServiceMode,
  {
    id: ServiceMode;
    title: string;
    tagline: string;
    explanation: string;
    priceHint: string;
  }
> = {
  cityrun: {
    id: "cityrun",
    title: "City Run",
    tagline: "Electric bicycle",
    explanation: "Everyday last-mile delivery on an e-bike. One flat price for the trip.",
    priceHint: "Flat ₦1,000",
  },
  "cityrun-plus": {
    id: "cityrun-plus",
    title: "City Run Plus",
    tagline: "Motorbike",
    explanation: "Faster motorbike delivery. Fare is ₦150 per km.",
    priceHint: "₦150/km",
  },
};

export function parseServiceMode(value: unknown): ServiceMode | null {
  if (value === "cityrun" || value === "cityrun-plus") return value;
  return null;
}

export function isServiceMode(value: unknown): value is ServiceMode {
  return parseServiceMode(value) !== null;
}

export function readStoredServiceMode(): ServiceMode | null {
  if (typeof window === "undefined") return null;
  try {
    return parseServiceMode(window.localStorage.getItem(SERVICE_MODE_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function writeStoredServiceMode(mode: ServiceMode) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SERVICE_MODE_STORAGE_KEY, mode);
}
