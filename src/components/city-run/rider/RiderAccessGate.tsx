"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bike, ShieldCheck } from "lucide-react";
import { RiderLoginForm } from "@/components/city-run/rider/RiderLoginForm";
import { OpsSkeleton } from "@/components/city-run/ops/OpsUI";
import type { RiderPublic } from "@/lib/city-run/types";

type RiderAccessGateProps = {
  children: (rider: RiderPublic) => React.ReactNode;
};

export function RiderAccessGate({ children }: RiderAccessGateProps) {
  const [loading, setLoading] = useState(true);
  const [rider, setRider] = useState<RiderPublic | null>(null);

  const checkSession = useCallback(async () => {
    const res = await fetch("/api/cityrun/rider/me");
    if (res.ok) {
      const body = (await res.json()) as {
        authenticated?: boolean;
        rider?: RiderPublic;
      };
      setRider(body.authenticated && body.rider ? body.rider : null);
    } else {
      setRider(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  if (loading) {
    return (
      <div className="min-h-dvh bg-cr-page cr-mesh-page px-4 py-16">
        <div className="mx-auto max-w-md space-y-4">
          <OpsSkeleton className="h-32" />
          <OpsSkeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!rider) {
    return (
      <div className="min-h-dvh bg-cr-page cr-mesh-page px-4 py-10 text-white">
        <div className="mx-auto max-w-md">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/25 ring-1 ring-accent/35">
              <Bike className="h-7 w-7 text-accent" strokeWidth={2.25} />
            </div>
            <h1 className="cr-text-headline text-2xl font-bold">Rider portal</h1>
            <p className="cr-text-muted mt-2 text-sm leading-relaxed">
              Sign in to accept deliveries, update ride status, and share live
              location with customers.
            </p>
          </div>

          <div className="cr-glass-card cr-glow-ring rounded-2xl p-5">
            <div className="mb-5 flex items-center gap-2 text-xs font-semibold text-accent">
              <ShieldCheck className="h-4 w-4" />
              Secure rider access
            </div>
            <RiderLoginForm onSuccess={() => checkSession()} />
          </div>

          <Link
            href="/cityrun"
            className="cr-text-label mt-6 block text-center text-sm font-semibold text-accent"
          >
            ← Back to City Run
          </Link>
        </div>
      </div>
    );
  }

  return <>{children(rider)}</>;
}
