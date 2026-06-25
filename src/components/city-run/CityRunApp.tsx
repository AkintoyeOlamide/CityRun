"use client";

import Link from "next/link";
import {
  ArrowRight,
  Package,
  Search,
  Send,
  Store,
} from "lucide-react";
import { CityRunActiveDeliveryCard } from "@/components/city-run/CityRunActiveDeliveryCard";
import { CustomerActiveTripsList } from "@/components/city-run/CustomerActiveTripsList";
import { CityRunBottomNav } from "@/components/city-run/CityRunBottomNav";
import { CityRunHeader } from "@/components/city-run/CityRunHeader";
import { DeliveryTypeShortcuts } from "@/components/city-run/DeliveryTypeShortcuts";
import { useAuth } from "@/lib/auth/use-auth";
import { isBusinessAccount, isVendorProfile } from "@/lib/city-run/account-utils";
import { useActiveDeliveryOrders } from "@/lib/city-run/use-active-delivery-order";

const deliveryTypes: {
  title: string;
  subtitle: string;
  href: string;
  icon: typeof Send;
  tag?: string;
  accent: "yellow" | "blue";
}[] = [
  {
    title: "Send items",
    subtitle: "Pick up & deliver anywhere",
    href: "/cityrun/send",
    icon: Send,
    tag: "Popular",
    accent: "yellow",
  },
  {
    title: "Receive items",
    subtitle: "We collect and bring to your door",
    href: "/cityrun/receive",
    icon: Package,
    accent: "blue",
  },
  {
    title: "Store pickup",
    subtitle: "From shop to you, same day",
    href: "/cityrun/store-pickup",
    icon: Store,
    accent: "blue",
  },
];

export function CityRunApp() {
  const { user, profile } = useAuth();
  const { activeOrders, orderId, hasActiveTrip, loading: activeLoading } =
    useActiveDeliveryOrders();
  const isVendor = isVendorProfile(profile);
  const isBusiness = isBusinessAccount(profile, user);

  if (isVendor || isBusiness) {
    const businessLabel = profile?.businessName ?? (isBusiness ? "Business" : "Vendor");

    return (
      <div className="cr-mesh-page min-h-dvh text-white">
        <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col pb-24">
          <CityRunHeader variant="home" />

          <main className="flex-1 px-5">
            {!hasActiveTrip && (
              <section className="mt-6">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">
                  {businessLabel} · <span className="text-cr-yellow">City Run</span>
                </p>
                <h1 className="cr-text-headline mt-3 text-[1.5rem] font-bold leading-tight">
                  {isBusiness ? "Send to your customers" : "Book a delivery run"}
                </h1>
                <p className="mt-3 max-w-xs text-xs leading-relaxed text-white/50">
                  {isBusiness
                    ? "We pick up from your registered address — just add where to deliver."
                    : "Add delivery addresses — we pick up from your shop."}
                </p>
              </section>
            )}

            <div className={hasActiveTrip ? "mt-2 space-y-2" : "mt-8 space-y-4"}>
              {activeOrders.length === 1 ? (
                <CityRunActiveDeliveryCard
                  expanded={hasActiveTrip}
                  orderId={orderId}
                  loading={activeLoading}
                />
              ) : hasActiveTrip ? (
                <CustomerActiveTripsList
                  orders={activeOrders}
                  compact
                  viewAllHref="/cityrun/trips"
                />
              ) : (
                <CityRunActiveDeliveryCard
                  expanded={false}
                  orderId={null}
                  loading={activeLoading}
                />
              )}

              {!hasActiveTrip && (
                <Link
                  href="/cityrun/send"
                  prefetch
                  className="group flex items-center gap-2.5 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5 transition-colors active:bg-white/[0.06]"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cr-yellow-muted text-cr-yellow">
                    <Send className="h-4 w-4" strokeWidth={2.25} />
                  </span>
                  <span className="flex-1 text-sm font-medium text-white/90">
                    {isBusiness ? "Send items" : "New delivery run"}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 text-white/35" />
                </Link>
              )}

              {hasActiveTrip && <DeliveryTypeShortcuts compact />}

              {!hasActiveTrip && profile?.businessAddress?.formatted && (
                <div className="rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-white/35">
                    Pickup (your business)
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-white/65">
                    {profile.businessAddress.formatted}
                  </p>
                </div>
              )}
            </div>
          </main>

          <CityRunBottomNav />
        </div>
      </div>
    );
  }

  return (
    <div className="cr-mesh-page min-h-dvh text-white">
      <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col pb-24">
        <CityRunHeader variant="home" />

        <main className="flex-1 px-5">
          {!hasActiveTrip && (
            <section className="mt-6">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">
                Citygates · <span className="text-cr-yellow">City Run</span>
              </p>
              <h1 className="cr-text-headline mt-3 text-[1.5rem] font-bold leading-tight">
                We deliver{" "}
                <span className="text-cr-yellow">on time.</span>
              </h1>
              <p className="mt-3 max-w-xs text-xs leading-relaxed text-white/50">
                Last-mile dispatch across Lagos — send, receive, or store pickup.
              </p>
            </section>
          )}

          <div className={hasActiveTrip ? "mt-2 space-y-2" : "mt-8 space-y-4"}>
            <CityRunActiveDeliveryCard
              expanded={hasActiveTrip}
              orderId={orderId}
              loading={activeLoading}
            />

            {!hasActiveTrip && (
              <Link
                href="/cityrun/send"
                prefetch
                className="flex items-center gap-2.5 rounded-xl border border-cr-yellow/30 bg-cr-yellow-muted px-3 py-2.5 transition-colors active:bg-cr-yellow/20"
              >
                <Search className="h-4 w-4 shrink-0 text-cr-yellow" strokeWidth={2.25} />
                <span className="flex-1 text-sm text-white/55">
                  Where should we deliver to?
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-cr-yellow/70" />
              </Link>
            )}
          </div>

          {hasActiveTrip ? (
            <section className="mt-2">
              <DeliveryTypeShortcuts compact />
            </section>
          ) : (
            <section className="mt-10">
              <h2 className="text-sm font-semibold text-white/90">
                Request a delivery
              </h2>

              <ul className="mt-4 space-y-3">
                {deliveryTypes.map((item) => (
                  <li key={item.title}>
                    <Link
                      href={item.href}
                      prefetch
                      className="group flex items-center gap-2.5 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5 transition-colors active:bg-white/[0.06]"
                    >
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                          item.accent === "yellow"
                            ? "bg-cr-yellow-muted text-cr-yellow"
                            : "bg-accent/15 text-accent-light"
                        }`}
                      >
                        <item.icon className="h-4 w-4" strokeWidth={2.25} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium text-white/90">
                            {item.title}
                          </span>
                          {item.tag && (
                            <span className="rounded bg-cr-yellow/15 px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-cr-yellow">
                              {item.tag}
                            </span>
                          )}
                        </div>
                        <p className="truncate text-xs text-white/40">
                          {item.subtitle}
                        </p>
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-white/25 transition-transform group-active:translate-x-0.5" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </main>

        <CityRunBottomNav />
      </div>
    </div>
  );
}
