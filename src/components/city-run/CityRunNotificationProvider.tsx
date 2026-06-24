"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, X } from "lucide-react";
import {
  canUseBrowserNotifications,
  notifyCityRun,
  requestNotificationPermission,
  type CityRunNotificationPayload,
} from "@/lib/city-run/notifications";
import {
  isCustomerNotificationsDeclined,
  isCustomerNotificationsEnabled,
  markCustomerNotificationsDeclined,
  markCustomerNotificationsEnabled,
} from "@/lib/city-run/consent-preferences";
import { subscribeToPhonePush } from "@/lib/city-run/push-client";

type Toast = CityRunNotificationPayload & { id: string };

type NotificationContextValue = {
  pushToast: (payload: CityRunNotificationPayload) => void;
  requestPermission: () => Promise<void>;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function useCityRunNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error("useCityRunNotifications must be used within CityRunNotificationProvider");
  }
  return ctx;
}

export function CityRunNotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showPermissionHint, setShowPermissionHint] = useState(false);

  const dismissPermissionHint = useCallback(() => {
    setShowPermissionHint(false);
    markCustomerNotificationsDeclined();
  }, []);

  const pushToast = useCallback((payload: CityRunNotificationPayload) => {
    const id = `${payload.tag ?? payload.title}-${Date.now()}`;
    setToasts((prev) => [{ ...payload, id }, ...prev].slice(0, 4));
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 8000);
  }, []);

  const requestPermission = useCallback(async () => {
    dismissPermissionHint();
    const result = await requestNotificationPermission();
    if (result === "granted") {
      markCustomerNotificationsEnabled();
      const audience = pathname.startsWith("/cityrun/rider") ? "rider" : "customer";
      await subscribeToPhonePush(audience);
    }
  }, [dismissPermissionHint, pathname]);

  useEffect(() => {
    function onNotify(event: Event) {
      const detail = (event as CustomEvent<CityRunNotificationPayload>).detail;
      if (detail?.title) pushToast(detail);
    }
    window.addEventListener("cityrun:notify", onNotify);
    return () => window.removeEventListener("cityrun:notify", onNotify);
  }, [pushToast]);

  useEffect(() => {
    if (pathname.startsWith("/cityrun/rider")) return;
    if (!canUseBrowserNotifications()) return;
    if (Notification.permission === "granted") {
      markCustomerNotificationsEnabled();
      return;
    }
    if (Notification.permission === "denied") return;
    if (isCustomerNotificationsEnabled()) return;
    if (isCustomerNotificationsDeclined()) return;
    setShowPermissionHint(true);
  }, [pathname]);

  return (
    <NotificationContext.Provider value={{ pushToast, requestPermission }}>
      {children}

      {showPermissionHint && (
        <div className="fixed inset-x-0 top-0 z-[100] px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <div className="cr-glass-card mx-auto flex max-w-lg items-center gap-3 rounded-2xl px-4 py-3">
            <Bell className="h-5 w-5 shrink-0 text-white" />
            <p className="cr-text-label flex-1 text-sm font-semibold">
              Phone notifications
            </p>
            <button
              type="button"
              onClick={() => void requestPermission()}
              className="shrink-0 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-[#070d1a]"
            >
              Enable phone notifications
            </button>
            <button
              type="button"
              onClick={() => dismissPermissionHint()}
              className="shrink-0 rounded-lg p-1 text-white/60"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <div className="pointer-events-none fixed inset-x-0 top-0 z-[90] flex flex-col gap-2 px-4 pt-[max(4.5rem,env(safe-area-inset-top))]">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="cr-glass-card pointer-events-auto mx-auto w-full max-w-lg rounded-2xl px-4 py-3 shadow-lg"
          >
            {toast.href ? (
              <Link href={toast.href} className="block">
                <p className="cr-text-label text-sm font-bold">{toast.title}</p>
                <p className="cr-text-body mt-1 text-sm">{toast.body}</p>
              </Link>
            ) : (
              <>
                <p className="cr-text-label text-sm font-bold">{toast.title}</p>
                <p className="cr-text-body mt-1 text-sm">{toast.body}</p>
              </>
            )}
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

export { notifyCityRun };
