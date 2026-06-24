"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { CityRunShell } from "@/components/city-run/CityRunShell";
import { AddressAutocomplete } from "@/components/city-run/AddressAutocomplete";
import { useAuth } from "@/lib/auth/use-auth";
import {
  mergeProfileWithUserMetadata,
  resolveBusinessPickup,
  resolveNatureOfGoods,
} from "@/lib/auth/profile-metadata";
import { invalidateMyOrdersCache } from "@/lib/city-run/my-orders-cache";
import type { AddressValue, SavedClient } from "@/lib/city-run/types";

const emptyAddress = (): AddressValue => ({ formatted: "" });

const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none transition-colors focus:border-accent/60 focus:bg-white/[0.05]";

type DeliveryStop = {
  id: string;
  dropoff: AddressValue;
  receiverPhone: string;
  savedClientId: string | null;
};

function newStop(): DeliveryStop {
  return {
    id: crypto.randomUUID(),
    dropoff: emptyAddress(),
    receiverPhone: "",
    savedClientId: null,
  };
}

const addressValid = (addr: AddressValue) => addr.formatted.trim().length > 5;
const phoneValid = (phone: string) => phone.replace(/\D/g, "").length >= 10;

function validateBusinessSend(
  pickup: AddressValue | undefined,
  natureOfGoods: string,
  stops: DeliveryStop[],
): string | null {
  if (!pickup?.formatted || !addressValid(pickup)) {
    return "Your business pickup address could not be loaded. Open Account settings or sign out and sign in again.";
  }
  if (!natureOfGoods.trim()) {
    return "Add your nature of goods in Account settings, then try again.";
  }
  for (let i = 0; i < stops.length; i += 1) {
    const label = stops.length > 1 ? `delivery ${i + 1}` : "delivery";
    if (!addressValid(stops[i].dropoff)) {
      return `Enter a valid delivery address for ${label}.`;
    }
    if (!phoneValid(stops[i].receiverPhone)) {
      return `Enter the receiver phone for ${label} (at least 10 digits).`;
    }
  }
  return null;
}

export function BusinessDeliveryFlow() {
  const router = useRouter();
  const errorRef = useRef<HTMLParagraphElement>(null);
  const { user, profile } = useAuth();
  const mergedProfile = useMemo(
    () => mergeProfileWithUserMetadata(profile, user),
    [profile, user],
  );
  const pickup = resolveBusinessPickup(mergedProfile, user);
  const savedClients = mergedProfile?.savedClients ?? [];
  const natureOfGoods = resolveNatureOfGoods(mergedProfile, user);

  const [stops, setStops] = useState<DeliveryStop[]>([newStop()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function showError(message: string) {
    setError(message);
    requestAnimationFrame(() => {
      errorRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }

  function updateStop(id: string, patch: Partial<DeliveryStop>) {
    setStops((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    setError("");
  }

  function applySavedClient(stopId: string, client: SavedClient) {
    updateStop(stopId, {
      savedClientId: client.id,
      dropoff: client.address,
      receiverPhone: client.contactPhone,
    });
  }

  function clearSavedClient(stopId: string) {
    updateStop(stopId, {
      savedClientId: null,
      dropoff: emptyAddress(),
      receiverPhone: "",
    });
  }

  function addStop() {
    setStops((prev) => [...prev, newStop()]);
  }

  function removeStop(id: string) {
    setStops((prev) => (prev.length <= 1 ? prev : prev.filter((s) => s.id !== id)));
  }

  const profileReady = Boolean(pickup?.formatted && natureOfGoods);
  const validationError = validateBusinessSend(pickup, natureOfGoods, stops);
  const readyToSubmit = profileReady && validationError === null;

  async function handleSubmit() {
    const blocker = validateBusinessSend(pickup, natureOfGoods, stops);
    if (blocker) {
      showError(blocker);
      return;
    }

    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/cityrun/orders/batch", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "send",
          stops: stops.map((s) => ({
            dropoff: s.dropoff,
            contactPhone: s.receiverPhone.trim(),
          })),
        }),
      });
      const body = (await res.json().catch(() => null)) as
        | { error?: string; redirectTo?: string }
        | null;

      if (!res.ok) {
        throw new Error(body?.error ?? "Could not create deliveries");
      }

      invalidateMyOrdersCache();
      const destination = body?.redirectTo ?? "/cityrun/account";
      router.push(destination);
      // Hard navigation fallback if client router does not move
      window.setTimeout(() => {
        if (window.location.pathname.includes("/cityrun/send")) {
          window.location.assign(destination);
        }
      }, 800);
    } catch (err) {
      showError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <CityRunShell title="Send items">
      <div className="px-4 py-5 pb-8">
        {!profileReady && (
          <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            <p className="font-medium">Complete your business profile to send items</p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-amber-200/90">
              {!pickup?.formatted && <li>Pickup address (from registration)</li>}
              {!natureOfGoods && <li>Nature of goods</li>}
            </ul>
            <Link
              href="/cityrun/account"
              className="mt-3 inline-block font-semibold underline"
            >
              Open Account settings
            </Link>
          </div>
        )}

        {pickup?.formatted && (
          <div className="mb-5 rounded-xl border border-accent/25 bg-accent/10 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-accent/80">
              Pickup (your business)
            </p>
            <p className="mt-1 text-sm">{pickup.formatted}</p>
            {natureOfGoods && (
              <p className="mt-2 text-xs text-white/55">Sending: {natureOfGoods}</p>
            )}
            <p className="mt-2 text-xs text-white/45">
              Pickup is from your registered business address — no need to enter it again.
            </p>
          </div>
        )}

        <div className="space-y-5">
          {stops.map((stop, index) => (
            <div
              key={stop.id}
              className="rounded-xl border border-white/10 bg-cr-surface p-4"
            >
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-semibold text-white/90">
                  {stops.length > 1 ? `Delivery ${index + 1}` : "Delivery details"}
                </p>
                {stops.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeStop(stop.id)}
                    className="rounded-lg p-1.5 text-white/40 hover:bg-red-500/10 hover:text-red-400"
                    aria-label="Remove delivery"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              {savedClients.length > 0 && (
                <SavedClientPicker
                  clients={savedClients}
                  selectedId={stop.savedClientId}
                  onSelect={(client) => applySavedClient(stop.id, client)}
                  onClear={() => clearSavedClient(stop.id)}
                />
              )}

              <div className="mt-3 space-y-4">
                <AddressAutocomplete
                  id={`dropoff-${stop.id}`}
                  label="Delivery address"
                  placeholder="Where should we deliver?"
                  value={stop.dropoff}
                  onChange={(addr) =>
                    updateStop(stop.id, { dropoff: addr, savedClientId: null })
                  }
                />

                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-white/70">
                    Receiver phone
                  </span>
                  <input
                    type="tel"
                    value={stop.receiverPhone}
                    onChange={(e) =>
                      updateStop(stop.id, {
                        receiverPhone: e.target.value,
                        savedClientId: null,
                      })
                    }
                    placeholder="0801 234 5678"
                    className={inputClass}
                    autoComplete="tel"
                    required
                  />
                </label>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={addStop}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 py-3 text-sm font-medium text-white/70 hover:border-accent/40 hover:text-accent"
          >
            <Plus className="h-4 w-4" />
            Add another delivery address
          </button>

          {!readyToSubmit && !error && !submitting && (
            <p className="text-center text-xs text-white/40">
              Fill in delivery address and receiver phone to continue.
            </p>
          )}

          {error && (
            <p ref={errorRef} className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </p>
          )}

          <button
            type="button"
            disabled={submitting}
            onClick={() => void handleSubmit()}
            className={`w-full rounded-xl py-3.5 text-base font-semibold text-white transition-opacity ${
              submitting
                ? "bg-accent/70"
                : readyToSubmit
                  ? "bg-accent hover:bg-accent-dark"
                  : "bg-accent/50"
            } disabled:cursor-wait`}
          >
            {submitting
              ? "Submitting…"
              : stops.length > 1
                ? `Request ${stops.length} deliveries`
                : "Request delivery"}
          </button>
        </div>
      </div>
    </CityRunShell>
  );
}

function SavedClientPicker({
  clients,
  selectedId,
  onSelect,
  onClear,
}: {
  clients: SavedClient[];
  selectedId: string | null;
  onSelect: (client: SavedClient) => void;
  onClear: () => void;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium text-white/60">Saved addresses</p>
      <div className="flex flex-wrap gap-2">
        {clients.map((client) => (
          <button
            key={client.id}
            type="button"
            onClick={() => onSelect(client)}
            className={`max-w-full rounded-lg px-3 py-2 text-left text-xs transition-colors ${
              selectedId === client.id
                ? "bg-accent font-semibold text-white"
                : "border border-white/15 bg-cr-surface-muted text-white/70"
            }`}
          >
            <span className="block truncate">{client.address.formatted}</span>
            {client.contactPhone && (
              <span className="mt-0.5 block truncate text-white/50">{client.contactPhone}</span>
            )}
          </button>
        ))}
        {selectedId && (
          <button
            type="button"
            onClick={onClear}
            className="rounded-lg border border-dashed border-white/20 px-3 py-2 text-xs text-white/50"
          >
            New address
          </button>
        )}
      </div>
    </div>
  );
}
