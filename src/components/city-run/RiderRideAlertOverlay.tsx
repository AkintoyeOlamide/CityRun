"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BellRing, MapPin, X } from "lucide-react";
import { stopRiderAlarm } from "@/lib/city-run/notifications";
import type { DeliveryOrder } from "@/lib/city-run/types";

const kindLabels = {
  send: "Send",
  receive: "Receive",
  "store-pickup": "Store pickup",
} as const;

type RiderRideAlertDetail = {
  order: DeliveryOrder;
};

export function RiderRideAlertOverlay() {
  const [alert, setAlert] = useState<DeliveryOrder | null>(null);

  const dismiss = useCallback(() => {
    stopRiderAlarm();
    setAlert(null);
  }, []);

  useEffect(() => {
    function onNewRide(event: Event) {
      const detail = (event as CustomEvent<RiderRideAlertDetail>).detail;
      if (!detail?.order) return;
      setAlert(detail.order);
    }

    window.addEventListener("cityrun:rider-new-ride", onNewRide);
    return () => window.removeEventListener("cityrun:rider-new-ride", onNewRide);
  }, []);

  useEffect(() => {
    if (!alert) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") dismiss();
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [alert, dismiss]);

  if (!alert) return null;

  return (
    <div
      className="fixed inset-0 z-[200000] flex items-end justify-center bg-black/85 p-4 sm:items-center"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="rider-ride-alert-title"
    >
      <div className="rider-ride-alert-pulse w-full max-w-md overflow-hidden rounded-3xl border-2 border-accent bg-[#0b1424] shadow-[0_0_60px_rgba(52,120,246,0.45)]">
        <div className="bg-accent px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-2 ring-white/25">
                <BellRing className="h-6 w-6 animate-pulse text-white" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-white/80">
                  New ride request
                </p>
                <p id="rider-ride-alert-title" className="text-xl font-black text-white">
                  Accept now
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={dismiss}
              className="rounded-xl p-2 text-white/70 hover:bg-white/10"
              aria-label="Dismiss alert"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="space-y-4 px-5 py-5">
          <div>
            <p className="text-[0.65rem] font-bold uppercase tracking-wide text-accent">
              {kindLabels[alert.kind]} · #{alert.id.slice(0, 8).toUpperCase()}
            </p>
            <p className="mt-2 text-lg font-bold leading-snug text-white">
              {alert.itemDescription}
            </p>
            <p className="mt-1 text-sm text-white/65">{alert.contactName}</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <div className="flex gap-3">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              <div className="min-w-0">
                <p className="text-[0.65rem] font-bold uppercase tracking-wide text-white/45">
                  Pickup
                </p>
                <p className="mt-1 text-sm font-medium leading-snug text-white">
                  {alert.pickup.formatted}
                </p>
              </div>
            </div>
            <div className="mt-3 flex gap-3 border-t border-white/8 pt-3">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
              <div className="min-w-0">
                <p className="text-[0.65rem] font-bold uppercase tracking-wide text-white/45">
                  Dropoff
                </p>
                <p className="mt-1 text-sm font-medium leading-snug text-white">
                  {alert.dropoff.formatted}
                </p>
              </div>
            </div>
          </div>

          <Link
            href="/cityrun/rider"
            onClick={dismiss}
            className="block w-full rounded-2xl bg-accent py-4 text-center text-base font-black text-white shadow-[0_12px_32px_-8px_rgb(52_120_246/0.65)]"
          >
            View & accept ride
          </Link>
          <button
            type="button"
            onClick={dismiss}
            className="w-full rounded-2xl border border-white/12 py-3 text-sm font-semibold text-white/60"
          >
            Dismiss alarm
          </button>
        </div>
      </div>
    </div>
  );
}
