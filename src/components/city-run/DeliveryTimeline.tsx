"use client";

import type { LucideIcon } from "lucide-react";
import {
  CircleCheck,
  ClipboardList,
  MapPin,
  Navigation,
  PackageCheck,
  Truck,
  UserCheck,
} from "lucide-react";
import type { DeliveryOrderStatus } from "@/lib/city-run/types";
import {
  deliveryTimeline,
  getTimelineProgress,
  getStatusStep,
} from "@/lib/city-run/status-config";

type DeliveryTimelineProps = {
  status: DeliveryOrderStatus;
  riderName?: string;
};

const stepIcons: Partial<Record<DeliveryOrderStatus, LucideIcon>> = {
  pending: ClipboardList,
  rider_assigned: UserCheck,
  en_route_pickup: Navigation,
  picked_up: PackageCheck,
  in_transit: Truck,
  arrived_at_dropoff: MapPin,
  delivered: CircleCheck,
};

export function DeliveryTimeline({ status, riderName }: DeliveryTimelineProps) {
  const currentIndex = getTimelineProgress(status);
  const currentStep = getStatusStep(status);
  const totalSteps = deliveryTimeline.length - 1;
  const progressPercent =
    status === "delivered"
      ? 100
      : Math.round((currentIndex / totalSteps) * 100);

  if (status === "cancelled") {
    return (
      <div className="cr-glass-card rounded-2xl border border-red-400/30 bg-red-500/10 px-5 py-4">
        <p className="cr-text-label text-sm font-semibold text-red-200">
          This delivery was cancelled.
        </p>
      </div>
    );
  }

  const visibleSteps = deliveryTimeline.filter(
    (step) => step.status !== "pending" || currentIndex === 0,
  );

  return (
    <div className="cr-glass-card cr-glow-ring overflow-hidden rounded-2xl">
      <div className="border-b border-white/10 px-5 py-4">
        {status === "delivered" ? (
          <p className="cr-text-label text-sm font-semibold text-emerald-300">
            Your delivery is complete. Thank you for using City Run.
          </p>
        ) : (
          <>
            <p className="cr-text-body text-sm leading-relaxed">
              {currentStep?.customerDetail}
            </p>
            {riderName && currentIndex >= 1 && (
              <p className="cr-text-label mt-2 text-sm font-semibold">
                {riderName} is your rider.
              </p>
            )}
          </>
        )}

        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="cr-text-muted font-medium">Progress</span>
            <span className="cr-text-label font-bold">{progressPercent}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent to-accent-light transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      <ol className="px-5 py-4">
        {visibleSteps.map((step, index) => {
          const stepIndex = deliveryTimeline.findIndex(
            (item) => item.status === step.status,
          );
          const done = stepIndex < currentIndex || status === "delivered";
          const active = step.status === status;
          const upcoming = !done && !active;
          const Icon = stepIcons[step.status] ?? ClipboardList;

          return (
            <li key={step.status} className="flex gap-4">
              <div className="flex flex-col items-center">
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors ${
                    done
                      ? "border-emerald-400/40 bg-emerald-500 text-white shadow-[0_0_16px_rgb(16_185_129/0.35)]"
                      : active
                        ? "border-accent/50 bg-accent text-white shadow-[0_0_20px_var(--cr-glow)]"
                        : "border-white/15 bg-white/8 text-white/75"
                  }`}
                >
                  {done ? (
                    <CircleCheck className="h-4 w-4" strokeWidth={2.5} />
                  ) : (
                    <Icon className="h-4 w-4" strokeWidth={2.25} />
                  )}
                </span>
                {index < visibleSteps.length - 1 && (
                  <span
                    className={`my-1.5 w-0.5 flex-1 min-h-[1.5rem] rounded-full ${
                      done
                        ? "bg-gradient-to-b from-emerald-400 to-emerald-500/40"
                        : active
                          ? "bg-gradient-to-b from-accent to-white/10"
                          : "bg-white/15"
                    }`}
                  />
                )}
              </div>

              <div className={`min-w-0 flex-1 ${index < visibleSteps.length - 1 ? "pb-5" : "pb-1"}`}>
                <p
                  className={`text-sm font-semibold leading-snug ${
                    active
                      ? "cr-text-headline text-base"
                      : done
                        ? "cr-text-label"
                        : "cr-text-muted"
                  }`}
                >
                  {step.customerLabel}
                </p>

                {active && (
                  <p className="cr-text-muted mt-1 text-xs font-medium">
                    In progress · updated just now
                  </p>
                )}

                {done && !active && (
                  <p className="cr-text-muted mt-1 text-xs">Completed</p>
                )}

                {upcoming && (
                  <p className="cr-text-muted mt-1 text-xs">Up next</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
