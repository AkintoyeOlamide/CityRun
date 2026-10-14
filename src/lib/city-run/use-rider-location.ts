"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DeliveryOrder } from "@/lib/city-run/types";
import { isActiveDelivery } from "@/lib/city-run/status-config";
import {
  enableRiderLocationTracking,
  getRiderLocationConsent,
  isGeolocationSupported,
  riderGeolocationRefreshOptions,
  riderGeolocationWatchOptions,
  setRiderLocationConsent,
  shouldSendRiderGps,
  type RiderLocationConsent,
} from "@/lib/city-run/rider-geolocation";

export type RiderTrackingState = {
  consent: RiderLocationConsent;
  tracking: boolean;
  sharing: boolean;
  activeDeliveryCount: number;
  lastSentAt: number | null;
  lastPosition: { lat: number; lng: number } | null;
  gpsAccuracy: number | null;
  error: string | null;
};

const initialState: RiderTrackingState = {
  consent: "unknown",
  tracking: false,
  sharing: false,
  activeDeliveryCount: 0,
  lastSentAt: null,
  lastPosition: null,
  gpsAccuracy: null,
  error: null,
};

export function useRiderLiveTracking() {
  const [state, setState] = useState<RiderTrackingState>(initialState);
  const watchIdRef = useRef<number | null>(null);
  const lastSentRef = useRef(0);
  const lastPositionRef = useRef<{ lat: number; lng: number } | null>(null);
  const lastAccuracyRef = useRef<number | null>(null);
  const activeCountRef = useRef(0);
  const prevActiveCountRef = useRef(0);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const refreshActiveCount = useCallback(async () => {
    const res = await fetch("/api/cityrun/rider/orders?filter=active");
    if (!res.ok) return 0;
    const orders = (await res.json()) as DeliveryOrder[];
    const count = orders.filter((order) => isActiveDelivery(order.status)).length;
    activeCountRef.current = count;
    setState((prev) => ({ ...prev, activeDeliveryCount: count }));
    return count;
  }, []);

  const pushLocation = useCallback(async (lat: number, lng: number, accuracy: number) => {
    const res = await fetch("/api/cityrun/rider/location", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lat, lng, accuracy }),
    });

    if (!res.ok) {
      setState((prev) => ({
        ...prev,
        error: "Could not share your live location.",
      }));
      return false;
    }

    const now = Date.now();
    lastSentRef.current = now;
    lastPositionRef.current = { lat, lng };
    lastAccuracyRef.current = accuracy;

    setState((prev) => ({
      ...prev,
      sharing: true,
      lastSentAt: now,
      lastPosition: { lat, lng },
      gpsAccuracy: accuracy,
      error:
        accuracy > 90
          ? "GPS is weak — move to an open area for better accuracy."
          : null,
    }));
    return true;
  }, []);

  const forcePushLocation = useCallback(async () => {
    if (!isGeolocationSupported()) return false;
    if (getRiderLocationConsent() !== "granted") return false;

    return new Promise<boolean>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude: lat, longitude: lng, accuracy } = position.coords;
          const safeAccuracy = Number.isFinite(accuracy) ? accuracy : 50;
          void pushLocation(lat, lng, safeAccuracy).then(resolve);
        },
        () => resolve(false),
        riderGeolocationRefreshOptions,
      );
    });
  }, [pushLocation]);

  const handlePosition = useCallback(
    (position: GeolocationPosition) => {
      const { latitude: lat, longitude: lng, accuracy } = position.coords;
      const safeAccuracy = Number.isFinite(accuracy) ? accuracy : 999;

      setState((prev) => ({
        ...prev,
        tracking: true,
        lastPosition: { lat, lng },
        gpsAccuracy: safeAccuracy,
      }));

      const shouldSend = shouldSendRiderGps(
        { lat, lng, accuracy: safeAccuracy },
        {
          previous: lastPositionRef.current,
          lastSentAt: lastSentRef.current,
          lastAccuracy: lastAccuracyRef.current,
        },
      );

      if (shouldSend) {
        void pushLocation(lat, lng, safeAccuracy);
      }
    },
    [pushLocation],
  );

  const stopWatch = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    void wakeLockRef.current?.release();
    wakeLockRef.current = null;
    setState((prev) => ({ ...prev, tracking: false, sharing: false }));
  }, []);

  const startWatch = useCallback(() => {
    if (!isGeolocationSupported()) {
      setState((prev) => ({
        ...prev,
        error: "Location is not supported on this device.",
      }));
      return;
    }

    if (watchIdRef.current !== null) return;

    watchIdRef.current = navigator.geolocation.watchPosition(
      handlePosition,
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setRiderLocationConsent("denied");
          setState((prev) => ({
            ...prev,
            consent: "denied",
            tracking: false,
            sharing: false,
            error: "Location access was blocked. Enable it in your browser settings.",
          }));
          stopWatch();
          return;
        }

        setState((prev) => ({
          ...prev,
          error: "Waiting for GPS signal… stay in an open area with location enabled.",
        }));
      },
      riderGeolocationWatchOptions,
    );

    setState((prev) => ({ ...prev, tracking: true, consent: "granted" }));
  }, [handlePosition, stopWatch]);

  const requestLocationAccess = useCallback(async () => {
    setState((prev) => ({ ...prev, error: null }));
    try {
      const position = await enableRiderLocationTracking();
      handlePosition(position);
      startWatch();
      await refreshActiveCount();
      return true;
    } catch {
      setRiderLocationConsent("denied");
      setState((prev) => ({
        ...prev,
        consent: "denied",
        tracking: false,
        error:
          "Location permission is required so customers can track live deliveries.",
      }));
      return false;
    }
  }, [handlePosition, refreshActiveCount, startWatch]);

  useEffect(() => {
    setState((prev) => ({ ...prev, consent: getRiderLocationConsent() }));
  }, []);

  useEffect(() => {
    if (getRiderLocationConsent() !== "granted") return;
    startWatch();
    return stopWatch;
  }, [startWatch, stopWatch]);

  useEffect(() => {
    void refreshActiveCount();
    const interval = window.setInterval(() => {
      void refreshActiveCount();
    }, 8_000);
    return () => window.clearInterval(interval);
  }, [refreshActiveCount]);

  useEffect(() => {
    const prev = prevActiveCountRef.current;
    const next = state.activeDeliveryCount;
    prevActiveCountRef.current = next;

    if (next > prev && next > 0 && getRiderLocationConsent() === "granted") {
      void forcePushLocation();
    }
  }, [state.activeDeliveryCount, forcePushLocation]);

  useEffect(() => {
    if (getRiderLocationConsent() !== "granted" || !isGeolocationSupported()) {
      return;
    }

    const refreshFix = () => {
      navigator.geolocation.getCurrentPosition(
        handlePosition,
        () => {
          /* watchPosition handles ongoing updates */
        },
        riderGeolocationRefreshOptions,
      );
    };

    refreshFix();
    const interval = window.setInterval(refreshFix, 12_000);
    return () => window.clearInterval(interval);
  }, [handlePosition]);

  useEffect(() => {
    async function keepAwakeDuringDelivery() {
      if (activeCountRef.current === 0) {
        await wakeLockRef.current?.release();
        wakeLockRef.current = null;
        return;
      }

      if (!("wakeLock" in navigator) || wakeLockRef.current) return;

      try {
        wakeLockRef.current = await navigator.wakeLock.request("screen");
      } catch {
        /* optional */
      }
    }

    void keepAwakeDuringDelivery();
  }, [state.activeDeliveryCount]);

  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === "visible" && getRiderLocationConsent() === "granted") {
        startWatch();
        navigator.geolocation.getCurrentPosition(
          handlePosition,
          () => {},
          riderGeolocationRefreshOptions,
        );
      }
    }

    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [handlePosition, startWatch]);

  return {
    ...state,
    requestLocationAccess,
    refreshActiveCount,
    forcePushLocation,
  };
}

export function hasActiveDeliveries(orders: DeliveryOrder[]) {
  return orders.some((order) => isActiveDelivery(order.status));
}
