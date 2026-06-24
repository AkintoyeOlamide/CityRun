"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/use-auth";
import { markCustomerNotificationsEnabled } from "@/lib/city-run/consent-preferences";
import { isPushSupported, syncPhonePushSubscription } from "@/lib/city-run/push-client";

export function CityRunPushRegister() {
  const pathname = usePathname();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!isPushSupported()) return;
    if (Notification.permission !== "granted") return;

    if (pathname.startsWith("/cityrun/rider")) {
      void syncPhonePushSubscription("rider");
      return;
    }

    if (!loading && user) {
      markCustomerNotificationsEnabled();
      void syncPhonePushSubscription("customer");
    }
  }, [pathname, user, loading]);

  return null;
}