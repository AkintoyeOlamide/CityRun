"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Wallet, X } from "lucide-react";
import { useAuth } from "@/lib/auth/use-auth";
import { WALLET_TRIP_PRICE_NAIRA } from "@/lib/city-run/wallet-config";

export function WelcomeFundWalletPrompt() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (loading || !user) return;
    if (searchParams.get("welcomeWallet") !== "1") return;
    setOpen(true);
  }, [loading, user, searchParams]);

  function closePrompt() {
    setOpen(false);
    const url = new URL(window.location.href);
    url.searchParams.delete("welcomeWallet");
    router.replace(`${url.pathname}${url.search}${url.hash}`, { scroll: false });
  }

  function goFundWallet() {
    setOpen(false);
    router.push("/cityrun/account?fundWallet=1");
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100001] flex items-end justify-center bg-black/75 p-4 sm:items-center">
      <div
        className="w-full max-w-sm rounded-2xl border border-accent/25 bg-[#0b1424] p-5 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-wallet-title"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/15 text-accent">
            <Wallet className="h-5 w-5" />
          </div>
          <button
            type="button"
            onClick={closePrompt}
            className="rounded-lg p-1.5 text-white/45 hover:bg-white/5 hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <h2 id="welcome-wallet-title" className="mt-4 text-lg font-bold text-white">
          Welcome to City Run
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-white/60">
          Fund your wallet to book deliveries quickly. Each trip costs ₦
          {WALLET_TRIP_PRICE_NAIRA.toLocaleString("en-NG")} — add ₦10,000 for 10
          trips ready to go.
        </p>

        <button
          type="button"
          onClick={goFundWallet}
          className="mt-5 w-full rounded-xl bg-accent py-3.5 text-sm font-semibold text-white"
        >
          Fund my wallet
        </button>

        <button
          type="button"
          onClick={closePrompt}
          className="mt-3 w-full py-2 text-sm font-medium text-white/45 hover:text-white/70"
        >
          Maybe later
        </button>

        <p className="mt-3 text-center text-xs text-white/35">
          You can always fund from{" "}
          <Link href="/cityrun/account" className="text-accent" onClick={closePrompt}>
            Account
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
