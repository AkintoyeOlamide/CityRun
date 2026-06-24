import type { LucideIcon } from "lucide-react";
import type { DeliveryOrderStatus } from "@/lib/city-run/types";
import {
  customerStatusLabels,
  isActiveDelivery,
} from "@/lib/city-run/status-config";

export const OPS_INPUT =
  "w-full rounded-xl border border-white/12 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/35 outline-none transition-colors focus:border-accent focus:bg-white/[0.06]";

export function OpsSegmentTabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { key: T; label: string; count?: number }[];
  value: T;
  onChange: (key: T) => void;
}) {
  return (
    <div className="cr-ops-segment flex gap-1 rounded-2xl p-1">
      {tabs.map((tab) => {
        const active = value === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className={`flex-1 rounded-xl px-2 py-2.5 text-xs font-bold transition-all sm:text-sm ${
              active
                ? "bg-accent text-white shadow-[0_4px_16px_-4px_rgb(52_120_246/0.55)]"
                : "text-white/55 hover:text-white/80"
            }`}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span
                className={`ml-1.5 inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[0.65rem] ${
                  active ? "bg-white/20" : "bg-white/10"
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function OpsStatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: LucideIcon;
  label: string;
  value: number | string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="cr-glass-card cr-glow-ring rounded-2xl px-4 py-3.5">
      <div className="flex items-center gap-2">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-lg ${
            accent ? "bg-accent/25 text-accent" : "bg-white/10 text-white/60"
          }`}
        >
          <Icon className="h-4 w-4" strokeWidth={2.25} />
        </div>
        <span className="cr-text-muted text-xs font-semibold uppercase tracking-wide">
          {label}
        </span>
      </div>
      <p className="cr-text-headline mt-2 text-2xl font-bold tabular-nums">{value}</p>
      {sub && <p className="cr-text-muted mt-0.5 text-[0.65rem]">{sub}</p>}
    </div>
  );
}

export function OpsAlert({
  tone,
  children,
}: {
  tone: "success" | "error" | "info";
  children: React.ReactNode;
}) {
  const styles = {
    success: "border-emerald-400/30 bg-emerald-500/12 text-emerald-200",
    error: "border-red-400/30 bg-red-500/12 text-red-200",
    info: "border-accent/30 bg-accent/10 text-white/85",
  }[tone];

  return (
    <p className={`rounded-xl border px-4 py-3 text-sm font-medium ${styles}`}>
      {children}
    </p>
  );
}

export function OpsEmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="cr-glass-card cr-glow-ring rounded-2xl px-6 py-10 text-center">
      <p className="cr-text-label text-base font-bold">{title}</p>
      {description && (
        <p className="cr-text-muted mt-2 text-sm leading-relaxed">{description}</p>
      )}
    </div>
  );
}

export function OpsStatusBadge({ status }: { status: DeliveryOrderStatus }) {
  const live = isActiveDelivery(status) || status === "pending";
  const styles =
    status === "delivered"
      ? "bg-emerald-500/20 text-emerald-300 ring-emerald-400/25"
      : status === "cancelled"
        ? "bg-red-500/20 text-red-300 ring-red-400/25"
        : live
          ? "bg-accent/20 text-accent ring-accent/30"
          : "bg-white/10 text-white/65 ring-white/10";

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wide ring-1 ${styles}`}
    >
      {customerStatusLabels[status]}
    </span>
  );
}

export function OpsSectionTitle({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div>
      <h2 className="cr-text-label text-base font-bold">{title}</h2>
      {description && (
        <p className="cr-text-muted mt-1 text-sm">{description}</p>
      )}
    </div>
  );
}

export function OpsField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="cr-text-label text-sm font-semibold">{label}</label>
      {hint && <p className="cr-text-muted mt-0.5 text-xs">{hint}</p>}
      <div className="mt-2">{children}</div>
    </div>
  );
}

export function OpsInfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="cr-glass-card rounded-2xl px-4 py-3.5">
      <p className="cr-text-muted text-[0.65rem] font-bold uppercase tracking-wide">
        {label}
      </p>
      <p className="cr-text-label mt-1.5 text-sm font-medium leading-snug">{value}</p>
    </div>
  );
}

export function OpsSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={`cr-glass-card animate-pulse rounded-2xl bg-white/[0.04] ${className ?? "h-24"}`}
    />
  );
}
