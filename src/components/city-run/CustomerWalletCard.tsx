"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Wallet } from "lucide-react";
import { formatNairaFromKobo } from "@/lib/city-run/pricing";
import {
  WALLET_TRIP_PRICE_NAIRA,
  walletTripsFromKobo,
  walletTripsFromNaira,
} from "@/lib/city-run/wallet-config";
import { FundWalletModal } from "@/components/city-run/FundWalletModal";
import type { WalletSummary, WalletTransaction } from "@/lib/city-run/types";

const PRESET_AMOUNTS = [1000, 2000, 5000, 10000];

export function CustomerWalletCard() {
  const searchParams = useSearchParams();
  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [amountNaira, setAmountNaira] = useState("1000");
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState("");

  const parsedAmount = Number(amountNaira);
  const selectedTrips = walletTripsFromNaira(parsedAmount);
  const balanceTrips = walletTripsFromKobo(wallet?.balanceKobo ?? 0);
  const canFund =
    Number.isFinite(parsedAmount) &&
    parsedAmount >= WALLET_TRIP_PRICE_NAIRA &&
    parsedAmount % WALLET_TRIP_PRICE_NAIRA === 0;

  const loadWallet = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/cityrun/wallet", { cache: "no-store" });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Could not load wallet");
      }
      const body = (await res.json()) as {
        wallet: WalletSummary;
        transactions: WalletTransaction[];
      };
      setWallet(body.wallet);
      setTransactions(body.transactions ?? []);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load wallet");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWallet();
  }, [loadWallet]);

  useEffect(() => {
    if (searchParams.get("fundWallet") === "1") {
      setModalOpen(true);
    }
  }, [searchParams]);

  return (
    <>
      <section className="cr-glass-card cr-glow-ring rounded-2xl p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-accent" />
              <p className="text-xs font-bold uppercase tracking-wide text-accent/90">
                City Run wallet
              </p>
            </div>
            <p className="cr-text-headline mt-2 text-2xl font-bold">
              {loading ? "…" : formatNairaFromKobo(wallet?.balanceKobo ?? 0)}
            </p>
            <p className="cr-text-muted mt-1 text-sm">
              {loading
                ? "Loading trips…"
                : `${balanceTrips} delivery trip${balanceTrips === 1 ? "" : "s"} available`}
            </p>
            <p className="mt-1 text-xs text-white/40">
              ₦{WALLET_TRIP_PRICE_NAIRA.toLocaleString("en-NG")} = 1 trip
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {PRESET_AMOUNTS.map((amount) => {
            const trips = walletTripsFromNaira(amount);
            return (
              <button
                key={amount}
                type="button"
                onClick={() => setAmountNaira(String(amount))}
                className={`rounded-lg px-3 py-2 text-left text-xs font-semibold transition-colors ${
                  amountNaira === String(amount)
                    ? "bg-accent text-white"
                    : "border border-white/10 bg-white/[0.03] text-white/70"
                }`}
              >
                <span className="block">₦{amount.toLocaleString("en-NG")}</span>
                <span className="mt-0.5 block text-[10px] opacity-80">
                  {trips} trip{trips === 1 ? "" : "s"}
                </span>
              </button>
            );
          })}
        </div>

        <label className="mt-4 block">
          <span className="mb-1.5 block text-xs font-medium text-white/70">
            Amount (₦) — multiples of ₦{WALLET_TRIP_PRICE_NAIRA.toLocaleString("en-NG")}
          </span>
          <input
            type="number"
            min={WALLET_TRIP_PRICE_NAIRA}
            step={WALLET_TRIP_PRICE_NAIRA}
            value={amountNaira}
            onChange={(event) => setAmountNaira(event.target.value)}
            className="w-full rounded-xl border border-white/10 bg-cr-surface px-4 py-3 text-sm text-white outline-none focus:border-accent"
          />
          {canFund && (
            <p className="mt-1.5 text-xs text-accent/90">
              = {selectedTrips} trip{selectedTrips === 1 ? "" : "s"}
            </p>
          )}
        </label>

        {error && (
          <p className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}

        <button
          type="button"
          disabled={loading || !canFund}
          onClick={() => setModalOpen(true)}
          className="mt-4 w-full rounded-xl bg-accent py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          Fund wallet
        </button>

        {transactions.length > 0 && (
          <div className="mt-5 border-t border-white/10 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/45">
              Recent activity
            </p>
            <ul className="mt-3 space-y-2">
              {transactions.slice(0, 5).map((tx) => (
                <li
                  key={tx.id}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate text-white/85">{tx.description}</p>
                    <p className="text-xs text-white/40">
                      {new Date(tx.createdAt).toLocaleString("en-NG")}
                    </p>
                  </div>
                  <p
                    className={`shrink-0 font-semibold ${
                      tx.type === "debit" ? "text-red-300" : "text-emerald-300"
                    }`}
                  >
                    {tx.type === "debit" ? "-" : "+"}
                    {formatNairaFromKobo(tx.amountKobo)}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <FundWalletModal
        open={modalOpen}
        amountNaira={parsedAmount}
        onClose={() => setModalOpen(false)}
        onSuccess={() => void loadWallet()}
      />
    </>
  );
}
