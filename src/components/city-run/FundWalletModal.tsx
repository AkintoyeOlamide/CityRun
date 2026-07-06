"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Copy, X } from "lucide-react";
import { formatNairaFromKobo } from "@/lib/city-run/pricing";
import {
  WALLET_BANK_DETAILS,
  WALLET_CONFIRM_LOADING_MS,
  WALLET_TRANSFER_COUNTDOWN_SEC,
  walletTripsFromNaira,
} from "@/lib/city-run/wallet-config";

type FundWalletModalProps = {
  open: boolean;
  amountNaira: number;
  onClose: () => void;
  onSuccess: () => void;
};

type Step = "transfer" | "loading" | "success";

export function FundWalletModal({
  open,
  amountNaira,
  onClose,
  onSuccess,
}: FundWalletModalProps) {
  const [step, setStep] = useState<Step>("transfer");
  const [secondsLeft, setSecondsLeft] = useState(WALLET_TRANSFER_COUNTDOWN_SEC);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const trips = walletTripsFromNaira(amountNaira);

  useEffect(() => {
    if (!open) {
      setStep("transfer");
      setSecondsLeft(WALLET_TRANSFER_COUNTDOWN_SEC);
      setCopied(false);
      setError("");
      return;
    }

    setStep("transfer");
    setSecondsLeft(WALLET_TRANSFER_COUNTDOWN_SEC);
    setCopied(false);
    setError("");

    const interval = window.setInterval(() => {
      setSecondsLeft((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [open, amountNaira]);

  if (!open) return null;

  async function copyAccountNumber() {
    try {
      await navigator.clipboard.writeText(WALLET_BANK_DETAILS.accountNumber);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  async function confirmTransfer() {
    if (step !== "transfer") return;
    setError("");
    setStep("loading");

    await new Promise((resolve) => window.setTimeout(resolve, WALLET_CONFIRM_LOADING_MS));

    try {
      const res = await fetch("/api/cityrun/wallet/confirm-transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountNaira }),
      });
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        throw new Error(body?.error ?? "Could not confirm transfer");
      }

      setStep("success");
      window.dispatchEvent(new CustomEvent("cityrun:wallet-updated"));
      onSuccess();
    } catch (err) {
      setStep("transfer");
      setError(err instanceof Error ? err.message : "Could not confirm transfer");
    }
  }

  return (
    <div className="fixed inset-0 z-[100000] flex items-end justify-center bg-black/70 p-4 sm:items-center">
      <div
        className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0b1424] p-5 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="fund-wallet-title"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p id="fund-wallet-title" className="text-lg font-bold text-white">
              Fund your wallet
            </p>
            <p className="mt-1 text-sm text-white/55">
              Send exactly{" "}
              <span className="font-semibold text-white">
                ₦{amountNaira.toLocaleString("en-NG")}
              </span>{" "}
              for{" "}
              <span className="font-semibold text-accent">
                {trips} trip{trips === 1 ? "" : "s"}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/45 hover:bg-white/5 hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {step === "transfer" && (
          <>
            <div className="rounded-xl border border-accent/25 bg-accent/10 p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-accent/80">
                Transfer to
              </p>
              <p className="mt-2 text-sm font-bold leading-snug text-white">
                {WALLET_BANK_DETAILS.accountName}
              </p>
              <div className="mt-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-2xl font-bold tracking-wide text-white">
                    {WALLET_BANK_DETAILS.accountNumber}
                  </p>
                  <p className="mt-1 text-sm text-white/60">{WALLET_BANK_DETAILS.bankName}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void copyAccountNumber()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-accent hover:bg-accent/10"
                >
                  <Copy className="h-3.5 w-3.5" />
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-center">
              <p className="text-xs uppercase tracking-wide text-white/45">
                Time to complete transfer
              </p>
              <p className="mt-1 text-3xl font-bold tabular-nums text-accent">
                {formatCountdown(secondsLeft)}
              </p>
              <p className="mt-1 text-xs text-white/40">20-minute window</p>
            </div>

            <p className="mt-3 text-xs leading-relaxed text-white/45">
              Send the money from your bank app, then tap the button below once payment is
              done. ₦1,000 = 1 delivery trip.
            </p>

            {error && (
              <p className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={() => void confirmTransfer()}
              className="mt-4 w-full rounded-xl bg-accent py-3.5 text-sm font-semibold text-white transition-transform active:scale-[0.98]"
            >
              I have sent the money
            </button>
          </>
        )}

        {step === "loading" && (
          <div className="py-10 text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            <p className="mt-4 text-sm text-white/70">Confirming your transfer…</p>
          </div>
        )}

        {step === "success" && (
          <div className="py-8 text-center">
            <div className="success-pop mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 ring-4 ring-emerald-400/20">
              <CheckCircle2 className="h-10 w-10 text-emerald-400" />
            </div>
            <p className="mt-4 text-lg font-bold text-white">Successful!</p>
            <p className="mt-2 text-sm text-white/60">
              {formatNairaFromKobo(amountNaira * 100)} added to your wallet
              {trips > 0 ? ` — ${trips} trip${trips === 1 ? "" : "s"} ready` : ""}.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-6 w-full rounded-xl bg-accent py-3 text-sm font-semibold text-white"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function formatCountdown(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
