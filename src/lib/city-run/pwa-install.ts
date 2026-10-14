/** True when running on Android (phone/tablet). */
export function isAndroidDevice() {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent);
}

/** True on iPhone, iPad, or iPadOS in desktop mode. */
export function isIosDevice() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return true;
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}

/** True when the app is already opened from the home screen. */
export function isStandalonePwa() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** True when installable as a standalone PWA in a mobile browser. */
export function isMobileInstallContext() {
  if (typeof navigator === "undefined") return false;
  return isAndroidDevice() || isIosDevice();
}

export async function registerCityRunServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }

  try {
    return await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  } catch {
    return null;
  }
}

export type DeferredInstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export function isDeferredInstallPrompt(event: Event): event is DeferredInstallPrompt {
  return "prompt" in event && typeof (event as DeferredInstallPrompt).prompt === "function";
}
