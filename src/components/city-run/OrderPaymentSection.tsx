"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CreditCard, Loader2, Wallet } from "lucide-react";
import { formatNairaFromKobo } from "@/lib/city-run/pricing";
import {
  isOrderPaid,
  orderAwaitingPayment,
  orderDueKobo,
} from "@/lib/city-run/order-payment";
import { WALLET_TRIP_PRICE_NAIRA } from "@/lib/city-run/wallet-config";
import { useWalletSummary } from "@/lib/city-run/use-wallet-summary";
import { useAuth } from "@/lib/auth/use-auth";
import type { DeliveryOrder } from "@/lib/city-run/types";

type OrderPaymentSectionProps = {
  order: DeliveryOrder;
  onPaid: (order: DeliveryOrder) => void;
};

export function OrderPaymentSection({ order, onPaid }: OrderPaymentSectionProps) {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [payingPaystack, setPayingPaystack] = useState(false);
  const [payingWallet, setPayingWallet] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const { balanceKobo, loading: walletLoading } = useWalletSummary(Boolean(user));

  const dueKobo = orderDueKobo(order) || WALLET_TRIP_PRICE_NAIRA * 100;
  const canPayWithWallet = balanceKobo >= dueKobo;

  useEffect(() => {
    if (user?.email && !email) {
      setEmail(user.email);
    }
  }, [user?.email, email]);

  const verifyReturn = useCallback(async () => {
    const ref = searchParams.get("ref");
    if (searchParams.get("payment") !== "verify" || !ref) return;

    setVerifying(true);
    setError("");
    try {
      const res = await fetch(
        `/api/cityrun/orders/${order.id}/pay/verify?reference=${encodeURIComponent(ref)}`,
      );
      const body = (await res.json().catch(() => null)) as
        | { error?: string; order?: DeliveryOrder }
        | null;
      if (!res.ok) {
        throw new Error(body?.error ?? "Payment verification failed");
      }
      if (body?.order) {
        onPaid(body.order);
      } else {
        onPaid(order);
      }

      const url = new URL(window.location.href);
      url.searchParams.delete("payment");
      url.searchParams.delete("ref");
      window.history.replaceState({}, "", url.toString());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment verification failed");
    } finally {
      setVerifying(false);
    }
  }, [order, onPaid, searchParams]);

  useEffect(() => {
    void verifyReturn();
  }, [verifyReturn]);

  async function payWithPaystack() {
    setPayingPaystack(true);
    setError("");
    try {
      const res = await fetch(`/api/cityrun/orders/${order.id}/pay/paystack`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() || undefined }),
      });
      const body = (await res.json().catch(() => null)) as
        | { error?: string; authorizationUrl?: string }
        | null;
      if (!res.ok || !body?.authorizationUrl) {
        throw new Error(body?.error ?? "Could not start Paystack payment");
      }
      window.location.href = body.authorizationUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start payment");
      setPayingPaystack(false);
    }
  }

  async function payWithWallet() {
    setPayingWallet(true);
    setError("");
    try {
      const res = await fetch(`/api/cityrun/orders/${order.id}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ useWallet: true }),
      });
      const body = (await res.json().catch(() => null)) as
        | { error?: string; order?: DeliveryOrder }
        | null;
      if (!res.ok) {
        throw new Error(body?.error ?? "Wallet payment failed");
      }
      if (body?.order) {
        onPaid(body.order);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wallet payment failed");
    } finally {
      setPayingWallet(false);
    }
  }

  if (verifying) {
    return (
      <div className="cr-glass-card flex items-center justify-center gap-3 rounded-2xl px-5 py-8">
        <Loader2 className="h-5 w-5 animate-spin text-accent" />
        <p className="text-sm font-medium text-white/80">Confirming your Paystack payment…</p>
      </div>
    );
  }

  if (!orderAwaitingPayment(order)) {
    if (isOrderPaid(order) && order.status === "arrived_at_dropoff") {
      return (
        <div className="rounded-2xl border border-emerald-400/35 bg-emerald-500/15 px-4 py-4">
          <p className="text-sm font-bold text-emerald-200">Payment received</p>
          <p className="mt-1 text-sm text-emerald-100/80">
            Your rider can now complete the delivery.
          </p>
        </div>
      );
    }
    return null;
  }

  return (
    <section className="cr-glass-card cr-glow-ring overflow-hidden rounded-2xl border-2 border-accent/40">
      <div className="bg-accent/20 px-5 py-4">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent">
          Payment due
        </p>
        <h3 className="cr-text-headline mt-2 text-2xl font-bold">
          Pay {formatNairaFromKobo(dueKobo)} to receive your delivery
        </h3>
        <p className="cr-text-body mt-2 text-sm leading-relaxed">
          Your rider is at the destination. Pay securely with Paystack — card,
          bank, or USSD.
        </p>
      </div>

      <div className="space-y-3 px-5 py-4">
        {!user && (
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-white/70">
              Email for payment receipt
            </span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-white/10 bg-cr-surface px-4 py-3 text-sm text-white outline-none focus:border-accent"
            />
          </label>
        )}

        <button
          type="button"
          disabled={payingPaystack || (!user && !email.includes("@"))}
          onClick={() => void payWithPaystack()}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-accent py-4 text-base font-bold text-white disabled:opacity-50"
        >
          <CreditCard className="h-5 w-5" />
          {payingPaystack ? "Opening Paystack…" : "Pay with Paystack"}
        </button>

        {user && !walletLoading && canPayWithWallet && (
          <button
            type="button"
            disabled={payingWallet}
            onClick={() => void payWithWallet()}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/8 py-4 text-base font-bold text-white disabled:opacity-50"
          >
            <Wallet className="h-5 w-5" />
            {payingWallet ? "Processing…" : "Pay with wallet balance"}
          </button>
        )}

        {error && (
          <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}
