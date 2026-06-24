"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Hash,
  MapPin,
  Package,
} from "lucide-react";
import { CityRunShell } from "@/components/city-run/CityRunShell";
import { DeliveryLiveMapSection } from "@/components/city-run/DeliveryLiveMapSection";
import { DeliveryTimeline } from "@/components/city-run/DeliveryTimeline";
import { RiderContactCard } from "@/components/city-run/RiderContactCard";
import { useLiveOrderTracking } from "@/lib/city-run/use-live-order-tracking";
import {
  customerStatusLabels,
  getStatusStep,
  isActiveDelivery,
} from "@/lib/city-run/status-config";
import type { DeliveryOrderStatus } from "@/lib/city-run/types";

export function OrderTracking({ orderId }: { orderId: string }) {
  const { order, loading } = useLiveOrderTracking(orderId);
  const [statusFlash, setStatusFlash] = useState("");
  const prevStatus = useRef<DeliveryOrderStatus | null>(null);

  useEffect(() => {
    if (!order) return;
    if (prevStatus.current && prevStatus.current !== order.status) {
      setStatusFlash(customerStatusLabels[order.status]);
      window.setTimeout(() => setStatusFlash(""), 5000);
    }
    prevStatus.current = order.status;
  }, [order?.status, order]);

  const currentStep = order ? getStatusStep(order.status) : undefined;
  const isLive = order ? isActiveDelivery(order.status) : false;

  return (
    <CityRunShell title="Track delivery" backHref="/cityrun/account">
      <div className="cr-mesh-page px-4 py-5 pb-10">
        {loading && (
          <div className="space-y-4">
            <div className="cr-glass-card h-36 animate-pulse rounded-2xl" />
            <div className="cr-glass-card h-72 animate-pulse rounded-2xl" />
            <div className="cr-glass-card h-48 animate-pulse rounded-2xl" />
          </div>
        )}

        {!loading && !order && (
          <div className="cr-glass-card rounded-2xl px-5 py-8 text-center">
            <p className="cr-text-label text-base font-semibold">Order not found</p>
            <p className="cr-text-muted mt-2 text-sm">
              This delivery may have expired or the link is incorrect.
            </p>
            <Link
              href="/cityrun/account"
              className="cr-text-label mt-5 inline-flex items-center gap-2 text-sm font-bold text-accent"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to my orders
            </Link>
          </div>
        )}

        {order && (
          <div className="space-y-5">
            {statusFlash && (
              <div className="rounded-2xl border border-emerald-400/35 bg-emerald-500/15 px-4 py-3 shadow-[0_0_24px_rgb(16_185_129/0.15)]">
                <p className="cr-text-label text-sm font-bold text-emerald-200">
                  Update: {statusFlash}
                </p>
              </div>
            )}

            <DeliveryLiveMapSection
              order={order}
              mapClassName="cr-glow-ring"
              waitingClassName="cr-glass-card cr-text-muted rounded-2xl px-4 py-3 text-sm"
              waitingMessage="Waiting for your rider's live GPS. They need to allow location on their phone while delivering your order."
            />

            <section className="cr-glass-card cr-glow-ring overflow-hidden rounded-2xl">
              <div className="bg-gradient-to-br from-accent/25 via-accent/5 to-transparent px-5 py-6">
                <div className="flex items-center gap-2">
                  {isLive && (
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-60" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
                    </span>
                  )}
                  <span className="cr-text-label text-xs font-bold uppercase tracking-[0.14em]">
                    {isLive ? "Live delivery" : "Delivery status"}
                  </span>
                </div>

                <h2 className="cr-text-headline mt-3 text-2xl font-bold leading-tight">
                  {customerStatusLabels[order.status]}
                </h2>

                {currentStep && order.status !== "delivered" && (
                  <p className="cr-text-body mt-2 max-w-sm text-sm leading-relaxed">
                    {currentStep.customerDetail}
                  </p>
                )}

                {order.status === "delivered" && (
                  <p className="cr-text-body mt-2 text-sm">
                    Your items have been delivered successfully.
                  </p>
                )}
              </div>
            </section>

            {order.riderName && order.status !== "pending" && order.status !== "cancelled" && (
              <RiderContactCard
                name={order.riderName}
                phone={order.riderPhone}
              />
            )}

            <DeliveryTimeline status={order.status} riderName={order.riderName} />

            <section className="cr-glass-card cr-glow-ring overflow-hidden rounded-2xl">
              <div className="border-b border-white/10 px-5 py-4">
                <h3 className="cr-text-label text-sm font-bold uppercase tracking-wide">
                  Delivery details
                </h3>
              </div>
              <div className="divide-y divide-white/10">
                <DetailRow
                  icon={MapPin}
                  label="Pickup"
                  value={order.pickup.formatted}
                />
                <DetailRow
                  icon={MapPin}
                  label="Dropoff"
                  value={order.dropoff.formatted}
                />
                <DetailRow
                  icon={Package}
                  label="Item"
                  value={order.itemDescription}
                />
                <DetailRow
                  icon={Hash}
                  label="Reference"
                  value={order.id.slice(0, 8).toUpperCase()}
                />
              </div>
            </section>

            {order.itemPhotoUrl && (
              <section className="space-y-3">
                <h3 className="cr-text-label px-1 text-sm font-bold uppercase tracking-wide">
                  Item photo
                </h3>
                <div className="cr-glass-card relative aspect-video overflow-hidden rounded-2xl">
                  <Image
                    src={order.itemPhotoUrl}
                    alt="Item photo"
                    fill
                    className="object-cover"
                    sizes="400px"
                    unoptimized
                  />
                </div>
              </section>
            )}

            <Link
              href="/cityrun/account"
              className="cr-text-label block rounded-2xl border border-white/15 bg-white/8 py-3.5 text-center text-sm font-bold transition-colors hover:bg-white/12"
            >
              Back to my orders
            </Link>
          </div>
        )}
      </div>
    </CityRunShell>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof MapPin;
  label: string;
  value: string;
}) {
  return (
    <div className="flex gap-3 px-5 py-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
        <Icon className="h-4 w-4 text-white" strokeWidth={2.25} />
      </div>
      <div className="min-w-0">
        <p className="cr-text-muted text-xs font-semibold uppercase tracking-wide">
          {label}
        </p>
        <p className="cr-text-label mt-1 text-sm font-medium leading-snug">{value}</p>
      </div>
    </div>
  );
}
