import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import type { DeliveryOrderStatus } from "@/lib/city-run/types";
import {
  customerStatusLabels,
  isActiveDelivery,
} from "@/lib/city-run/status-config";

export const ADMIN_INPUT =
  "admin-input w-full rounded-md px-2.5 py-2 text-[13px] transition-colors";

export function AdminPageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <div className="min-w-0">
        <h2 className="admin-title text-sm font-semibold tracking-tight">{title}</h2>
        {description && (
          <p className="admin-subtitle mt-0.5 text-xs leading-relaxed">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function AdminStatRow({
  items,
}: {
  items: { label: string; value: number | string; accent?: boolean }[];
}) {
  return (
    <div className="admin-stat-row grid grid-cols-2 overflow-hidden rounded-lg sm:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className={`admin-stat px-3 py-2 ${item.accent ? "admin-stat--accent" : ""}`}
        >
          <p className="admin-stat-label text-[10px] font-medium uppercase tracking-wide">
            {item.label}
          </p>
          <p
            className={`admin-stat-value mt-0.5 text-lg font-semibold tabular-nums leading-none ${
              item.accent ? "admin-stat-value--accent" : ""
            }`}
          >
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}

export function AdminCard({
  children,
  className = "",
  padding = "p-3",
}: {
  children: React.ReactNode;
  className?: string;
  padding?: string;
}) {
  return (
    <div className={`admin-card rounded-lg ${padding} ${className}`}>
      {children}
    </div>
  );
}

export function AdminToolbar({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between lg:gap-3">
      {children}
    </div>
  );
}

export function AdminSearch({
  value,
  onChange,
  placeholder = "Search…",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`${ADMIN_INPUT} min-w-0 w-full max-w-none flex-1 lg:max-w-xs`}
    />
  );
}

export function AdminTabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { key: T; label: string; count?: number }[];
  value: T;
  onChange: (key: T) => void;
}) {
  return (
    <div className="admin-tabs inline-flex flex-wrap gap-0.5 rounded-md p-0.5">
      {tabs.map((tab) => {
        const active = value === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className={`admin-tab rounded px-2.5 py-1 text-[11px] font-medium transition-colors ${
              active ? "admin-tab--active" : ""
            }`}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="ml-1 opacity-60">({tab.count})</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function AdminBadge({ status }: { status: DeliveryOrderStatus }) {
  const live = isActiveDelivery(status) || status === "pending";
  const style =
    status === "delivered"
      ? "admin-badge--done"
      : status === "cancelled"
        ? "admin-badge--cancel"
        : live
          ? "admin-badge--live"
          : "admin-badge--neutral";

  return (
    <span
      className={`inline-flex rounded px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide ${style}`}
    >
      {customerStatusLabels[status]}
    </span>
  );
}

export function AdminEmpty({ title }: { title: string }) {
  return (
    <div className="admin-empty rounded-lg border border-dashed px-3 py-6 text-center">
      <p className="text-xs font-medium">{title}</p>
    </div>
  );
}

export function AdminAlert({
  tone,
  children,
}: {
  tone: "success" | "error" | "info";
  children: React.ReactNode;
}) {
  const style = {
    success: "admin-alert--success",
    error: "admin-alert--error",
    info: "admin-alert--info",
  }[tone];

  return (
    <p className={`rounded-md border px-2.5 py-1.5 text-xs ${style}`}>{children}</p>
  );
}

export function AdminField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="admin-subtitle mb-1 block text-[11px] font-medium">
        {label}
      </label>
      {children}
    </div>
  );
}

export function AdminRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="admin-divider flex items-baseline justify-between gap-2 border-b py-1.5 last:border-0">
      <span className="admin-row-label shrink-0 text-[11px]">{label}</span>
      <span
        className={`admin-row-value min-w-0 truncate text-right text-xs ${mono ? "font-mono" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}

export function AdminLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className="text-[11px] font-medium text-accent hover:text-accent-dark">
      {children}
    </Link>
  );
}

export function AdminBtn({
  children,
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "danger" | "ghost";
}) {
  const styles = {
    primary: "bg-accent text-white hover:bg-accent-dark disabled:opacity-40",
    danger: "bg-red-600/90 text-white hover:bg-red-600 disabled:opacity-40",
    ghost: "admin-btn-ghost",
  }[variant];

  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-1 rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors ${styles} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function AdminSkeleton({ className = "h-12" }: { className?: string }) {
  return (
    <div className={`admin-skeleton animate-pulse rounded-lg border ${className}`} />
  );
}

export function AdminIconStat({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: number | string;
}) {
  return (
    <div className="admin-icon-stat flex items-center gap-2 rounded-md px-2.5 py-1.5">
      <Icon className="h-3.5 w-3.5 shrink-0 text-accent" strokeWidth={2} />
      <div>
        <p className="admin-stat-label text-[10px] font-medium uppercase tracking-wide">
          {label}
        </p>
        <p className="admin-stat-value text-xs font-semibold tabular-nums">{value}</p>
      </div>
    </div>
  );
}

export function AdminRef({ id }: { id: string }) {
  return (
    <span className="font-mono text-[11px] font-semibold text-accent">
      #{id.slice(0, 8).toUpperCase()}
    </span>
  );
}

export function formatAdminWhen(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
