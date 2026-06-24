"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { CityRunSplashBikeScene } from "@/components/city-run/CityRunSplashBikeScene";

type CityRunSplashScreenProps = {
  onGuest: () => void;
  onSignIn: () => void;
  onSignUp: () => void;
};

export function CityRunSplashScreen({
  onGuest,
  onSignIn,
  onSignUp,
}: CityRunSplashScreenProps) {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    setRevealed(true);
  }, []);

  return (
    <div className="cr-splash-screen flex min-h-dvh flex-col bg-white px-6 text-[#0f172a]">
      <div
        className={`flex flex-1 flex-col items-center justify-center pt-[max(2rem,env(safe-area-inset-top))] transition-opacity duration-300 ${
          revealed ? "opacity-100" : "opacity-0"
        }`}
      >
        <Image
          src="/images/cityrun/city-run-logo.png"
          alt="City Run"
          width={220}
          height={220}
          priority
          className="h-auto w-[min(52vw,13rem)] object-contain"
        />
        <CityRunSplashBikeScene />
        <p className="mt-4 max-w-[16rem] text-center text-sm leading-relaxed text-[#64748b]">
          Fast last-mile delivery across Lagos
        </p>
      </div>

      <div
        className={`pb-[max(1.75rem,env(safe-area-inset-bottom))] transition-opacity duration-300 ${
          revealed ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="mx-auto flex w-full max-w-sm flex-col gap-3">
          <button
            type="button"
            onClick={onGuest}
            className="group flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#e2e8f0] bg-white py-3 text-sm font-semibold text-[#0f172a] transition-colors hover:border-[#cbd5e1] hover:bg-[#f8fafc] active:scale-[0.98]"
          >
            Continue as guest
            <ArrowRight className="h-3.5 w-3.5 text-[#64748b] transition-transform group-hover:translate-x-0.5" />
          </button>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onSignIn}
              className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] py-3 text-xs font-semibold text-[#0f172a] transition-colors hover:bg-[#f1f5f9] active:scale-[0.98]"
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={onSignUp}
              className="rounded-xl bg-accent py-3 text-xs font-bold text-white transition-colors hover:bg-accent-dark active:scale-[0.98]"
            >
              Create account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
