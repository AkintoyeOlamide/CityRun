"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  buildDisplayRoutePath,
  fetchDrivingRoute,
  shouldRefetchDrivingRoute,
} from "@/lib/city-run/directions-route";
import {
  createDeliveryMap,
  destinationMarkerIcon,
  getGoogleMaps,
  hasGoogleMaps,
  hasGoogleMapsAsync,
  loadGoogleMapsScript,
  riderMarkerIcon,
  RIDER_MARKER_OPTIONS,
  routeLineOptions,
  type GoogleMap,
  type GoogleMarker,
  type GooglePolyline,
} from "@/lib/city-run/google-maps";
import { buildOpenStreetMapEmbedUrl } from "@/lib/city-run/map-fallback";
import {
  getActiveDestination,
  isLiveRiderTracking,
  padForMapPoints,
  TRACKING_FOLLOW_ZOOM,
  TRACKING_MAX_ZOOM,
  TRACKING_MIN_ZOOM,
  type LatLng,
  zoomForDistance,
} from "@/lib/city-run/map-tracking";
import { distanceMeters } from "@/lib/city-run/rider-geolocation";
import type { DeliveryOrderStatus } from "@/lib/city-run/types";
import { mapTrackingStatuses } from "@/lib/city-run/status-config";

const TO_PICKUP: DeliveryOrderStatus[] = ["rider_assigned", "en_route_pickup"];
const TO_DROPOFF: DeliveryOrderStatus[] = [
  "picked_up",
  "in_transit",
  "arrived_at_dropoff",
];

type DeliveryMapProps = {
  pickup?: LatLng;
  dropoff?: LatLng;
  rider?: LatLng;
  status: DeliveryOrderStatus;
  className?: string;
  variant?: "default" | "live" | "compact" | "preview";
  /** Taller preview for home active-trip layout */
  previewSize?: "default" | "tall";
};

const TRACKING_STATUSES = mapTrackingStatuses;

function clampTrackingZoom(map: GoogleMap, maps: NonNullable<ReturnType<typeof getGoogleMaps>>) {
  maps.event.addListenerOnce(map, "idle", () => {
    const zoom = map.getZoom();
    if (zoom > TRACKING_MAX_ZOOM) map.setZoom(TRACKING_MAX_ZOOM);
    if (zoom < TRACKING_MIN_ZOOM) map.setZoom(TRACKING_MIN_ZOOM);
  });
}

function frameLiveTracking(
  map: GoogleMap,
  maps: NonNullable<ReturnType<typeof getGoogleMaps>>,
  rider: LatLng,
  destination?: LatLng,
  preview = false,
) {
  const padding = preview
    ? { top: 56, right: 56, bottom: 56, left: 56 }
    : { top: 72, right: 40, bottom: 72, left: 40 };

  if (destination) {
    const bounds = new maps.LatLngBounds();
    bounds.extend(rider);
    bounds.extend(destination);
    map.fitBounds(bounds, padding);
    clampTrackingZoom(map, maps);

    const span = distanceMeters(rider, destination);
    maps.event.addListenerOnce(map, "idle", () => {
      const targetZoom = preview
        ? Math.min(zoomForDistance(span), 16)
        : zoomForDistance(span);
      if (map.getZoom() > targetZoom) map.setZoom(targetZoom);
    });
    return;
  }

  map.setZoom(preview ? 16 : TRACKING_FOLLOW_ZOOM);
  map.panTo(rider);
}

export function DeliveryMap({
  pickup,
  dropoff,
  rider,
  status,
  className = "",
  variant = "default",
  previewSize = "default",
}: DeliveryMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<GoogleMap | null>(null);
  const markersRef = useRef<{
    pickup?: GoogleMarker;
    dropoff?: GoogleMarker;
    rider?: GoogleMarker;
  }>({});
  const routeLineRef = useRef<GooglePolyline | null>(null);
  const routeGlowRef = useRef<GooglePolyline | null>(null);
  const lastRiderRef = useRef<LatLng | null>(null);
  const lastRouteOriginRef = useRef<LatLng | null>(null);
  const lastRouteDestinationRef = useRef<LatLng | null>(null);
  const [ready, setReady] = useState(false);
  const [useFallbackMap, setUseFallbackMap] = useState(false);
  const [mapsBootError, setMapsBootError] = useState<"missing" | "auth" | null>(
    null,
  );
  const [drivingRoutePath, setDrivingRoutePath] = useState<LatLng[] | null>(null);

  const showRider = TRACKING_STATUSES.includes(status) && rider;
  const liveTracking = isLiveRiderTracking(status, rider);
  const activeDestination = getActiveDestination(status, pickup, dropoff);
  const isLiveVariant = variant === "live";
  const isCompactVariant = variant === "compact";
  const isPreviewVariant = variant === "preview";
  const interactive = !isCompactVariant && !isPreviewVariant;
  const minimalLiveView =
    liveTracking && (isPreviewVariant || isLiveVariant);
  const riderIconSize = isPreviewVariant ? 28 : isLiveVariant ? 34 : 36;

  const fallbackConfig = useMemo(() => {
    const focus = liveTracking && rider ? rider : activeDestination ?? pickup ?? dropoff;
    const points: LatLng[] = [];
    if (liveTracking && rider && activeDestination) {
      points.push(rider, activeDestination);
    } else {
      if (pickup) points.push(pickup);
      if (dropoff) points.push(dropoff);
      if (showRider && rider) points.push(rider);
    }
    return {
      points,
      focus,
      pad: padForMapPoints(points.length ? points : focus ? [focus] : []),
    };
  }, [liveTracking, rider, activeDestination, pickup, dropoff, showRider]);

  const fallbackMapUrl = useMemo(
    () =>
      buildOpenStreetMapEmbedUrl(fallbackConfig.points, {
        focus: fallbackConfig.focus,
        pad: fallbackConfig.pad,
      }),
    [fallbackConfig],
  );

  const shouldDrawRoute = Boolean(
    rider && activeDestination && (liveTracking || showRider),
  );

  const riderLat = rider?.lat ?? null;
  const riderLng = rider?.lng ?? null;
  const destinationLat = activeDestination?.lat ?? null;
  const destinationLng = activeDestination?.lng ?? null;

  const displayRoutePath = useMemo(() => {
    if (!shouldDrawRoute || !rider || !activeDestination) return [];
    return buildDisplayRoutePath(drivingRoutePath, rider, activeDestination);
  }, [
    shouldDrawRoute,
    rider,
    activeDestination,
    drivingRoutePath,
    riderLat,
    riderLng,
    destinationLat,
    destinationLng,
  ]);

  useEffect(() => {
    if (
      !ready ||
      useFallbackMap ||
      !shouldDrawRoute ||
      riderLat === null ||
      riderLng === null ||
      destinationLat === null ||
      destinationLng === null
    ) {
      setDrivingRoutePath(null);
      lastRouteOriginRef.current = null;
      lastRouteDestinationRef.current = null;
      return;
    }

    const origin = { lat: riderLat, lng: riderLng };
    const destination = { lat: destinationLat, lng: destinationLng };

    if (
      !shouldRefetchDrivingRoute(
        lastRouteOriginRef.current,
        lastRouteDestinationRef.current,
        origin,
        destination,
      )
    ) {
      return;
    }

    let cancelled = false;
    lastRouteOriginRef.current = origin;
    lastRouteDestinationRef.current = destination;

    void fetchDrivingRoute(origin, destination).then((path) => {
      if (!cancelled) setDrivingRoutePath(path);
    });

    return () => {
      cancelled = true;
    };
  }, [
    ready,
    useFallbackMap,
    shouldDrawRoute,
    riderLat,
    riderLng,
    destinationLat,
    destinationLng,
  ]);

  useEffect(() => {
    if (!hasGoogleMaps) {
      void hasGoogleMapsAsync()
        .then((configured) => {
          if (!configured) {
            setUseFallbackMap(true);
            setMapsBootError("missing");
          }
        })
        .catch(() => {
          setUseFallbackMap(true);
          setMapsBootError("missing");
        });
    }

    function onAuthFailure() {
      setUseFallbackMap(true);
      setMapsBootError("auth");
      setReady(false);
    }

    window.addEventListener("cityrun:maps-auth-failure", onAuthFailure);

    loadGoogleMapsScript()
      .then(() => setReady(true))
      .catch((error) => {
        setUseFallbackMap(true);
        setMapsBootError(
          error instanceof Error && error.name === "MapsAuthError"
            ? "auth"
            : "missing",
        );
      });

    return () => window.removeEventListener("cityrun:maps-auth-failure", onAuthFailure);
  }, []);

  useEffect(() => {
    if (!ready || useFallbackMap || !containerRef.current) return;

    const mapsApi = getGoogleMaps();
    if (!mapsApi) return;

    const maps = mapsApi;
    const { Marker, Polyline } = maps;

    const initialCenter =
      (liveTracking && rider) ||
      activeDestination ||
      dropoff ||
      pickup || { lat: 6.5244, lng: 3.3792 };

    if (!mapRef.current) {
      mapRef.current = createDeliveryMap(
        containerRef.current,
        initialCenter,
        liveTracking ? TRACKING_FOLLOW_ZOOM : isPreviewVariant ? 15 : isCompactVariant ? 15 : 16,
        { interactive },
      );
    }

    const map = mapRef.current;

    function upsertMarker(
      key: "pickup" | "dropoff" | "rider",
      position: LatLng | undefined,
      icon: object,
      zIndex: number,
    ) {
      if (!position) {
        markersRef.current[key]?.setMap(null);
        markersRef.current[key] = undefined;
        return;
      }

      const isRider = key === "rider";

      if (markersRef.current[key]) {
        markersRef.current[key]!.setPosition(position);
        markersRef.current[key]!.setIcon(icon);
        markersRef.current[key]!.setZIndex(zIndex);
      } else {
        markersRef.current[key] = new Marker({
          map,
          position,
          icon,
          zIndex,
          optimized: isRider ? RIDER_MARKER_OPTIONS.optimized : true,
        });
      }
    }

    const showPickupPin = pickup && !minimalLiveView;
    const showDropoffPin = dropoff && !minimalLiveView;

    if (showPickupPin) {
      upsertMarker(
        "pickup",
        pickup,
        destinationMarkerIcon(maps, "#22c55e"),
        20,
      );
    } else {
      markersRef.current.pickup?.setMap(null);
      markersRef.current.pickup = undefined;
    }

    if (showDropoffPin) {
      upsertMarker(
        "dropoff",
        dropoff,
        destinationMarkerIcon(maps, "#ef4444"),
        20,
      );
    } else {
      markersRef.current.dropoff?.setMap(null);
      markersRef.current.dropoff = undefined;
    }

    if (minimalLiveView && activeDestination) {
      upsertMarker(
        "dropoff",
        activeDestination,
        destinationMarkerIcon(
          maps,
          TO_PICKUP.includes(status) ? "#22c55e" : "#3478f6",
        ),
        20,
      );
    }

    if (showRider && rider) {
      upsertMarker("rider", rider, riderMarkerIcon(maps, riderIconSize), 999);
    } else {
      markersRef.current.rider?.setMap(null);
      markersRef.current.rider = undefined;
    }

    const routePath = displayRoutePath.length >= 2 ? displayRoutePath : [];

    if (routePath.length >= 2) {
      const simpleLine = isCompactVariant;
      const roadPath = routePath.length > 2;
      const glowOpts = routeLineOptions(maps, true, simpleLine, roadPath);
      const lineOpts = routeLineOptions(maps, false, simpleLine, roadPath);

      if (routeGlowRef.current) {
        routeGlowRef.current.setPath(routePath);
      } else {
        routeGlowRef.current = new Polyline({
          map,
          path: routePath,
          ...glowOpts,
        });
      }

      if (routeLineRef.current) {
        routeLineRef.current.setPath(routePath);
      } else {
        routeLineRef.current = new Polyline({
          map,
          path: routePath,
          ...lineOpts,
        });
      }
    } else {
      routeGlowRef.current?.setMap(null);
      routeGlowRef.current = null;
      routeLineRef.current?.setMap(null);
      routeLineRef.current = null;
    }

    const riderMoved =
      rider &&
      lastRiderRef.current &&
      distanceMeters(lastRiderRef.current, rider) > 12;

    if (liveTracking && rider) {
      if (!lastRiderRef.current || riderMoved) {
        frameLiveTracking(
          map,
          maps,
          rider,
          activeDestination,
          isPreviewVariant || isLiveVariant,
        );
      } else {
        map.panTo(rider);
      }
      lastRiderRef.current = rider;
    } else if ((isPreviewVariant || isLiveVariant) && activeDestination) {
      map.setZoom(15);
      map.panTo(activeDestination);
      lastRiderRef.current = null;
    } else if (activeDestination) {
      map.setZoom(16);
      map.panTo(activeDestination);
      lastRiderRef.current = null;
    } else if (pickup && dropoff) {
      const bounds = new maps.LatLngBounds();
      bounds.extend(pickup);
      bounds.extend(dropoff);
      map.fitBounds(bounds, { top: 72, right: 40, bottom: 72, left: 40 });
      clampTrackingZoom(map, maps);
    }

    if (liveTracking && rider && !minimalLiveView) {
      const hidePickup = TO_DROPOFF.includes(status);
      const hideDropoff = TO_PICKUP.includes(status);
      if (hidePickup) markersRef.current.pickup?.setMap(null);
      else if (pickup) markersRef.current.pickup?.setMap(map);
      if (hideDropoff) markersRef.current.dropoff?.setMap(null);
      else if (dropoff) markersRef.current.dropoff?.setMap(map);
    }
  }, [
    ready,
    useFallbackMap,
    pickup,
    dropoff,
    rider,
    showRider,
    liveTracking,
    activeDestination,
    status,
    isCompactVariant,
    isPreviewVariant,
    isLiveVariant,
    minimalLiveView,
    riderIconSize,
    interactive,
    shouldDrawRoute,
    displayRoutePath,
  ]);

  const mapHeightClass = isLiveVariant
    ? "min-h-[52vh] w-full bg-cr-surface"
    : isPreviewVariant
      ? previewSize === "tall"
        ? "h-[calc(100dvh-19rem)] min-h-[52vh] w-full bg-cr-surface"
        : "h-44 w-full bg-cr-surface"
      : isCompactVariant
        ? "h-36 w-full bg-cr-surface"
        : "aspect-[4/3] w-full bg-cr-surface";

  const legend = !isCompactVariant && !isPreviewVariant && !isLiveVariant ? (
    <div className="flex flex-wrap gap-3 border-t border-white/10 bg-cr-surface-muted px-3 py-2.5 text-[0.65rem] text-white/70">
      {pickup && (!liveTracking || TO_PICKUP.includes(status)) && (
        <span>
          <span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-green-500" />
          Pickup
        </span>
      )}
      {dropoff && (!liveTracking || TO_DROPOFF.includes(status)) && (
        <span>
          <span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-red-500" />
          Dropoff
        </span>
      )}
      {showRider && rider && (
        <span className="inline-flex items-center gap-1">
          <BikeLegendIcon />
          Rider
        </span>
      )}
      {liveTracking && (
        <span className="text-accent">Following rider</span>
      )}
    </div>
  ) : null;

  if (useFallbackMap) {
    const customerMessage =
      mapsBootError === "auth"
        ? "Live map is temporarily unavailable on this device. Your rider is still on the way — status updates above stay active."
        : "Map preview — tracking details update automatically above.";

    return (
      <div className={`overflow-hidden rounded-2xl border border-white/10 ${className}`}>
        {!isPreviewVariant && (
          <div className="border-b border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/70">
            {customerMessage}
          </div>
        )}
        <iframe
          title="Delivery map"
          src={fallbackMapUrl}
          className={`${mapHeightClass} border-0`}
          loading="lazy"
        />
        {legend}
      </div>
    );
  }

  if (!ready) {
    return (
      <div className={`overflow-hidden rounded-2xl border border-white/10 ${className}`}>
        <div
          className={`${mapHeightClass} animate-pulse bg-white/[0.06]`}
          aria-label="Loading map"
        />
      </div>
    );
  }

  return (
    <div className={`overflow-hidden rounded-2xl border border-white/10 ${className}`}>
      <div className="relative">
        <div ref={containerRef} className={mapHeightClass} />
        {liveTracking && rider && displayRoutePath.length >= 2 && (
          <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg bg-black/60 px-2.5 py-1.5 text-[0.65rem] font-semibold text-white backdrop-blur-sm">
            Route to {TO_PICKUP.includes(status) ? "pickup" : "destination"}
          </div>
        )}
      </div>
      {legend}
    </div>
  );
}

function BikeLegendIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3 w-3 text-accent" aria-hidden>
      <circle cx="4" cy="11" r="2.5" fill="currentColor" />
      <circle cx="12" cy="11" r="2.5" fill="currentColor" />
      <path
        d="M4 11 L7 6 L10 6 L13 9 L10 11 L7 11 L5.5 9 Z"
        fill="none"
        stroke="white"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
