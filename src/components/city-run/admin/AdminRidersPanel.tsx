"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, Eye, EyeOff, Trash2 } from "lucide-react";
import { AdminShell } from "@/components/city-run/admin/AdminShell";
import { PasswordInput } from "@/components/city-run/PasswordInput";
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
import type { RiderAdmin } from "@/lib/city-run/types";

type RiderListItem = RiderAdmin & {
  rideCount: number;
  completedCount: number;
};

export function AdminRidersPanel() {
  const [riders, setRiders] = useState<RiderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [createdRider, setCreatedRider] = useState<RiderAdmin | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  const load = useCallback(async () => {
    setLoadError("");
    const res = await fetch("/api/cityrun/admin/riders");
    if (res.ok) {
      setRiders(await res.json());
    } else {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      setLoadError(body?.error ?? "Could not load riders");
      setRiders([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleOnboard(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    setCreatedRider(null);
    const savedPassword = password;

    try {
      const res = await fetch("/api/cityrun/admin/riders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, fullName, phone }),
      });
      const body = (await res.json()) as RiderAdmin & { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Could not create rider");

      setCreatedRider({ ...body, loginPassword: body.loginPassword ?? savedPassword });
      setMessage(`@${username} onboarded.`);
      setUsername(""); setPassword(""); setFullName(""); setPhone("");
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(rider: RiderListItem) {
    const res = await fetch(`/api/cityrun/admin/riders/${rider.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !rider.active }),
    });
    if (res.ok) await load();
  }

  const allSelected = riders.length > 0 && riders.every((r) => selectedIds.has(r.id));

  async function deleteSelected() {
    const ids = [...selectedIds];
    if (!ids.length || !window.confirm(`Delete ${ids.length} rider(s)?`)) return;
    setDeleting(true); setError(""); setMessage("");
    try {
      const res = await fetch("/api/cityrun/admin/riders", {
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
    <AdminShell title="Riders">
      <AdminPageHeader
        title={`${riders.length} rider${riders.length === 1 ? "" : "s"}`}
        action={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/cityrun/admin/live"
              className="inline-flex items-center justify-center rounded-md border border-[var(--admin-border)] px-2.5 py-1.5 text-[11px] font-medium transition-colors hover:border-accent/30"
            >
              Live map
            </Link>
            <AdminBtn variant="primary" onClick={() => setShowForm((v) => !v)}>
              {showForm ? "Cancel" : "+ Add rider"}
            </AdminBtn>
          </div>
        }
      />

      {showForm && (
        <AdminCard className="mb-3">
          <form onSubmit={handleOnboard} className="grid gap-3 sm:grid-cols-2" autoComplete="off">
            <AdminField label="Username">
              <input value={username} onChange={(e) => setUsername(e.target.value)} className={ADMIN_INPUT} placeholder="jide_rider" required />
            </AdminField>
            <AdminField label="Password">
              <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} inputClassName={`${ADMIN_INPUT} pr-10`} minLength={6} required />
            </AdminField>
            <AdminField label="Full name">
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} className={ADMIN_INPUT} required />
            </AdminField>
            <AdminField label="Phone">
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className={ADMIN_INPUT} type="tel" placeholder="+234…" />
            </AdminField>
            <div className="sm:col-span-2">
              {error && <AdminAlert tone="error">{error}</AdminAlert>}
              {message && <AdminAlert tone="success">{message}</AdminAlert>}
              {createdRider && (
                <AdminAlert tone="success">
                  @{createdRider.username} · pwd: {createdRider.loginPassword}
                </AdminAlert>
              )}
                <button type="submit" disabled={saving} className="mt-2 w-full rounded-md bg-accent py-2 text-[13px] font-medium text-white disabled:opacity-40 sm:w-auto sm:px-6">
                {saving ? "Creating…" : "Create rider"}
              </button>
            </div>
          </form>
        </AdminCard>
      )}

      {loadError && <AdminAlert tone="error">{loadError}</AdminAlert>}
      {error && !showForm && <AdminAlert tone="error">{error}</AdminAlert>}
      {message && !showForm && !createdRider && <AdminAlert tone="success">{message}</AdminAlert>}

      {riders.length > 0 && (
        <div className="mb-3 flex items-center gap-2">
          <label className="admin-checkbox-label flex cursor-pointer items-center gap-2 text-xs">
            <input type="checkbox" checked={allSelected} onChange={() => setSelectedIds(allSelected ? new Set() : new Set(riders.map((r) => r.id)))} className="h-3.5 w-3.5 rounded accent-accent" />
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
      ) : riders.length === 0 ? (
        <AdminEmpty title="No riders yet — add one above" />
      ) : (
        <AdminCard padding="p-0" className="overflow-hidden">
          <table className="admin-table w-full text-sm">
              <thead>
                <tr className="text-[0.65rem] font-semibold uppercase tracking-wide">
                  <th className="w-8" />
                  <th>Rider</th>
                  <th>Rides</th>
                  <th>Status</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {riders.map((rider) => (
                  <tr key={rider.id}>
                    <td>
                      <input type="checkbox" checked={selectedIds.has(rider.id)} onChange={() => {
                        setSelectedIds((prev) => {
                          const next = new Set(prev);
                          if (next.has(rider.id)) next.delete(rider.id); else next.add(rider.id);
                          return next;
                        });
                      }} className="h-3.5 w-3.5 rounded accent-accent" />
                    </td>
                    <td>
                      <p className="admin-title font-medium">{rider.fullName}</p>
                      <p className="admin-subtitle text-xs">@{rider.username}{rider.phone ? ` · ${rider.phone}` : ""}</p>
                      <p className="mt-0.5 flex items-center gap-1 font-mono text-[0.65rem] text-accent">
                        {visiblePasswords.has(rider.id) ? (rider.loginPassword ?? "—") : "••••••"}
                        <button type="button" onClick={() => setVisiblePasswords((p) => {
                          const n = new Set(p);
                          if (n.has(rider.id)) n.delete(rider.id); else n.add(rider.id);
                          return n;
                        })} className="admin-link-chevron">
                          {visiblePasswords.has(rider.id) ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </button>
                      </p>
                    </td>
                    <td className="admin-subtitle text-xs">
                      {rider.rideCount} total · {rider.completedCount} done
                    </td>
                    <td>
                      <button type="button" onClick={() => toggleActive(rider)} className={`rounded-md px-2 py-0.5 text-[0.65rem] font-bold uppercase ${rider.active ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300"}`}>
                        {rider.active ? "Active" : "Off"}
                      </button>
                    </td>
                    <td>
                      <Link href={`/cityrun/admin/riders/${rider.id}`} className="admin-link-chevron">
                        <ChevronRight className="h-4 w-4" />
                      </Link>
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
