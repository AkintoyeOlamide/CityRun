"use client";

import { useCallback, useEffect, useState } from "react";
import type { WalletSummary } from "@/lib/city-run/types";
import { walletTripsFromKobo } from "@/lib/city-run/wallet-config";

export function useWalletSummary(enabled = true) {
  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!enabled) return null;

    setLoading(true);
    try {
      const res = await fetch("/api/cityrun/wallet", { cache: "no-store" });
      if (!res.ok) return null;
      const body = (await res.json()) as { wallet?: WalletSummary };
      const next = body.wallet ?? null;
      setWallet(next);
      return next;
    } catch {
      return null;
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    function onWalletUpdated() {
      void refresh();
    }

    window.addEventListener("cityrun:wallet-updated", onWalletUpdated);
    return () => window.removeEventListener("cityrun:wallet-updated", onWalletUpdated);
  }, [refresh]);

  return {
    wallet,
    loading,
    refresh,
    balanceKobo: wallet?.balanceKobo ?? 0,
    trips: walletTripsFromKobo(wallet?.balanceKobo ?? 0),
  };
}
