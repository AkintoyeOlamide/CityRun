export type CityRunNotificationPayload = {
  title: string;
  body: string;
  href?: string;
  tag?: string;
  sound?: boolean;
  tabBadge?: boolean;
  requireInteraction?: boolean;
};

const RIDER_SOUND_KEY = "cityrun:rider-sound-enabled";
const RIDER_SETUP_KEY = "cityrun:rider-notifications-setup";

let audioContext: AudioContext | null = null;
let baseDocumentTitle = "";
let tabBadgeCount = 0;
let titleFlashTimer: ReturnType<typeof setInterval> | null = null;
let alarmInterval: ReturnType<typeof setInterval> | null = null;
let alarmPlaying = false;

export async function requestNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  return Notification.requestPermission();
}

export function canUseBrowserNotifications() {
  return typeof window !== "undefined" && "Notification" in window;
}

export function isRiderSoundEnabled() {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(RIDER_SOUND_KEY) === "1";
  } catch {
    return false;
  }
}

export function setRiderSoundEnabled(enabled: boolean) {
  try {
    localStorage.setItem(RIDER_SOUND_KEY, enabled ? "1" : "0");
  } catch {
    /* ignore */
  }
}

export function isRiderNotificationSetupComplete() {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(RIDER_SETUP_KEY) === "1";
  } catch {
    return false;
  }
}

export function markRiderNotificationSetupComplete() {
  try {
    localStorage.setItem(RIDER_SETUP_KEY, "1");
  } catch {
    /* ignore */
  }
}

function getAudioContext() {
  if (typeof window === "undefined") return null;
  const Ctx = window.AudioContext
    ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (!audioContext || audioContext.state === "closed") {
    audioContext = new Ctx();
  }
  return audioContext;
}

export async function unlockRiderSound(): Promise<boolean> {
  const ctx = getAudioContext();
  if (!ctx) return false;
  if (ctx.state === "suspended") {
    await ctx.resume();
  }
  setRiderSoundEnabled(true);
  playRiderAlertSound();
  return true;
}

export function playRiderAlertSound(force = false) {
  if (!force && !isRiderSoundEnabled()) return;

  const ctx = getAudioContext();
  if (!ctx || alarmPlaying) return;

  alarmPlaying = true;

  void ctx.resume().then(() => {
    const now = ctx.currentTime;
    const pattern = [
      { frequency: 880, start: 0, duration: 0.22 },
      { frequency: 1174.66, start: 0.24, duration: 0.22 },
      { frequency: 880, start: 0.48, duration: 0.22 },
      { frequency: 1174.66, start: 0.72, duration: 0.22 },
      { frequency: 988, start: 0.96, duration: 0.28 },
      { frequency: 1318.51, start: 1.28, duration: 0.32 },
    ];

    pattern.forEach(({ frequency, start, duration }) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = "square";
      oscillator.frequency.value = frequency;
      oscillator.connect(gain);
      gain.connect(ctx.destination);

      const t = now + start;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.72, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

      oscillator.start(t);
      oscillator.stop(t + duration + 0.02);
    });

    window.setTimeout(() => {
      alarmPlaying = false;
    }, 1700);
  });
}

export function startRiderAlarm() {
  setRiderSoundEnabled(true);
  stopRiderAlarm();
  playRiderAlertSound(true);
  alarmInterval = setInterval(() => playRiderAlertSound(true), 2200);
}

export function stopRiderAlarm() {
  if (alarmInterval) {
    clearInterval(alarmInterval);
    alarmInterval = null;
  }
  alarmPlaying = false;
}

export function initRiderTabBadge(defaultTitle?: string) {
  if (typeof document === "undefined") return;
  baseDocumentTitle = defaultTitle || document.title;
}

export function clearRiderTabBadge() {
  tabBadgeCount = 0;
  stopTitleFlash();
  if (typeof document !== "undefined" && baseDocumentTitle) {
    document.title = baseDocumentTitle;
  }
}

function formatTabTitle(count: number) {
  const label = count === 1 ? "New ride request" : "New ride requests";
  return `(${count}) ${label} — ${baseDocumentTitle || "City Run Rider"}`;
}

function stopTitleFlash() {
  if (titleFlashTimer) {
    clearInterval(titleFlashTimer);
    titleFlashTimer = null;
  }
}

function startTitleFlash(alertTitle: string) {
  if (titleFlashTimer || typeof document === "undefined") return;
  let showAlert = true;
  titleFlashTimer = setInterval(() => {
    document.title = showAlert ? alertTitle : (baseDocumentTitle || "City Run Rider");
    showAlert = !showAlert;
  }, 1200);
}

export function bumpRiderTabBadge() {
  if (typeof document === "undefined") return;
  if (!baseDocumentTitle) {
    baseDocumentTitle = document.title;
  }

  tabBadgeCount += 1;
  const alertTitle = formatTabTitle(tabBadgeCount);
  document.title = alertTitle;

  if (document.hidden) {
    startTitleFlash(alertTitle);
  }
}

export function showBrowserNotification(payload: CityRunNotificationPayload) {
  if (typeof window === "undefined") return;
  void import("@/lib/city-run/push-client").then(({ showPhoneNotification }) => {
    void showPhoneNotification({
      title: payload.title,
      body: payload.body,
      tag: payload.tag,
      href: payload.href,
      requireInteraction: payload.requireInteraction,
      urgent: payload.sound === true,
    });
  });
}

export function notifyCityRun(payload: CityRunNotificationPayload) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("cityrun:notify", { detail: payload }),
  );
  showBrowserNotification(payload);
}

export function notifyRiderNewRide(
  payload: CityRunNotificationPayload,
  order?: import("@/lib/city-run/types").DeliveryOrder,
) {
  notifyCityRun({
    ...payload,
    title: payload.title || "🚨 NEW RIDE REQUEST",
    requireInteraction: true,
    sound: true,
    tabBadge: true,
  });

  startRiderAlarm();

  if (order) {
    window.dispatchEvent(
      new CustomEvent("cityrun:rider-new-ride", { detail: { order } }),
    );
  }

  if (payload.tabBadge !== false) {
    bumpRiderTabBadge();
  }
}

export async function enableRiderNotifications(): Promise<{
  sound: boolean;
  browser: NotificationPermission | "unsupported";
  push: boolean;
}> {
  setRiderSoundEnabled(true);
  const browser = await requestNotificationPermission();
  let push = false;
  if (browser === "granted") {
    const { subscribeToPhonePush } = await import("@/lib/city-run/push-client");
    push = await subscribeToPhonePush("rider");
    const { clearRiderNotificationsDeclined } = await import(
      "@/lib/city-run/consent-preferences"
    );
    clearRiderNotificationsDeclined();
  }
  let sound = false;
  try {
    sound = await unlockRiderSound();
  } catch {
    sound = false;
  }
  markRiderNotificationSetupComplete();
  return { sound, browser, push };
}
