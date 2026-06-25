"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { LogOut, Package, Pencil, Send, Store, PackageOpen } from "lucide-react";
import { isSupabaseConfigured, tryCreateClient } from "@/utils/supabase/client";
import { AuthForm } from "@/components/city-run/AuthForm";
import { completeAuthRedirect } from "@/lib/auth/complete-auth-redirect";
import { BusinessProfileSettings } from "@/components/city-run/BusinessProfileSettings";
import { CityRunBottomNav } from "@/components/city-run/CityRunBottomNav";
import { useAuth } from "@/lib/auth/use-auth";
import { isBusinessAccount, isVendorProfile } from "@/lib/city-run/account-utils";
import {
  customerStatusLabels,
  isActiveDelivery,
} from "@/lib/city-run/status-config";
import { fetchMyOrdersCached, invalidateMyOrdersCache, ORDERS_CHANGED_EVENT } from "@/lib/city-run/my-orders-cache";
import type { DeliveryOrder } from "@/lib/city-run/types";
import { CustomerActiveTripsList } from "@/components/city-run/CustomerActiveTripsList";
import { pickActiveOrders } from "@/lib/city-run/use-active-delivery-order";

const kindIcons = {
  send: Send,
  receive: PackageOpen,
  "store-pickup": Store,
} as const;

type OrderTab = "pending" | "active" | "done";

type AccountDashboardProps = {
  initialAuthMode?: "signin" | "signup" | "forgot";
};

function filterOrders(orders: DeliveryOrder[], tab: OrderTab) {
  if (tab === "pending") {
    return orders.filter((o) => ["pending", "confirmed"].includes(o.status));
  }
  if (tab === "active") {
    return orders.filter((o) => isActiveDelivery(o.status));
  }
  return orders.filter((o) => ["delivered", "cancelled"].includes(o.status));
}

export function AccountDashboard({
  initialAuthMode = "signin",
}: AccountDashboardProps) {
  const { user, profile, reloadProfile } = useAuth();
  const searchParams = useSearchParams();
  const batchCount = searchParams.get("batch");
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [tab, setTab] = useState<OrderTab>("pending");
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const loadOrders = useCallback(async () => {
    setOrdersLoading(true);
    const orders = await fetchMyOrdersCached();
    setOrders(orders);
    setOrdersLoading(false);
  }, []);

  useEffect(() => {
    if (user) loadOrders();
  }, [user, loadOrders]);

  useEffect(() => {
    if (!user) return;

    function onOrdersChanged() {
      invalidateMyOrdersCache();
      void loadOrders();
    }

    window.addEventListener(ORDERS_CHANGED_EVENT, onOrdersChanged);
    return () => window.removeEventListener(ORDERS_CHANGED_EVENT, onOrdersChanged);
  }, [user, loadOrders]);

  useEffect(() => {
    if (profile) {
      setFullName(profile.fullName);
      setPhone(profile.phone);
    }
  }, [profile]);

  async function handleSignOut() {
    if (!isSupabaseConfigured()) return;
    const supabase = tryCreateClient();
    if (!supabase) return;
    await supabase.auth.signOut();
    window.location.href = "/cityrun/account";
  }

  async function handleSaveProfile() {
    setSaving(true);
    setSaveError("");
    try {
      const res = await fetch("/api/cityrun/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, phone }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Could not save profile");
      }
      await reloadProfile();
      setEditing(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const filtered = filterOrders(orders, tab);
  const activeTrips = pickActiveOrders(orders);
  const isBusiness = isBusinessAccount(profile, user);
  const initials = (profile?.fullName || user?.email || "?")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-dvh bg-cr-page cr-mesh-page text-white">
      <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col pb-28">
        {!user ? (
          <header className="px-4 pt-8 pb-2">
            <h1 className="text-center text-lg font-semibold text-white">Account</h1>
          </header>
        ) : (
          <header className="cr-ops-header px-4 py-4">
            <h1 className="cr-text-headline text-xl font-bold">Account</h1>
            <p className="cr-text-muted mt-1 text-sm">Your profile and delivery history</p>
          </header>
        )}

        <main className={`flex-1 px-4 ${user ? "py-5" : "pb-8 pt-2"}`}>
          {!user && (
            <AuthForm
              defaultMode={initialAuthMode}
              onSuccess={(role, redirectTo) =>
                void completeAuthRedirect(role, redirectTo)
              }
            />
          )}

          {user && (
            <div className="space-y-6">
              {batchCount && (
                <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                  {batchCount} deliveries submitted successfully. Track them below.
                </div>
              )}

              <div className="cr-glass-card cr-glow-ring rounded-2xl p-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-accent/25 text-lg font-bold text-accent ring-1 ring-accent/35">
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    {editing && !isBusiness ? (
                      <div className="space-y-3">
                        <input
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className={inputClass}
                          placeholder="Full name"
                        />
                        <input
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className={inputClass}
                          placeholder="Phone"
                        />
                        {saveError && (
                          <p className="text-xs text-red-400">{saveError}</p>
                        )}
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setEditing(false)}
                            className="rounded-lg border border-white/15 px-3 py-2 text-xs"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            disabled={saving}
                            onClick={handleSaveProfile}
                            className="rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"
                          >
                            {saving ? "Saving…" : "Save"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {(profile?.accountType === "business" ||
                          profile?.accountType === "vendor") &&
                          profile.businessName && (
                          <p className="cr-text-muted text-xs font-bold uppercase tracking-wide">
                            {profile.accountType === "vendor" ? "Vendor" : "Business"}
                          </p>
                        )}
                        <p className="truncate text-lg font-semibold">
                          {(profile?.accountType === "business" ||
                            profile?.accountType === "vendor") &&
                          profile.businessName
                            ? profile.businessName
                            : profile?.fullName || "Add your name"}
                        </p>
                        {(profile?.accountType === "business" ||
                          profile?.accountType === "vendor") &&
                          profile.fullName && (
                          <p className="cr-text-body mt-0.5 text-sm">
                            Contact: {profile.fullName}
                          </p>
                        )}
                        <p className="truncate text-sm text-white/50">
                          {user.email}
                        </p>
                        {profile?.phone && (
                          <p className="mt-1 text-sm text-white/70">
                            {profile.phone}
                          </p>
                        )}
                        {(profile?.accountType === "business" ||
                          profile?.accountType === "vendor") &&
                          profile.natureOfGoods && (
                            <p className="mt-1 text-sm text-white/60">
                              Goods: {profile.natureOfGoods}
                            </p>
                          )}
                        {(profile?.accountType === "business" ||
                          profile?.accountType === "vendor") &&
                          profile.businessAddress?.formatted && (
                            <p className="mt-1 truncate text-xs text-white/45">
                              Pickup: {profile.businessAddress.formatted}
                            </p>
                          )}
                        {!isBusiness && (
                          <button
                            type="button"
                            onClick={() => setEditing(true)}
                            className="mt-2 inline-flex items-center gap-1 text-xs text-accent"
                          >
                            <Pencil className="h-3 w-3" />
                            Edit profile
                          </button>
                        )}
                        {isBusiness && (
                          <p className="mt-2 text-xs text-white/40">
                            Edit your business details below.
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSignOut}
                  className="mt-4 inline-flex items-center gap-2 text-sm text-white/50 hover:text-white"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>

              {activeTrips.length > 0 && (
                <CustomerActiveTripsList
                  orders={activeTrips}
                  viewAllHref={activeTrips.length > 1 ? "/cityrun/trips" : undefined}
                />
              )}

              {(profile?.accountType === "business" ||
                profile?.accountType === "vendor") && (
                <BusinessProfileSettings
                  profile={profile}
                  onSaved={() => void reloadProfile()}
                  readOnlyPickup={
                    isVendorProfile(profile) || isBusinessAccount(profile, user)
                  }
                />
              )}

              <div>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold">Your orders</h2>
                  <div className="flex items-center gap-3">
                    <Link
                      href="/cityrun/trips"
                      className="text-xs font-semibold text-accent"
                    >
                      All trips
                    </Link>
                    <Link
                      href="/cityrun/send"
                      className="text-xs font-semibold text-white/50"
                    >
                      New delivery
                    </Link>
                  </div>
                </div>

                <div className="mt-3 flex gap-2">
                  {(
                    [
                      { key: "pending", label: "Pending" },
                      { key: "active", label: "Active" },
                      { key: "done", label: "Done" },
                    ] as const
                  ).map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setTab(item.key)}
                      className={`flex-1 rounded-lg py-2.5 text-sm font-medium ${
                        tab === item.key
                          ? "bg-accent text-white"
                          : "bg-cr-surface text-white/60"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                {ordersLoading && (
                  <p className="mt-4 text-sm text-white/50">Loading orders…</p>
                )}

                {!ordersLoading && filtered.length === 0 && (
                  <div className="mt-6 rounded-xl border border-dashed border-white/15 px-4 py-8 text-center">
                    <Package className="mx-auto h-8 w-8 text-white/30" />
                    <p className="mt-3 text-sm text-white/50">
                      No {tab} orders yet.
                    </p>
                    <Link
                      href="/cityrun/send"
                      className="mt-3 inline-block text-sm font-semibold text-accent"
                    >
                      Request a delivery →
                    </Link>
                  </div>
                )}

                <ul className="mt-4 space-y-3">
                  {filtered.map((order) => {
                    const Icon = kindIcons[order.kind];
                    return (
                      <li key={order.id}>
                        <Link
                          href={`/cityrun/order/${order.id}`}
                          className="block rounded-xl border border-white/10 bg-cr-surface p-4 active:bg-cr-surface-hover"
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/20">
                              <Icon className="h-5 w-5 text-accent" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium">{order.itemDescription}</p>
                              <p className="mt-1 truncate text-xs text-white/45">
                                {order.dropoff.formatted}
                              </p>
                              <p className="mt-2 text-xs font-medium text-accent">
                                {customerStatusLabels[order.status]}
                              </p>
                              {order.riderName && isActiveDelivery(order.status) && (
                                <p className="mt-1 text-xs text-white/55">
                                  Rider: {order.riderName}
                                </p>
                              )}
                            </div>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          )}
        </main>

        <CityRunBottomNav />
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-white/10 bg-cr-surface-muted px-3 py-2 text-sm text-white outline-none focus:border-accent";
