"use client";

import dynamic from "next/dynamic";
import { Suspense, useEffect, useState } from "react";
import { CustomerNotificationListener } from "@/components/city-run/CustomerNotificationListener";
import type { InitialAuthState } from "@/lib/auth/server-auth";
import { AuthProvider, useAuth } from "@/lib/auth/auth-provider";
import { CityRunNotificationProvider } from "@/components/city-run/CityRunNotificationProvider";

const CityRunPushRegister = dynamic(
  () =>
    import("@/components/city-run/CityRunPushRegister").then((m) => ({
      default: m.CityRunPushRegister,
    })),
  { ssr: false },
);

function CityRunCustomerSync() {
  const { user, loading } = useAuth();
  if (loading || !user) return null;
  return <CustomerNotificationListener />;
}

function CityRunDeferredPush() {
  const { user, loading } = useAuth();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof requestIdleCallback !== "undefined") {
      const id = requestIdleCallback(() => setReady(true), { timeout: 4000 });
      return () => cancelIdleCallback(id);
    }

    const id = window.setTimeout(() => setReady(true), 1500);
    return () => window.clearTimeout(id);
  }, []);

  if (!ready || loading || !user) return null;
  return <CityRunPushRegister />;
}

const WelcomeFundWalletPrompt = dynamic(
  () =>
    import("@/components/city-run/WelcomeFundWalletPrompt").then((m) => ({
      default: m.WelcomeFundWalletPrompt,
    })),
  { ssr: false },
);

export function CityRunClientShell({
  children,
  initialAuthState,
}: {
  children: React.ReactNode;
  initialAuthState?: InitialAuthState;
}) {
  return (
    <AuthProvider initialAuthState={initialAuthState}>
      <CityRunNotificationProvider>
        <CityRunCustomerSync />
        <CityRunDeferredPush />
        <Suspense fallback={null}>
          <WelcomeFundWalletPrompt />
        </Suspense>
        {children}
      </CityRunNotificationProvider>
    </AuthProvider>
  );
}
