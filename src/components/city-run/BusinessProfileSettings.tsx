"use client";

import { useEffect, useState } from "react";
import { MapPin, Plus, Trash2, User } from "lucide-react";
import { AddressAutocomplete } from "@/components/city-run/AddressAutocomplete";
import { OPS_INPUT, OpsAlert } from "@/components/city-run/ops/OpsUI";
import { isBusinessAccount } from "@/lib/city-run/account-utils";
import type { AddressValue, SavedClient, UserProfile } from "@/lib/city-run/types";

type BusinessProfileSettingsProps = {
  profile: UserProfile;
  onSaved: () => void;
  readOnlyPickup?: boolean;
};

const emptyAddress = (): AddressValue => ({ formatted: "" });

export function BusinessProfileSettings({
  profile,
  onSaved,
  readOnlyPickup = false,
}: BusinessProfileSettingsProps) {
  const isBusiness = isBusinessAccount(profile);

  const [businessName, setBusinessName] = useState(profile.businessName ?? "");
  const [natureOfGoods, setNatureOfGoods] = useState(profile.natureOfGoods ?? "");
  const [fullName, setFullName] = useState(profile.fullName);
  const [phone, setPhone] = useState(profile.phone);
  const [businessAddress, setBusinessAddress] = useState<AddressValue>(
    profile.businessAddress ?? emptyAddress(),
  );
  const [savedClients, setSavedClients] = useState<SavedClient[]>(
    profile.savedClients ?? [],
  );
  const [showAddClient, setShowAddClient] = useState(false);
  const [clientAddress, setClientAddress] = useState<AddressValue>(emptyAddress());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    setBusinessName(profile.businessName ?? "");
    setNatureOfGoods(profile.natureOfGoods ?? "");
    setFullName(profile.fullName);
    setPhone(profile.phone);
    setBusinessAddress(profile.businessAddress ?? emptyAddress());
    setSavedClients(profile.savedClients ?? []);
  }, [profile]);

  async function saveProfile(patch: {
    businessName?: string;
    natureOfGoods?: string;
    fullName?: string;
    phone?: string;
    businessAddress?: AddressValue;
    savedClients?: SavedClient[];
  }) {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/cityrun/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: patch.fullName ?? fullName,
          phone: patch.phone ?? phone,
          accountType: profile.accountType,
          ...(isBusiness
            ? {
                businessName: patch.businessName ?? businessName,
                natureOfGoods: patch.natureOfGoods ?? natureOfGoods,
              }
            : { businessName: profile.businessName }),
          ...(!isBusiness && !readOnlyPickup
            ? { businessAddress: patch.businessAddress ?? businessAddress }
            : {}),
          savedClients: patch.savedClients ?? savedClients,
        }),
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Could not save");
      setSuccess("Saved.");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function handleSaveBusinessProfile() {
    if (!fullName.trim() || !phone.trim()) {
      setError("Contact name and phone are required.");
      return;
    }
    if (isBusiness && !businessName.trim()) {
      setError("Business name is required.");
      return;
    }
    if (isBusiness && !natureOfGoods.trim()) {
      setError("Nature of goods is required.");
      return;
    }
    if (!readOnlyPickup && !isBusiness && businessAddress.formatted.trim().length <= 5) {
      setError("Business pickup address is required.");
      return;
    }
    void saveProfile({});
  }

  function handleAddClient() {
    if (clientAddress.formatted.trim().length <= 5) {
      setError("Delivery address is required.");
      return;
    }

    const next: SavedClient[] = [
      ...savedClients,
      {
        id: crypto.randomUUID(),
        label: clientAddress.formatted.split(",")[0]?.trim() || "Delivery",
        contactName: "Recipient",
        contactPhone: phone.trim() || profile.phone.trim(),
        address: clientAddress,
      },
    ];
    setSavedClients(next);
    setClientAddress(emptyAddress());
    setShowAddClient(false);
    void saveProfile({ savedClients: next });
  }

  function handleRemoveClient(id: string) {
    const next = savedClients.filter((c) => c.id !== id);
    setSavedClients(next);
    void saveProfile({ savedClients: next });
  }

  return (
    <div className="cr-glass-card cr-glow-ring space-y-5 rounded-2xl p-4">
      <div>
        <h2 className="text-lg font-bold">
          {isBusiness ? "Business profile" : readOnlyPickup ? "Delivery addresses" : "Business locations"}
        </h2>
        <p className="cr-text-muted mt-1 text-sm">
          {isBusiness
            ? "Update your business details. Pickup address and nature of goods are used when you send items."
            : readOnlyPickup
              ? "Save delivery addresses you use often for faster booking."
              : "Your business address is used as pickup. Save client addresses for faster deliveries."}
        </p>
      </div>

      {isBusiness && (
        <div className="space-y-3">
          <Field label="Business name">
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className={OPS_INPUT}
              placeholder="Company name"
            />
          </Field>
          <Field label="Nature of goods">
            <input
              type="text"
              value={natureOfGoods}
              onChange={(e) => setNatureOfGoods(e.target.value)}
              className={OPS_INPUT}
              placeholder="e.g. Electronics, food, documents"
            />
          </Field>
          <Field label="Contact person" icon={User}>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={OPS_INPUT}
              placeholder="Who we should call"
            />
          </Field>
          <Field label="Contact phone">
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={OPS_INPUT}
              placeholder="0801 234 5678"
            />
          </Field>
        </div>
      )}

      {readOnlyPickup ? (
        profile.businessAddress?.formatted && (
          <div className="rounded-xl border border-accent/25 bg-accent/10 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-accent/80">
              {isBusiness
                ? "Pickup address (from registration)"
                : "Pickup address (set by admin)"}
            </p>
            <p className="mt-1 text-sm">{profile.businessAddress.formatted}</p>
            {isBusiness && (
              <p className="mt-2 text-xs text-white/45">
                Used automatically when you send items.
              </p>
            )}
          </div>
        )
      ) : (
        <div>
          <AddressAutocomplete
            id="business-address"
            label="Business address (pickup)"
            placeholder="Your shop or office address"
            value={businessAddress}
            onChange={setBusinessAddress}
          />
        </div>
      )}

      {isBusiness && (
        <button
          type="button"
          disabled={saving}
          onClick={handleSaveBusinessProfile}
          className="w-full rounded-lg bg-accent py-2.5 text-sm font-semibold text-white disabled:opacity-40"
        >
          {saving ? "Saving…" : "Save business profile"}
        </button>
      )}

      {!isBusiness && !readOnlyPickup && (
        <button
          type="button"
          disabled={saving || businessAddress.formatted.trim().length <= 5}
          onClick={() => void saveProfile({ businessAddress })}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          {saving ? "Saving…" : "Save business address"}
        </button>
      )}

      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className="cr-text-label text-sm font-semibold">Saved delivery addresses</p>
          <button
            type="button"
            onClick={() => setShowAddClient((v) => !v)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-accent"
          >
            <Plus className="h-3.5 w-3.5" />
            Add address
          </button>
        </div>

        {savedClients.length === 0 && !showAddClient && (
          <p className="rounded-xl border border-dashed border-white/15 px-4 py-6 text-center text-sm text-white/45">
            No saved addresses yet. Add ones you deliver to often.
          </p>
        )}

        <ul className="space-y-2">
          {savedClients.map((client) => (
            <li
              key={client.id}
              className="flex items-start gap-3 rounded-xl border border-white/10 bg-cr-surface p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{client.address.formatted}</p>
              </div>
              <button
                type="button"
                onClick={() => handleRemoveClient(client.id)}
                className="shrink-0 rounded-lg p-2 text-white/40 hover:bg-red-500/10 hover:text-red-400"
                aria-label="Remove saved address"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>

        {showAddClient && (
          <div className="mt-3 space-y-3 rounded-xl border border-white/10 bg-cr-surface-muted p-4">
            <AddressAutocomplete
              id="client-address"
              label="Delivery address"
              placeholder="Delivery address"
              value={clientAddress}
              onChange={setClientAddress}
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowAddClient(false)}
                className="flex-1 rounded-lg border border-white/15 py-2.5 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleAddClient}
                className="flex-1 rounded-lg bg-accent py-2.5 text-sm font-semibold text-white disabled:opacity-40"
              >
                Save address
              </button>
            </div>
          </div>
        )}
      </div>

      {error && <OpsAlert tone="error">{error}</OpsAlert>}
      {success && <OpsAlert tone="success">{success}</OpsAlert>}
    </div>
  );
}

function Field({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon?: typeof MapPin;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="cr-text-label mb-2 flex items-center gap-1.5 text-sm font-semibold">
        {Icon && <Icon className="h-3.5 w-3.5 text-white/50" strokeWidth={2.25} />}
        {label}
      </label>
      {children}
    </div>
  );
}
