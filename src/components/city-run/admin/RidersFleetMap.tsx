"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  createDeliveryMap,
  getGoogleMaps,
  hasGoogleMaps,
  lagosLocationBias,
  loadGoogleMapsScript,
  riderMarkerIcon,
  RIDER_MARKER_OPTIONS,
  type GoogleInfoWindow,
  type GoogleMap,
  type GoogleMarker,
} from "@/lib/city-run/google-maps";
import { buildOpenStreetMapEmbedUrl } from "@/lib/city-run/map-fallback";
import type { RiderFleetEntry } from "@/lib/city-run/types";

type RidersFleetMapProps = {
  riders: RiderFleetEntry[];
  selectedRiderId?: string | null;
  onSelectRider?: (riderId: string) => void;
  className?: string;
};

function infoWindowHtml(rider: RiderFleetEntry) {
  const orderLine = rider.orderId
    ? `<p style="margin:6px 0 0;font-size:12px;color:#475569;">Order #${rider.orderId.slice(0, 8).toUpperCase()}</p>`
    : `<p style="margin:6px 0 0;font-size:12px;color:#475569;">Available — not on a delivery</p>`;
  return `
    <div style="font-family:system-ui,sans-serif;padding:4px 2px;color:#0f172a;">
      <strong style="font-size:14px;">${rider.riderName}</strong>
      ${orderLine}
    </div>
  `;
}

export function RidersFleetMap({
  riders,
  selectedRiderId,
  onSelectRider,
  className = "",
}: RidersFleetMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<GoogleMap | null>(null);
  const markersRef = useRef<Map<string, GoogleMarker>>(new Map());
  const infoWindowRef = useRef<GoogleInfoWindow | null>(null);
  const ridersRef = useRef(riders);
  const gpsCountRef = useRef(0);
  const framedRef = useRef(false);
  const [ready, setReady] = useState(false);
  const [useFallbackMap, setUseFallbackMap] = useState(!hasGoogleMaps);

  ridersRef.current = riders;

  const withGps = riders.filter((r) => r.hasGps && r.location);

  useEffect(() => {
    if (!hasGoogleMaps) return;

    function onAuthFailure() {
      setUseFallbackMap(true);
      setReady(false);
    }

    window.addEventListener("cityrun:maps-auth-failure", onAuthFailure);
    loadGoogleMapsScript()
      .then(() => setReady(true))
      .catch(() => setUseFallbackMap(true));

    return () => window.removeEventListener("cityrun:maps-auth-failure", onAuthFailure);
  }, []);

  useEffect(() => {
    if (!ready || useFallbackMap || !containerRef.current) return;

    const maps = getGoogleMaps();
    if (!maps) return;

    if (!mapRef.current) {
      mapRef.current = createDeliveryMap(
        containerRef.current,
        { lat: lagosLocationBias.lat, lng: lagosLocationBias.lng },
        12,
      );
      infoWindowRef.current = new maps.InfoWindow({ maxWidth: 240 });
    }

    const map = mapRef.current;
    const bikeIcon = riderMarkerIcon(maps);
    const seen = new Set<string>();

    for (const rider of withGps) {
      if (!rider.location) continue;
      seen.add(rider.riderId);

      let marker = markersRef.current.get(rider.riderId);

      if (marker) {
        marker.setPosition(rider.location);
        marker.setIcon(bikeIcon);
        marker.setZIndex(selectedRiderId === rider.riderId ? 999 : 100);
      } else {
        const riderId = rider.riderId;
        const newMarker = new maps.Marker({
          map,
          position: rider.location,
          icon: bikeIcon,
          title: `${rider.riderName} · live`,
          zIndex: selectedRiderId === rider.riderId ? 999 : 100,
          optimized: RIDER_MARKER_OPTIONS.optimized,
        });
        markersRef.current.set(riderId, newMarker);

        maps.event.addListener(newMarker, "click", () => {
          onSelectRider?.(riderId);
          const latest = ridersRef.current.find((r) => r.riderId === riderId);
          if (!latest || !infoWindowRef.current) return;
          infoWindowRef.current.setContent(infoWindowHtml(latest));
          infoWindowRef.current.open(map, newMarker);
        });
      }
    }

    for (const [riderId, marker] of markersRef.current) {
      if (!seen.has(riderId)) {
        marker.setMap(null);
        markersRef.current.delete(riderId);
      }
    }

    if (withGps.length === 0) {
      map.setCenter({ lat: lagosLocationBias.lat, lng: lagosLocationBias.lng });
      map.setZoom(12);
      framedRef.current = false;
      gpsCountRef.current = 0;
      return;
    }

    if (!framedRef.current || withGps.length !== gpsCountRef.current) {
      const bounds = new maps.LatLngBounds();
      for (const rider of withGps) {
        if (rider.location) bounds.extend(rider.location);
      }
      map.fitBounds(bounds, { top: 48, right: 48, bottom: 48, left: 48 });
      framedRef.current = true;
      gpsCountRef.current = withGps.length;
    }

    if (selectedRiderId) {
      const selected = withGps.find((r) => r.riderId === selectedRiderId);
      const marker = markersRef.current.get(selectedRiderId);
      if (selected?.location && marker && infoWindowRef.current) {
        map.panTo(selected.location);
        infoWindowRef.current.setContent(infoWindowHtml(selected));
        infoWindowRef.current.open(map, marker);
      }
    }
  }, [ready, useFallbackMap, riders, selectedRiderId, onSelectRider, withGps.length]);

  const fallbackUrl = buildOpenStreetMapEmbedUrl(
    withGps.map((r) => r.location!),
    {
      focus: withGps[0]?.location,
      pad: withGps.length > 1 ? 0.015 : 0.008,
    },
  );

  if (useFallbackMap) {
    return (
      <div className={`overflow-hidden rounded-xl border border-[var(--admin-border)] ${className}`}>
        <div className="border-b border-amber-400/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
          Google Maps unavailable — OpenStreetMap fallback (no bike markers).{" "}
          <Link href="/cityrun/map-check" className="font-semibold underline">
            Run map check
          </Link>
        </div>
        <iframe
          title="Riders fleet map"
          src={fallbackUrl}
          className="h-[min(58vh,480px)] w-full border-0 bg-[var(--admin-surface)]"
          loading="lazy"
        />
        <p className="admin-subtitle border-t border-[var(--admin-border)] px-3 py-2 text-[0.65rem]">
          {withGps.length} rider{withGps.length === 1 ? "" : "s"} on map (OpenStreetMap fallback)
        </p>
      </div>
    );
  }

  return (
    <div className={`overflow-hidden rounded-xl border border-[var(--admin-border)] ${className}`}>
      <div
        ref={containerRef}
        className="h-[min(58vh,480px)] w-full bg-[var(--admin-surface)]"
      />
      <p className="admin-subtitle border-t border-[var(--admin-border)] px-3 py-2 text-[0.65rem]">
        {withGps.length} bicycle marker{withGps.length === 1 ? "" : "s"} on map
      </p>
    </div>
  );
}
