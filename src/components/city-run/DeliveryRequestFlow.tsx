"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CityRunShell } from "@/components/city-run/CityRunShell";
import { BusinessPickupField } from "@/components/city-run/BusinessPickupField";
import { flowConfig } from "@/lib/city-run/config";
import { isBusinessAccount } from "@/lib/city-run/account-utils";
import { useAuth } from "@/lib/auth/use-auth";
import { formatNairaFromKobo } from "@/lib/city-run/pricing";
import type { AddressValue, DeliveryKind, SavedClient } from "@/lib/city-run/types";
import { warmCurrentLocationLookup } from "@/lib/city-run/use-current-location-address";
import { loadGoogleMapsScript } from "@/lib/city-run/google-maps";

const AddressAutocomplete = dynamic(
  () =>
    import("@/components/city-run/AddressAutocomplete").then((m) => ({
      default: m.AddressAutocomplete,
    })),
  {
    loading: () => (
      <input
        disabled
        placeholder="Loading address search…"
        className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/40"
      />
    ),
  },
);

const ImageUploadField = dynamic(
  () =>
    import("@/components/city-run/ImageUploadField").then((m) => ({
      default: m.ImageUploadField,
    })),
  { ssr: false },
);

const emptyAddress = (): AddressValue => ({ formatted: "" });

type Step = "addresses" | "confirm" | "details";

type DeliveryRequestFlowProps = {
  kind: DeliveryKind;
};

export function DeliveryRequestFlow({ kind }: DeliveryRequestFlowProps) {
  const router = useRouter();
  const { user, profile } = useAuth();
  const config = flowConfig[kind];
  const [step, setStep] = useState<Step>("addresses");
  const [pickup, setPickup] = useState<AddressValue>(emptyAddress);
  const [dropoff, setDropoff] = useState<AddressValue>(emptyAddress);
  const [itemDescription, setItemDescription] = useState("");
  const [itemSize, setItemSize] = useState<"small" | "medium" | "large">("medium");
  const [notes, setNotes] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [itemPhotoUrl, setItemPhotoUrl] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [fareKobo, setFareKobo] = useState<number | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);

  const isBusiness = isBusinessAccount(profile, user);
  const isBusinessSend = isBusiness && kind === "send";
  const businessAddress = profile?.businessAddress;
  const savedClients = profile?.savedClients ?? [];

  const pickupLocked =
    isBusiness && kind === "send" && !!businessAddress?.formatted;
  const dropoffLocked =
    isBusiness && kind === "receive" && !!businessAddress?.formatted;

  useEffect(() => {
    if (kind === "send" && !isBusiness) {
      warmCurrentLocationLookup();
      void loadGoogleMapsScript();
    }
  }, [kind, isBusiness]);

  useEffect(() => {
    if (!isBusiness || !businessAddress?.formatted) return;
    if (kind === "receive") setDropoff(businessAddress);
  }, [isBusiness, businessAddress, kind]);

  useEffect(() => {
    if (isBusiness && (kind === "send" || kind === "store-pickup")) return;
    if (profile?.fullName && !contactName) setContactName(profile.fullName);
    if (profile?.phone && !contactPhone) setContactPhone(profile.phone);
  }, [profile, contactName, contactPhone, isBusiness, kind]);

  const addressValid = (addr: AddressValue) => addr.formatted.trim().length > 5;

  const loadQuote = useCallback(async () => {
    if (!addressValid(pickup) || !addressValid(dropoff)) return;

    setQuoteLoading(true);
    try {
      const quoteRes = await fetch("/api/cityrun/orders/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pickup, dropoff, itemSize }),
      });
      if (quoteRes.ok) {
        const quote = (await quoteRes.json()) as { fareKobo: number };
        setFareKobo(quote.fareKobo);
      }
    } finally {
      setQuoteLoading(false);
    }
  }, [pickup, dropoff, itemSize]);

  useEffect(() => {
    if (isBusinessSend) {
      if (addressValid(pickup) && addressValid(dropoff)) {
        void loadQuote();
      }
      return;
    }
    if (step === "addresses") return;
    void loadQuote();
  }, [step, itemSize, loadQuote, isBusinessSend, pickup, dropoff]);

  function applySavedClient(client: SavedClient) {
    setSelectedClientId(client.id);
    setDropoff(client.address);
    setContactPhone(client.contactPhone);
  }

  function clearSavedClient() {
    setSelectedClientId(null);
    setDropoff(emptyAddress());
    setContactPhone("");
  }

  const canContinueAddresses = (() => {
    if (isBusinessSend) {
      return (
        addressValid(pickup) &&
        addressValid(dropoff) &&
        contactPhone.trim().length >= 10
      );
    }
    if (isBusiness && kind === "receive") {
      return addressValid(pickup) && addressValid(dropoff);
    }
    return addressValid(pickup) && addressValid(dropoff);
  })();

  const canSubmit = isBusinessSend
    ? canContinueAddresses
    : itemDescription.trim().length > 0 &&
      contactName.trim().length > 0 &&
      contactPhone.trim().length >= 10;

  const recipientContact = isBusiness && (kind === "send" || kind === "store-pickup");

  async function handleSubmit() {
    setError("");
    setSubmitting(true);
    try {
      const payload = isBusinessSend
        ? {
            kind,
            pickup,
            dropoff,
            itemDescription: "Business delivery",
            itemSize: "medium" as const,
            notes: "",
            contactName:
              contactName.trim() ||
              profile?.businessName?.trim() ||
              profile?.fullName?.trim() ||
              "Recipient",
            contactPhone: contactPhone.trim(),
          }
        : {
            kind,
            pickup,
            dropoff,
            itemDescription,
            itemSize,
            notes,
            contactName,
            contactPhone,
            ...(itemPhotoUrl ? { itemPhotoUrl } : {}),
          };

      const res = await fetch("/api/cityrun/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await res.json().catch(() => null)) as
        | { error?: string; id?: string }
        | null;
      if (!res.ok) {
        throw new Error(body?.error ?? "Could not create delivery request");
      }
      router.push(`/cityrun/order/${body!.id}`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <CityRunShell title={isBusinessSend ? "Send to client" : config.title}>
      <div className="px-4 py-5 pb-8">
        {!isBusinessSend && <StepIndicator step={step} />}

        {step === "addresses" && (
          <div className="space-y-5">
            {isBusinessSend &&
              (pickupLocked && businessAddress ? (
                <BusinessPickupField
                  label="Pickup"
                  defaultAddress={businessAddress}
                  value={pickup}
                  onChange={setPickup}
                  placeholder={config.pickupPlaceholder}
                />
              ) : (
                <AddressAutocomplete
                  id="pickup"
                  label="Pickup"
                  placeholder={config.pickupPlaceholder}
                  value={pickup}
                  onChange={setPickup}
                  showCurrentLocation={false}
                />
              ))}

            {!isBusinessSend &&
              (pickupLocked ? (
                <LockedAddressCard label={config.pickupLabel} address={pickup} />
              ) : (
                <AddressAutocomplete
                  id="pickup"
                  label={config.pickupLabel}
                  placeholder={config.pickupPlaceholder}
                  value={pickup}
                  onChange={setPickup}
                  autoDetectOnMount={kind === "send" && !isBusiness}
                  lockUntilChange={kind === "send" && !isBusiness}
                  showCurrentLocation={false}
                />
              ))}

            {isBusinessSend && savedClients.length > 0 && (
              <SavedClientPicker
                clients={savedClients}
                selectedId={selectedClientId}
                onSelect={applySavedClient}
                onClear={clearSavedClient}
              />
            )}

            {!isBusinessSend &&
              isBusiness &&
              savedClients.length > 0 &&
              kind === "send" && (
                <SavedClientPicker
                  clients={savedClients}
                  selectedId={selectedClientId}
                  onSelect={applySavedClient}
                  onClear={clearSavedClient}
                />
              )}

            {dropoffLocked ? (
              <LockedAddressCard label={config.dropoffLabel} address={dropoff} />
            ) : (
              <div>
                <AddressAutocomplete
                  id="dropoff"
                  label={isBusinessSend ? "Destination" : config.dropoffLabel}
                  placeholder={
                    isBusinessSend
                      ? "Where should we deliver?"
                      : config.dropoffPlaceholder
                  }
                  value={dropoff}
                  onChange={(addr) => {
                    setSelectedClientId(null);
                    setDropoff(addr);
                  }}
                  showCurrentLocation={!isBusiness}
                />
              </div>
            )}

            {isBusinessSend && (
              <Field label="Receiver phone">
                <input
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="0801 234 5678"
                  className={inputClass}
                  autoComplete="tel"
                  required
                />
              </Field>
            )}

            {isBusinessSend && (
              <>
                <DeliveryQuoteSummary fareKobo={fareKobo} quoteLoading={quoteLoading} />
                {error && <p className="text-sm text-red-400">{error}</p>}
              </>
            )}

            {isBusinessSend ? (
              <button
                type="button"
                disabled={!canSubmit || submitting || !user}
                onClick={handleSubmit}
                className="mt-4 w-full rounded-xl bg-accent py-3.5 text-base font-semibold text-white disabled:opacity-40"
              >
                {submitting
                  ? "Submitting…"
                  : user
                    ? "Request delivery"
                    : "Sign in to request delivery"}
              </button>
            ) : (
              <button
                type="button"
                disabled={!canContinueAddresses}
                onClick={() => setStep("confirm")}
                className="mt-4 w-full rounded-xl bg-accent py-3.5 text-base font-semibold text-white disabled:opacity-40"
              >
                Continue
              </button>
            )}
          </div>
        )}

        {!isBusinessSend && step === "confirm" && (
          <div className="space-y-5">
            <div className="rounded-xl border border-white/10 bg-cr-surface p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-white/45">
                {config.pickupLabel}
              </p>
              <p className="mt-1 text-sm">{pickup.formatted}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-cr-surface p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-white/45">
                {isBusiness && kind === "send" ? "Delivery address" : config.dropoffLabel}
              </p>
              <p className="mt-1 text-sm">{dropoff.formatted}</p>
            </div>
            {pickup.lat && dropoff.lat && (
              <a
                href={`https://www.google.com/maps/dir/?api=1&origin=${pickup.lat},${pickup.lng}&destination=${dropoff.lat},${dropoff.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-center text-sm text-accent"
              >
                Preview route on Google Maps
              </a>
            )}
            <DeliveryQuoteSummary fareKobo={fareKobo} quoteLoading={quoteLoading} />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep("addresses")}
                className="flex-1 rounded-xl border border-white/15 py-3.5 text-sm font-medium"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => setStep("details")}
                className="flex-1 rounded-xl bg-accent py-3.5 text-sm font-semibold text-white"
              >
                Confirm addresses
              </button>
            </div>
          </div>
        )}

        {!isBusinessSend && step === "details" && (
          <div className="space-y-4">
            <Field label="What are you sending?">
              <textarea
                value={itemDescription}
                onChange={(e) => setItemDescription(e.target.value)}
                rows={3}
                placeholder="Describe the item(s)"
                className={inputClass}
              />
            </Field>
            <Field label="Size">
              <div className="grid grid-cols-3 gap-2">
                {(["small", "medium", "large"] as const).map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setItemSize(size)}
                    className={`rounded-lg py-2.5 text-sm capitalize ${
                      itemSize === size
                        ? "bg-accent font-semibold text-white"
                        : "bg-cr-surface text-white/70"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </Field>
            <ImageUploadField
              label="Item photo"
              folder="items"
              value={itemPhotoUrl}
              onChange={setItemPhotoUrl}
            />
            <Field label={recipientContact ? "Recipient name" : "Your name"}>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label={recipientContact ? "Recipient phone" : "Phone number"}>
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="+234 ..."
                className={inputClass}
              />
            </Field>
            <Field label="Notes (optional)">
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Gate code, landmark, etc."
                className={inputClass}
              />
            </Field>
            <DeliveryQuoteSummary fareKobo={fareKobo} quoteLoading={quoteLoading} />
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button
              type="button"
              disabled={!canSubmit || submitting}
              onClick={handleSubmit}
              className="w-full rounded-xl bg-accent py-3.5 text-base font-semibold text-white disabled:opacity-40"
            >
              {submitting ? "Submitting…" : "Request delivery"}
            </button>
          </div>
        )}
      </div>
    </CityRunShell>
  );
}

function DeliveryQuoteSummary({
  fareKobo,
  quoteLoading,
}: {
  fareKobo: number | null;
  quoteLoading: boolean;
}) {
  if (quoteLoading) {
    return (
      <p className="rounded-xl border border-white/10 bg-cr-surface px-4 py-3 text-sm text-white/50">
        Calculating delivery fee…
      </p>
    );
  }

  if (!fareKobo) return null;

  return (
    <div className="rounded-xl border border-white/10 bg-cr-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-white/70">Estimated delivery fee</p>
        <p className="text-lg font-bold text-white">{formatNairaFromKobo(fareKobo)}</p>
      </div>
    </div>
  );
}

function LockedAddressCard({
  label,
  address,
}: {
  label: string;
  address: AddressValue;
}) {
  return (
    <div className="rounded-xl border border-accent/25 bg-accent/10 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-accent/80">
        {label} (your business)
      </p>
      <p className="mt-1 text-sm">{address.formatted || "Not set yet"}</p>
    </div>
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
      <p className="mb-2 text-sm font-medium text-white/80">Saved clients</p>
      <div className="flex flex-wrap gap-2">
        {clients.map((client) => (
          <button
            key={client.id}
            type="button"
            onClick={() => onSelect(client)}
            className={`rounded-lg px-3 py-2 text-left text-xs transition-colors ${
              selectedId === client.id
                ? "bg-accent font-semibold text-white"
                : "border border-white/15 bg-cr-surface text-white/70 hover:border-white/25"
            }`}
          >
            <span className="block font-medium">{client.label}</span>
            <span className="mt-0.5 block truncate text-[0.65rem] opacity-70">
              {client.address.formatted}
            </span>
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

function StepIndicator({ step }: { step: Step }) {
  const steps = [
    { key: "addresses", label: "Address" },
    { key: "confirm", label: "Confirm" },
    { key: "details", label: "Details" },
  ] as const;
  const current = steps.findIndex((s) => s.key === step);

  return (
    <div className="mb-6 flex gap-2">
      {steps.map((s, i) => (
        <div key={s.key} className="flex-1">
          <div
            className={`h-1 rounded-full ${i <= current ? "bg-accent" : "bg-white/15"}`}
          />
          <p
            className={`mt-1 text-[0.65rem] ${i <= current ? "text-white" : "text-white/35"}`}
          >
            {s.label}
          </p>
        </div>
      ))}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-white/80">{label}</label>
      {children}
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-white/10 bg-cr-surface px-4 py-3 text-base text-white placeholder:text-white/35 outline-none focus:border-accent";
