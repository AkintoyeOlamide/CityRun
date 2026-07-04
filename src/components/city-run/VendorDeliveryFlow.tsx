"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { CityRunShell } from "@/components/city-run/CityRunShell";
import { BusinessPickupField } from "@/components/city-run/BusinessPickupField";
import { AddressAutocomplete } from "@/components/city-run/AddressAutocomplete";
import { ImageUploadField } from "@/components/city-run/ImageUploadField";
import { useAuth } from "@/lib/auth/use-auth";
import type { AddressValue, SavedClient } from "@/lib/city-run/types";

const emptyAddress = (): AddressValue => ({ formatted: "" });

type DeliveryStop = {
  id: string;
  dropoff: AddressValue;
  contactPhone: string;
  contactName: string;
  savedClientId: string | null;
};

type Step = "deliveries" | "details" | "confirm";

function newStop(): DeliveryStop {
  return {
    id: crypto.randomUUID(),
    dropoff: emptyAddress(),
    contactPhone: "",
    contactName: "",
    savedClientId: null,
  };
}

export function VendorDeliveryFlow() {
  const router = useRouter();
  const { profile } = useAuth();
  const businessAddress = profile?.businessAddress;
  const savedClients = profile?.savedClients ?? [];

  const [pickup, setPickup] = useState<AddressValue>(
    () => businessAddress ?? emptyAddress(),
  );

  const [step, setStep] = useState<Step>("deliveries");
  const [stops, setStops] = useState<DeliveryStop[]>([newStop()]);
  const [itemDescription, setItemDescription] = useState("");
  const [itemSize, setItemSize] = useState<"small" | "medium" | "large">("medium");
  const [notes, setNotes] = useState("");
  const [itemPhotoUrl, setItemPhotoUrl] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function updateStop(id: string, patch: Partial<DeliveryStop>) {
    setStops((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  function applySavedClient(stopId: string, client: SavedClient) {
    updateStop(stopId, {
      savedClientId: client.id,
      dropoff: client.address,
      contactPhone: client.contactPhone,
      contactName: client.contactName,
    });
  }

  function clearSavedClient(stopId: string) {
    updateStop(stopId, {
      savedClientId: null,
      dropoff: emptyAddress(),
      contactPhone: "",
      contactName: "",
    });
  }

  function addStop() {
    setStops((prev) => [...prev, newStop()]);
  }

  function removeStop(id: string) {
    setStops((prev) => (prev.length <= 1 ? prev : prev.filter((s) => s.id !== id)));
  }

  const addressValid = (addr: AddressValue) => addr.formatted.trim().length > 5;

  const deliveriesValid = stops.every(
    (s) => addressValid(s.dropoff) && s.contactPhone.trim().length >= 10,
  );

  const canSubmit = itemDescription.trim().length > 0 && deliveriesValid;

  async function handleSubmit() {
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/cityrun/orders/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "send",
          pickup,
          stops: stops.map((s) => ({
            dropoff: s.dropoff,
            contactPhone: s.contactPhone.trim(),
            contactName: s.contactName.trim() || "Recipient",
          })),
          itemDescription,
          itemSize,
          notes,
          ...(itemPhotoUrl ? { itemPhotoUrl } : {}),
        }),
      });
      const body = (await res.json().catch(() => null)) as
        | { error?: string; redirectTo?: string }
        | null;
      if (!res.ok) {
        throw new Error(body?.error ?? "Could not create deliveries");
      }
      router.push(body?.redirectTo ?? "/cityrun/account");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <CityRunShell title="Book deliveries">
      <div className="px-4 py-5 pb-8">
        <StepIndicator step={step} multi={stops.length > 1} />

        {!businessAddress?.formatted && (
          <p className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            Your pickup address is not set yet. Contact City Run support.
          </p>
        )}

        {businessAddress?.formatted && (
          <div className="mb-5">
            <BusinessPickupField
              label="Pickup (your shop)"
              defaultAddress={businessAddress}
              value={pickup}
              onChange={setPickup}
              placeholder="Where should we collect items?"
            />
          </div>
        )}

        {step === "deliveries" && (
          <div className="space-y-5">
            {stops.map((stop, index) => (
              <div
                key={stop.id}
                className="rounded-xl border border-white/10 bg-cr-surface p-4"
              >
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold text-white/90">
                    Delivery {index + 1}
                    {stops.length > 1 ? ` of ${stops.length}` : ""}
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

                <div className="mt-3 space-y-3">
                  <AddressAutocomplete
                    id={`dropoff-${stop.id}`}
                    label="Delivery address"
                    placeholder="Where should we deliver?"
                    value={stop.dropoff}
                    onChange={(addr) =>
                      updateStop(stop.id, { dropoff: addr, savedClientId: null })
                    }
                  />
                  <Field label="Receiver phone">
                    <input
                      type="tel"
                      value={stop.contactPhone}
                      onChange={(e) =>
                        updateStop(stop.id, { contactPhone: e.target.value })
                      }
                      placeholder="0801 234 5678"
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Receiver name (optional)">
                    <input
                      type="text"
                      value={stop.contactName}
                      onChange={(e) =>
                        updateStop(stop.id, { contactName: e.target.value })
                      }
                      placeholder="Who receives the package"
                      className={inputClass}
                    />
                  </Field>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={addStop}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 py-3 text-sm font-medium text-white/70 hover:border-accent/40 hover:text-accent"
            >
              <Plus className="h-4 w-4" />
              Add another delivery
            </button>

            <button
              type="button"
              disabled={!deliveriesValid || !pickup?.formatted}
              onClick={() => setStep("details")}
              className="w-full rounded-xl bg-accent py-3.5 text-base font-semibold text-white disabled:opacity-40"
            >
              Continue
            </button>
          </div>
        )}

        {step === "details" && (
          <div className="space-y-4">
            <Field label="What are you sending?">
              <textarea
                value={itemDescription}
                onChange={(e) => setItemDescription(e.target.value)}
                rows={3}
                placeholder="Describe the item(s) for all deliveries"
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
              label="Item photo (optional)"
              folder="items"
              value={itemPhotoUrl}
              onChange={setItemPhotoUrl}
            />
            <Field label="Notes (optional)">
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Gate code, landmark, etc."
                className={inputClass}
              />
            </Field>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep("deliveries")}
                className="flex-1 rounded-xl border border-white/15 py-3.5 text-sm font-medium"
              >
                Back
              </button>
              <button
                type="button"
                disabled={!itemDescription.trim()}
                onClick={() => setStep("confirm")}
                className="flex-1 rounded-xl bg-accent py-3.5 text-sm font-semibold text-white disabled:opacity-40"
              >
                Review
              </button>
            </div>
          </div>
        )}

        {step === "confirm" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-white/10 bg-cr-surface p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-white/45">
                Pickup
              </p>
              <p className="mt-1 text-sm">{pickup?.formatted}</p>
            </div>

            <ul className="space-y-2">
              {stops.map((stop, index) => (
                <li
                  key={stop.id}
                  className="rounded-xl border border-white/10 bg-cr-surface p-4"
                >
                  <p className="text-xs font-medium uppercase tracking-wide text-white/45">
                    Delivery {index + 1}
                  </p>
                  <p className="mt-1 text-sm">{stop.dropoff.formatted}</p>
                  <p className="mt-1 text-xs text-white/55">
                    {stop.contactName || "Recipient"} · {stop.contactPhone}
                  </p>
                </li>
              ))}
            </ul>

            <div className="rounded-xl border border-white/10 bg-cr-surface p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-white/45">
                Item
              </p>
              <p className="mt-1 text-sm">{itemDescription}</p>
              <p className="mt-1 text-xs capitalize text-white/55">{itemSize}</p>
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep("details")}
                className="flex-1 rounded-xl border border-white/15 py-3.5 text-sm font-medium"
              >
                Edit
              </button>
              <button
                type="button"
                disabled={!canSubmit || submitting}
                onClick={handleSubmit}
                className="flex-1 rounded-xl bg-accent py-3.5 text-sm font-semibold text-white disabled:opacity-40"
              >
                {submitting
                  ? "Submitting…"
                  : stops.length > 1
                    ? `Request ${stops.length} deliveries`
                    : "Request delivery"}
              </button>
            </div>
          </div>
        )}
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
            className={`rounded-lg px-3 py-2 text-left text-xs transition-colors ${
              selectedId === client.id
                ? "bg-accent font-semibold text-white"
                : "border border-white/15 bg-cr-surface-muted text-white/70"
            }`}
          >
            <span className="block font-medium">{client.label}</span>
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

function StepIndicator({ step, multi }: { step: Step; multi: boolean }) {
  const steps = [
    { key: "deliveries", label: multi ? "Deliveries" : "Delivery" },
    { key: "details", label: "Details" },
    { key: "confirm", label: "Confirm" },
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
