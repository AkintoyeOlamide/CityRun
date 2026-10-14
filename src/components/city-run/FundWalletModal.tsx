"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, CreditCard, X } from "lucide-react";
import { formatNairaFromKobo } from "@/lib/city-run/pricing";
import { walletTripsFromNaira } from "@/lib/city-run/wallet-config";

type FundWalletModalProps = {
  open: boolean;
  amountNaira: number;
  onClose: () => void;
  onSuccess: () => void;
  variant?: "wallet" | "trip";
  paystackInitUrl?: string;
  title?: string;
  subtitle?: string;
};

type Step = "checkout" | "loading" | "success";

export function FundWalletModal({
  open,
  amountNaira,
  onClose,
  onSuccess,
  variant = "wallet",
  paystackInitUrl = "/api/cityrun/wallet/topup",
  title,
  subtitle,
}: FundWalletModalProps) {
  const [step, setStep] = useState<Step>("checkout");
  const [error, setError] = useState("");

  const trips = walletTripsFromNaira(amountNaira);
  const isTrip = variant === "trip";

  useEffect(() => {
    if (!open) {
      setStep("checkout");
      setError("");
      return;
    }
    setStep("checkout");
    setError("");
  }, [open, amountNaira]);

  if (!open) return null;

  async function payWithPaystack() {
    if (step !== "checkout") return;
    setError("");
    setStep("loading");

    try {
      const res = await fetch(paystackInitUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountNaira }),
      });
      const body = (await res.json().catch(() => null)) as
        | { error?: string; authorizationUrl?: string }
        | null;

      if (!res.ok || !body?.authorizationUrl) {
        throw new Error(body?.error ?? "Could not start Paystack payment");
      }

      window.location.href = body.authorizationUrl;
    } catch (err) {
      setStep("checkout");
      setError(err instanceof Error ? err.message : "Could not start payment");
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
              {title ?? (isTrip ? "Pay for your delivery" : "Fund your wallet")}
            </p>
            <p className="mt-1 text-sm text-white/55">
              {subtitle ?? (
                <>
                  Pay{" "}
                  <span className="font-semibold text-white">
                    ₦{amountNaira.toLocaleString("en-NG")}
                  </span>
                  {isTrip ? (
                    " securely with Paystack"
                  ) : (
                    <>
                      {" "}
                      for{" "}
                      <span className="font-semibold text-accent">
                        {trips} trip{trips === 1 ? "" : "s"}
                      </span>{" "}
                      via Paystack
                    </>
                  )}
                </>
              )}
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

        {step === "checkout" && (
          <>
            <div className="rounded-xl border border-accent/25 bg-accent/10 p-4">
              <div className="flex items-center gap-3">
                <CreditCard className="h-8 w-8 text-accent" />
                <div>
                  <p className="text-sm font-bold text-white">Paystack checkout</p>
                  <p className="mt-1 text-xs leading-relaxed text-white/55">
                    Card, bank transfer, USSD, and other Paystack channels.
                  </p>
                </div>
              </div>
            </div>

            {error && (
              <p className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={() => void payWithPaystack()}
              className="mt-4 w-full rounded-xl bg-accent py-3.5 text-sm font-semibold text-white transition-transform active:scale-[0.98]"
            >
              Continue to Paystack — ₦{amountNaira.toLocaleString("en-NG")}
            </button>
          </>
        )}

        {step === "loading" && (
          <div className="py-10 text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            <p className="mt-4 text-sm text-white/70">Opening Paystack…</p>
          </div>
        )}

        {step === "success" && (
          <div className="py-8 text-center">
            <div className="success-pop mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 ring-4 ring-emerald-400/20">
              <CheckCircle2 className="h-10 w-10 text-emerald-400" />
            </div>
            <p className="mt-4 text-lg font-bold text-white">Successful!</p>
            <p className="mt-2 text-sm text-white/60">
              {formatNairaFromKobo(amountNaira * 100)} added to your wallet.
            </p>
            <button
              type="button"
              onClick={() => {
                onSuccess();
                onClose();
              }}
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
