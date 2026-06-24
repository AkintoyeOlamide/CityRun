"use client";

import { useCallback, useEffect, useState } from "react";
import { Eye, EyeOff, Trash2 } from "lucide-react";
import { AddressAutocomplete } from "@/components/city-run/AddressAutocomplete";
import { PasswordInput } from "@/components/city-run/PasswordInput";
import { AdminShell } from "@/components/city-run/admin/AdminShell";
import {
  ADMIN_INPUT,
  AdminAlert,
  AdminBtn,
  AdminCard,
  AdminEmpty,
  AdminField,
  AdminPageHeader,
  AdminSkeleton,
} from "@/components/city-run/admin/AdminUI";
import type { AddressValue, VendorAdmin } from "@/lib/city-run/types";

const emptyAddress = (): AddressValue => ({ formatted: "" });

export function AdminVendorsPanel() {
  const [vendors, setVendors] = useState<VendorAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [createdVendor, setCreatedVendor] = useState<VendorAdmin | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [businessAddress, setBusinessAddress] = useState<AddressValue>(emptyAddress());

  const load = useCallback(async () => {
    setLoadError("");
    const res = await fetch("/api/cityrun/admin/vendors");
    if (res.ok) {
      setVendors(await res.json());
    } else {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      setLoadError(body?.error ?? "Could not load vendors");
      setVendors([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    setCreatedVendor(null);
    const savedPassword = password;

    try {
      const res = await fetch("/api/cityrun/admin/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          fullName,
          phone,
          businessName,
          businessAddress,
        }),
      });
      const body = (await res.json()) as VendorAdmin & { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Could not create vendor");

      setCreatedVendor({ ...body, loginPassword: body.loginPassword ?? savedPassword });
      setMessage(`${businessName} onboarded.`);
      setEmail("");
      setPassword("");
      setFullName("");
      setPhone("");
      setBusinessName("");
      setBusinessAddress(emptyAddress());
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  const allSelected = vendors.length > 0 && vendors.every((v) => selectedIds.has(v.id));

  async function deleteSelected() {
    const ids = [...selectedIds];
    if (!ids.length || !window.confirm(`Delete ${ids.length} vendor(s)?`)) return;
    setDeleting(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/cityrun/admin/vendors", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const body = (await res.json()) as { error?: string; count?: number };
      if (!res.ok) throw new Error(body.error ?? "Delete failed");
      setSelectedIds(new Set());
      setMessage(`Deleted ${body.count ?? ids.length}.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AdminShell title="Vendors">
      <AdminPageHeader
        title={`${vendors.length} vendor${vendors.length === 1 ? "" : "s"}`}
        action={
          <AdminBtn variant="primary" onClick={() => setShowForm((v) => !v)}>
            {showForm ? "Cancel" : "+ Add vendor"}
          </AdminBtn>
        }
      />

      {showForm && (
        <AdminCard className="mb-3">
          <form onSubmit={handleCreate} className="grid gap-3 sm:grid-cols-2" autoComplete="off">
            <AdminField label="Vendor name">
              <input
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className={ADMIN_INPUT}
                placeholder="e.g. Mama Put Kitchen"
                required
              />
            </AdminField>
            <AdminField label="Contact person">
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={ADMIN_INPUT}
                required
              />
            </AdminField>
            <AdminField label="Email (login)">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={ADMIN_INPUT}
                required
              />
            </AdminField>
            <AdminField label="Password">
              <PasswordInput
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                inputClassName={`${ADMIN_INPUT} pr-10`}
                minLength={6}
                required
              />
            </AdminField>
            <AdminField label="Phone">
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={ADMIN_INPUT}
                type="tel"
                placeholder="+234…"
                required
              />
            </AdminField>
            <div className="sm:col-span-2">
              <AddressAutocomplete
                id="vendor-pickup"
                label="Pickup address (vendor shop)"
                placeholder="Where riders pick up from"
                value={businessAddress}
                onChange={setBusinessAddress}
              />
            </div>
            <div className="sm:col-span-2">
              {error && <AdminAlert tone="error">{error}</AdminAlert>}
              {message && <AdminAlert tone="success">{message}</AdminAlert>}
              {createdVendor && (
                <AdminAlert tone="success">
                  {createdVendor.businessName} · {createdVendor.email} · pwd:{" "}
                  {createdVendor.loginPassword}
                </AdminAlert>
              )}
              <button
                type="submit"
                disabled={saving || businessAddress.formatted.trim().length <= 5}
                className="mt-2 w-full rounded-md bg-accent py-2 text-[13px] font-medium text-white disabled:opacity-40 sm:w-auto sm:px-6"
              >
                {saving ? "Creating…" : "Create vendor"}
              </button>
            </div>
          </form>
        </AdminCard>
      )}

      {loadError && <AdminAlert tone="error">{loadError}</AdminAlert>}
      {error && !showForm && <AdminAlert tone="error">{error}</AdminAlert>}
      {message && !showForm && !createdVendor && <AdminAlert tone="success">{message}</AdminAlert>}

      {vendors.length > 0 && (
        <div className="mb-3 flex items-center gap-2">
          <label className="admin-checkbox-label flex cursor-pointer items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={() =>
                setSelectedIds(allSelected ? new Set() : new Set(vendors.map((v) => v.id)))
              }
              className="h-3.5 w-3.5 rounded accent-accent"
            />
            All
          </label>
          <AdminBtn variant="danger" disabled={!selectedIds.size || deleting} onClick={deleteSelected}>
            <Trash2 className="h-3.5 w-3.5" />
            Delete{selectedIds.size ? ` (${selectedIds.size})` : ""}
          </AdminBtn>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          <AdminSkeleton className="h-12" />
          <AdminSkeleton className="h-12" />
        </div>
      ) : vendors.length === 0 ? (
        <AdminEmpty title="No vendors yet — add one above" />
      ) : (
        <AdminCard padding="p-0" className="overflow-hidden">
          <table className="admin-table w-full text-sm">
              <thead>
                <tr className="text-[0.65rem] font-semibold uppercase tracking-wide">
                  <th className="w-8" />
                  <th>Vendor</th>
                  <th>Pickup</th>
                  <th>Orders</th>
                  <th>Login</th>
                </tr>
              </thead>
              <tbody>
                {vendors.map((vendor) => (
                  <tr key={vendor.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(vendor.id)}
                        onChange={() => {
                          setSelectedIds((prev) => {
                            const next = new Set(prev);
                            if (next.has(vendor.id)) next.delete(vendor.id);
                            else next.add(vendor.id);
                            return next;
                          });
                        }}
                        className="h-3.5 w-3.5 rounded accent-accent"
                      />
                    </td>
                    <td>
                      <p className="admin-title font-medium">{vendor.businessName}</p>
                      <p className="admin-subtitle text-xs">
                        {vendor.fullName}
                        {vendor.phone ? ` · ${vendor.phone}` : ""}
                      </p>
                    </td>
                    <td className="admin-subtitle max-w-[200px] truncate text-xs">
                      {vendor.businessAddress?.formatted ?? "—"}
                    </td>
                    <td className="admin-subtitle text-xs">
                      {vendor.orderCount} total · {vendor.completedCount} done
                    </td>
                    <td>
                      <p className="text-xs text-accent">{vendor.email}</p>
                      <p className="mt-0.5 flex items-center gap-1 font-mono text-[0.65rem] text-accent">
                        {visiblePasswords.has(vendor.id)
                          ? (vendor.loginPassword ?? "—")
                          : "••••••"}
                        <button
                          type="button"
                          onClick={() => {
                            setVisiblePasswords((p) => {
                              const n = new Set(p);
                              if (n.has(vendor.id)) n.delete(vendor.id);
                              else n.add(vendor.id);
                              return n;
                            });
                          }}
                          className="admin-link-chevron"
                        >
                          {visiblePasswords.has(vendor.id) ? (
                            <EyeOff className="h-3 w-3" />
                          ) : (
                            <Eye className="h-3 w-3" />
                          )}
                        </button>
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
        </AdminCard>
      )}
    </AdminShell>
  );
}
