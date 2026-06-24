"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Bike, Clock, MapPin, Radio } from "lucide-react";
import { AdminShell } from "@/components/city-run/admin/AdminShell";
import { RidersFleetMap } from "@/components/city-run/admin/RidersFleetMap";
import {
  AdminAlert,
  AdminCard,
  AdminEmpty,
  AdminSkeleton,
} from "@/components/city-run/admin/AdminUI";
import { formatSecondsAgo } from "@/lib/city-run/format-distance";
import { customerStatusLabels } from "@/lib/city-run/status-config";
import type { RiderFleetEntry } from "@/lib/city-run/types";

type FleetResponse = {
  riders: RiderFleetEntry[];
  withGps: RiderFleetEntry[];
  onDelivery: number;
  available: number;
  liveCount: number;
  updatedAt: string;
};

const POLL_MS = 4_000;

export function AdminRidersLivePanel() {
  const [fleet, setFleet] = useState<FleetResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedRiderId, setSelectedRiderId] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/cityrun/admin/riders/locations", {
        cache: "no-store",
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Could not load rider locations");
      }
      setFleet(await res.json());
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load rider locations");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const interval = window.setInterval(load, POLL_MS);
    return () => window.clearInterval(interval);
  }, [load]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const riders = fleet?.riders ?? [];
  const withGps = useMemo(
    () => riders.filter((r) => r.hasGps && r.location),
    [riders],
  );

  return (
    <AdminShell title="Live riders">
      {error && <AdminAlert tone="error">{error}</AdminAlert>}

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface)] px-2 py-1 text-[11px] font-medium">
          <Bike className="h-3.5 w-3.5 text-accent" />
          {fleet?.liveCount ?? 0} on map
        </span>
        <span className="admin-subtitle text-[11px]">
          {fleet?.available ?? 0} available · {fleet?.onDelivery ?? 0} on delivery
        </span>
        {fleet?.updatedAt && (
          <span className="admin-subtitle inline-flex items-center gap-1 text-[11px]">
            <Radio className="h-3 w-3" />
            Refreshed {formatSecondsAgo(Math.max(0, Math.floor((now - new Date(fleet.updatedAt).getTime()) / 1000)))}
          </span>
        )}
      </div>

      {loading && !fleet ? (
        <div className="space-y-2">
          <AdminSkeleton className="h-[min(58vh,480px)]" />
          <AdminSkeleton className="h-16" />
        </div>
      ) : (
        <div className="grid gap-3 xl:grid-cols-[1fr_240px]">
          <RidersFleetMap
            riders={riders}
            selectedRiderId={selectedRiderId}
            onSelectRider={setSelectedRiderId}
          />

          <aside className="space-y-3">
            <AdminCard>
              <p className="admin-stat-label mb-2 text-[10px] font-medium uppercase tracking-wide">
                Riders ({riders.length})
              </p>

              {riders.length === 0 ? (
                <AdminEmpty title="No riders sharing location right now" />
              ) : (
                <ul className="max-h-[min(58vh,480px)] space-y-1.5 overflow-y-auto">
                  {riders.map((rider) => {
                    const gpsAge = rider.hasGps
                      ? Math.max(
                          0,
                          Math.floor(
                            (now - new Date(rider.updatedAt).getTime()) / 1000,
                          ),
                        )
                      : null;
                    const selected = selectedRiderId === rider.riderId;

                    return (
                      <li key={rider.riderId}>
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedRiderId(
                              selected ? null : rider.riderId,
                            )
                          }
                          className={`w-full rounded-md border px-2 py-2 text-left transition-colors ${
                            selected
                              ? "border-accent/40 bg-accent/10"
                              : "border-[var(--admin-border)] bg-[var(--admin-surface-muted)] hover:border-accent/25"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="admin-title flex items-center gap-1 text-xs font-medium">
                                <Bike className="h-3.5 w-3.5 shrink-0 text-accent" />
                                {rider.riderName}
                              </p>
                              <p className="admin-subtitle mt-0.5 text-xs">
                                {rider.onDelivery && rider.orderStatus
                                  ? customerStatusLabels[rider.orderStatus]
                                  : "Available"}
                              </p>
                            </div>
                            {rider.hasGps ? (
                              <span className="relative flex h-2 w-2 shrink-0 mt-1">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
                              </span>
                            ) : (
                              <span className="admin-subtitle mt-0.5 text-[0.6rem] uppercase">
                                No GPS
                              </span>
                            )}
                          </div>
                          {rider.hasGps && gpsAge !== null && (
                            <p className="admin-subtitle mt-1.5 flex items-center gap-1 text-[0.65rem]">
                              <Clock className="h-3 w-3" />
                              Updated {formatSecondsAgo(gpsAge)}
                            </p>
                          )}
                          {rider.onDelivery && rider.orderId ? (
                            <Link
                              href={`/cityrun/admin/orders/${rider.orderId}`}
                              onClick={(e) => e.stopPropagation()}
                              className="admin-subtitle mt-2 inline-flex items-center gap-1 text-[0.65rem] font-semibold text-accent"
                            >
                              <MapPin className="h-3 w-3" />
                              View ride #{rider.orderId.slice(0, 8).toUpperCase()}
                            </Link>
                          ) : (
                            <p className="admin-subtitle mt-2 text-[0.65rem]">
                              Visible on fleet map
                            </p>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </AdminCard>

            {withGps.length === 0 && (
              <AdminAlert tone="info">
                No riders are sharing GPS right now. Riders must enable location
                in the rider app and stay signed in.
              </AdminAlert>
            )}
          </aside>
        </div>
      )}
    </AdminShell>
  );
}
