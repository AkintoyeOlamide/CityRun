"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { PlusSquare, Share } from "lucide-react";
import {
  isAndroidDevice,
  isIosDevice,
  isStandalonePwa,
  registerCityRunServiceWorker,
} from "@/lib/city-run/pwa-install";

export const CITY_RUN_APK_URL = "/downloads/cityrun.apk";

type InstallKind = "loading" | "android" | "ios" | "installed" | "hidden";

/** Platform install prompt: APK download on Android, Add to Home Screen on iOS. */
export function CityRunInstallApp() {
  const [kind, setKind] = useState<InstallKind>("loading");

  useEffect(() => {
    if (isStandalonePwa()) {
      setKind("installed");
      return;
    }

    if (isAndroidDevice()) {
      setKind("android");
      return;
    }

    if (isIosDevice()) {
      void registerCityRunServiceWorker();
      setKind("ios");
      return;
    }

    setKind("hidden");
  }, []);

  if (kind === "loading" || kind === "hidden") {
    return null;
  }

  if (kind === "installed") {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-xs font-medium text-emerald-800">
        City Run is on your home screen — open it from there anytime.
      </div>
    );
  }

  if (kind === "android") {
    return (
      <a
        href={CITY_RUN_APK_URL}
        download="CityRun.apk"
        className="flex w-full items-center justify-center gap-3 rounded-xl border border-[#3478f6]/25 bg-[#3478f6]/8 py-3.5 text-sm font-semibold text-[#1d4ed8] transition-colors hover:bg-[#3478f6]/12 active:scale-[0.98]"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#070d1a] shadow-sm ring-1 ring-[#3478f6]/20">
          <Image
            src="/images/cityrun/city-run-ebike-icon.svg"
            alt=""
            width={28}
            height={28}
            aria-hidden
          />
        </span>
        <span className="text-left">
          <span className="block text-sm font-bold text-[#0f172a]">Download app for Android</span>
          <span className="block text-[0.65rem] font-medium text-[#64748b]">
            Tap to download City Run
          </span>
        </span>
      </a>
    );
  }

  return (
    <div className="rounded-xl border border-[#3478f6]/25 bg-[#3478f6]/8 px-4 py-3.5">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#070d1a] shadow-sm ring-1 ring-[#3478f6]/20">
          <Image
            src="/images/cityrun/city-run-ebike-icon.svg"
            alt=""
            width={28}
            height={28}
            aria-hidden
          />
        </span>
        <div className="min-w-0 text-left">
          <p className="text-sm font-bold text-[#0f172a]">Add to Home Screen</p>
          <p className="text-[0.65rem] font-medium leading-relaxed text-[#64748b]">
            Install City Run on your iPhone like an app.
          </p>
        </div>
      </div>

      <ol className="mt-3 space-y-2 border-t border-[#3478f6]/15 pt-3 text-[0.7rem] leading-relaxed text-[#475569]">
        <li className="flex items-start gap-2">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-white text-[#3478f6] shadow-sm ring-1 ring-[#e2e8f0]">
            <Share className="h-3 w-3" aria-hidden />
          </span>
          <span>
            Tap <strong className="font-semibold text-[#0f172a]">Share</strong> at the bottom of
            Safari
          </span>
        </li>
        <li className="flex items-start gap-2">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-white text-[#3478f6] shadow-sm ring-1 ring-[#e2e8f0]">
            <PlusSquare className="h-3 w-3" aria-hidden />
          </span>
          <span>
            Scroll and tap <strong className="font-semibold text-[#0f172a]">Add to Home Screen</strong>
          </span>
        </li>
      </ol>
    </div>
  );
}

/** @deprecated Use CityRunInstallApp */
export const CityRunInstallAndroid = CityRunInstallApp;
