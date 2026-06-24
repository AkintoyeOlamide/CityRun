"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  createDeliveryMap,
  didMapsAuthFail,
  getGoogleMaps,
  googleMapsApiKey,
  hasGoogleMaps,
  loadGoogleMapsScript,
  riderMarkerIcon,
  RIDER_MARKER_OPTIONS,
  lagosLocationBias,
  type GoogleMap,
} from "@/lib/city-run/google-maps";

type CheckStatus = "idle" | "loading" | "ok" | "failed";

export function MapCheckPanel() {
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<GoogleMap | null>(null);
  const [status, setStatus] = useState<CheckStatus>("idle");
  const [error, setError] = useState("");
  const [origin, setOrigin] = useState("");

  const keyTail = googleMapsApiKey.slice(-6);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    if (!hasGoogleMaps) {
      setStatus("failed");
      setError("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is missing.");
      return;
    }

    setStatus("loading");

    function onAuthFailure() {
      setStatus("failed");
      setError(
        "Google rejected this site (RefererNotAllowedMapError). Add your local URL to the API key HTTP referrers in Google Cloud Console.",
      );
    }

    window.addEventListener("cityrun:maps-auth-failure", onAuthFailure);

    loadGoogleMapsScript()
      .then(() => {
        setStatus("ok");
        setError("");
        const maps = getGoogleMaps();
        if (!maps || !mapRef.current || googleMapRef.current) return;

        googleMapRef.current = createDeliveryMap(
          mapRef.current,
          { lat: lagosLocationBias.lat, lng: lagosLocationBias.lng },
          14,
        );

        new maps.Marker({
          map: googleMapRef.current,
          position: { lat: lagosLocationBias.lat, lng: lagosLocationBias.lng },
          icon: riderMarkerIcon(maps),
          title: "Test bike marker",
          optimized: RIDER_MARKER_OPTIONS.optimized,
        });
      })
      .catch((err: Error) => {
        setStatus("failed");
        setError(err.message || "Maps script failed to load.");
      });

    return () => window.removeEventListener("cityrun:maps-auth-failure", onAuthFailure);
  }, []);

  return (
    <div className="city-run-theme min-h-dvh bg-[#070d1a] px-4 py-8 text-white">
      <div className="mx-auto max-w-2xl space-y-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-accent">
            Developer check
          </p>
          <h1 className="mt-1 text-2xl font-bold">Google Maps diagnostic</h1>
          <p className="mt-2 text-sm text-white/70">
            Use this page locally to confirm maps, the API key, and the bike
            marker before testing live tracking.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm">
          <ul className="space-y-2 text-white/80">
            <li>
              <span className="text-white/50">Key configured:</span>{" "}
              {hasGoogleMaps ? `Yes (…${keyTail})` : "No"}
            </li>
            <li>
              <span className="text-white/50">This page URL:</span>{" "}
              {origin || "…"}
            </li>
            <li>
              <span className="text-white/50">Status:</span>{" "}
              {status === "loading" && "Loading Google Maps…"}
              {status === "ok" && "Google Maps loaded"}
              {status === "failed" && "Failed"}
              {status === "idle" && "Starting…"}
            </li>
            {didMapsAuthFail() && (
              <li className="text-amber-200">Auth failure flag is set in this tab.</li>
            )}
          </ul>
          {error && (
            <p className="mt-3 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-red-200">
              {error}
            </p>
          )}
        </div>

        <div className="overflow-hidden rounded-2xl border border-white/10">
          <div ref={mapRef} className="h-72 w-full bg-[#121f38]" />
          <p className="border-t border-white/10 px-3 py-2 text-xs text-white/60">
            {status === "ok"
              ? "You should see a dark Google map with a blue bicycle marker in Lagos."
              : "Map preview appears here when Google Maps loads."}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/75">
          <p className="font-semibold text-white">If this page fails locally</p>
          <ol className="mt-2 list-decimal space-y-1.5 pl-5">
            <li>
              In Google Cloud → Credentials → your key → HTTP referrers, add{" "}
              <code className="rounded bg-black/30 px-1">{origin || "http://localhost:3000"}/*</code>
            </li>
            <li>
              If dev runs on another port (e.g. 3004), add that port too:{" "}
              <code className="rounded bg-black/30 px-1">http://localhost:3004/*</code>
            </li>
            <li>Enable <strong>Maps JavaScript API</strong> and billing on the project.</li>
            <li>Restart <code className="rounded bg-black/30 px-1">yarn dev</code> after changing <code className="rounded bg-black/30 px-1">.env.local</code>.</li>
            <li>
              Open browser DevTools → Console on a tracking page and look for{" "}
              <code className="rounded bg-black/30 px-1">RefererNotAllowedMapError</code>.
            </li>
          </ol>
        </div>

        <div className="flex flex-wrap gap-3 text-sm">
          <Link href="/cityrun/admin/live" className="font-semibold text-accent">
            Admin live map →
          </Link>
          <Link href="/cityrun/rider" className="font-semibold text-accent">
            Rider app →
          </Link>
          <a
            href="/images/cityrun/rider-bike-marker.svg"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-accent"
          >
            Bike marker SVG →
          </a>
        </div>
      </div>
    </div>
  );
}
