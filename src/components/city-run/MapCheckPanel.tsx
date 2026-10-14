"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  createDeliveryMap,
  didMapsAuthFail,
  getGoogleMaps,
  googleMapsApiKey,
  hasGoogleMapsAsync,
  loadGoogleMapsScript,
  mapsAuthHelpForCurrentOrigin,
  riderMarkerIcon,
  RIDER_MARKER_OPTIONS,
  lagosLocationBias,
  type GoogleMap,
} from "@/lib/city-run/google-maps";

type CheckStatus = "idle" | "loading" | "ok" | "failed";

type MapsConfigResponse = {
  configured?: boolean;
  serverConfigured?: boolean;
  apiKey?: string | null;
};

export function MapCheckPanel() {
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<GoogleMap | null>(null);
  const [status, setStatus] = useState<CheckStatus>("idle");
  const [error, setError] = useState("");
  const [origin, setOrigin] = useState("");
  const [keyTail, setKeyTail] = useState("");
  const [browserKeyConfigured, setBrowserKeyConfigured] = useState(false);
  const [serverKeyConfigured, setServerKeyConfigured] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let removeAuthListener: (() => void) | undefined;

    async function runCheck() {
      setStatus("loading");
      setError("");

      let configured = Boolean(googleMapsApiKey);
      try {
        const res = await fetch("/api/cityrun/maps-config", { cache: "no-store" });
        if (res.ok) {
          const body = (await res.json()) as MapsConfigResponse;
          configured = Boolean(body.configured || body.apiKey);
          setServerKeyConfigured(Boolean(body.serverConfigured));
          const tail = (body.apiKey ?? googleMapsApiKey).slice(-6);
          setKeyTail(tail);
        } else if (googleMapsApiKey) {
          setKeyTail(googleMapsApiKey.slice(-6));
        }
      } catch {
        if (googleMapsApiKey) {
          setKeyTail(googleMapsApiKey.slice(-6));
          configured = true;
        }
      }

      setBrowserKeyConfigured(configured);

      if (!configured) {
        const runtimeConfigured = await hasGoogleMapsAsync().catch(() => false);
        if (cancelled) return;
        if (!runtimeConfigured) {
          setStatus("failed");
          setError("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is missing in Vercel / .env.local.");
          return;
        }
      }

      function onAuthFailure() {
        if (cancelled) return;
        setStatus("failed");
        setError(
          `Google rejected this site (RefererNotAllowedMapError). ${mapsAuthHelpForCurrentOrigin()}`,
        );
      }

      window.addEventListener("cityrun:maps-auth-failure", onAuthFailure);
      removeAuthListener = () => {
        window.removeEventListener("cityrun:maps-auth-failure", onAuthFailure);
      };

      try {
        await loadGoogleMapsScript();
        if (cancelled) return;

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
      } catch (err) {
        if (cancelled) return;
        setStatus("failed");
        setError(err instanceof Error ? err.message : "Maps script failed to load.");
      }
    }

    void runCheck();

    return () => {
      cancelled = true;
      removeAuthListener?.();
    };
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
            Confirms the browser map key, server key, and live map rendering for City Run.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm">
          <ul className="space-y-2 text-white/80">
            <li>
              <span className="text-white/50">Browser key:</span>{" "}
              {browserKeyConfigured ? `Yes (…${keyTail || "??????"})` : "No"}
            </li>
            <li>
              <span className="text-white/50">Server key:</span>{" "}
              {serverKeyConfigured ? "Yes (GOOGLE_MAPS_SERVER_API_KEY)" : "No — address search uses OpenStreetMap fallback"}
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
          {!serverKeyConfigured && status === "ok" && (
            <p className="mt-3 rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-amber-100">
              Add a separate <strong>GOOGLE_MAPS_SERVER_API_KEY</strong> in Vercel (no HTTP
              referrer restriction) so server-side address search and driving routes use Google
              instead of the OpenStreetMap fallback.
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
          <p className="font-semibold text-white">Setup checklist (Google Cloud Console)</p>
          <ol className="mt-2 list-decimal space-y-1.5 pl-5">
            <li>
              Create <strong>two API keys</strong> — browser (HTTP referrers) and server (no
              referrer restriction).
            </li>
            <li>
              Browser referrers must include{" "}
              <code className="rounded bg-black/30 px-1">{origin || "https://www.citygateshl.org"}/*</code>
              {origin.startsWith("http://localhost") ? (
                <>
                  {" "}
                  and your production domain{" "}
                  <code className="rounded bg-black/30 px-1">https://www.citygateshl.org/*</code>
                </>
              ) : null}
            </li>
            <li>
              Enable <strong>Maps JavaScript API</strong> and <strong>Places API (New)</strong> on
              the browser key.
            </li>
            <li>
              Enable <strong>Places API (New)</strong>, <strong>Directions API</strong>, and{" "}
              <strong>Geocoding API</strong> on the server key.
            </li>
            <li>Turn on billing for the GCP project.</li>
            <li>
              In Vercel → Environment Variables set{" "}
              <code className="rounded bg-black/30 px-1">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code>{" "}
              and <code className="rounded bg-black/30 px-1">GOOGLE_MAPS_SERVER_API_KEY</code>, then
              redeploy.
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
