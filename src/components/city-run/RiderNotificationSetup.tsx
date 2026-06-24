"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, Volume2, X } from "lucide-react";
import {
  isRiderNotificationsDeclined,
  markRiderNotificationsDeclined,
} from "@/lib/city-run/consent-preferences";
import {
  canUseBrowserNotifications,
  enableRiderNotifications,
  isRiderNotificationSetupComplete,
  isRiderSoundEnabled,
} from "@/lib/city-run/notifications";

export function RiderNotificationSetup() {
  const [visible, setVisible] = useState(false);
  const [enabling, setEnabling] = useState(false);

  useEffect(() => {
    if (isRiderNotificationSetupComplete()) return;
    if (isRiderNotificationsDeclined()) return;

    if (canUseBrowserNotifications() && Notification.permission === "granted") {
      void enableRiderNotifications();
      return;
    }

    if (canUseBrowserNotifications() && Notification.permission === "denied") {
      return;
    }

    const needsBrowser =
      canUseBrowserNotifications() && Notification.permission === "default";
    const needsSound = !isRiderSoundEnabled();

    setVisible(needsBrowser || needsSound);
  }, []);

  const dismiss = useCallback(() => {
    setVisible(false);
    markRiderNotificationsDeclined();
  }, []);

  const handleEnable = useCallback(async () => {
    setEnabling(true);
    try {
      await enableRiderNotifications();
      setVisible(false);
    } finally {
      setEnabling(false);
    }
  }, []);

  if (!visible) return null;

  return (
    <div className="cr-glass-card cr-glow-ring mb-4 rounded-2xl border border-accent/30 px-4 py-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/20">
          <Volume2 className="h-5 w-5 text-accent" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-white">Turn on ride alerts</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void handleEnable()}
              disabled={enabling}
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              <Bell className="h-4 w-4" />
              {enabling ? "Enabling…" : "Enable phone notifications"}
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="rounded-lg px-3 py-2 text-sm text-white/55"
            >
              Not now
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded-lg p-1 text-white/45"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
