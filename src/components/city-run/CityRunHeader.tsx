"use client";

import Link from "next/link";
import { Bell, ChevronRight, User } from "lucide-react";
import { useAuth } from "@/lib/auth/use-auth";

function getInitials(name: string, email?: string) {
  const trimmed = name.trim();
  if (trimmed) {
    const parts = trimmed.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return trimmed.slice(0, 2).toUpperCase();
  }
  return (email?.[0] ?? "?").toUpperCase();
}

function getDisplayName(
  profile: { fullName: string } | null,
  email?: string,
) {
  if (profile?.fullName?.trim()) return profile.fullName.trim();
  if (email) return email.split("@")[0];
  return "Guest";
}

type CityRunHeaderProps = {
  variant?: "home" | "default";
};

export function CityRunHeader({ variant = "default" }: CityRunHeaderProps) {
  const { user, profile, loading } = useAuth();
  const isHome = variant === "home";

  if (loading) {
    return (
      <header className="flex items-center justify-between px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-4">
        <div className="h-9 w-9 animate-pulse rounded-full bg-white/10" />
        <div className="flex gap-2">
          <div className="h-8 w-14 animate-pulse rounded-full bg-white/10" />
          <div className="h-8 w-8 animate-pulse rounded-full bg-white/10" />
        </div>
      </header>
    );
  }

  if (isHome) {
    return (
      <header className="flex items-center justify-between px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-4">
        <Link
          href="/cityrun/account"
          prefetch
          className="flex items-center gap-2.5 rounded-full pr-2 transition-colors active:bg-white/5"
        >
          {user ? (
            <>
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-accent to-cr-yellow-dark text-xs font-bold ring-1 ring-cr-yellow/25">
                {getInitials(profile?.fullName ?? "", user.email)}
              </span>
              <span className="hidden min-w-0 sm:block">
                <span className="block text-[10px] text-white/40">Welcome back</span>
                <span className="cr-text-label block truncate text-sm font-semibold">
                  {getDisplayName(profile, user.email)}
                </span>
              </span>
            </>
          ) : (
            <>
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/12 bg-white/[0.04] text-white/70">
                <User className="h-4 w-4" />
              </span>
              <span className="text-sm font-medium text-white/80">Sign in</span>
            </>
          )}
        </Link>

        <div className="flex items-center gap-1.5">
          <Link
            href="/cityrun/account"
            className="relative flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/70 transition-colors active:bg-white/[0.08]"
            aria-label="Notifications and orders"
          >
            <Bell className="h-3.5 w-3.5" />
            <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-cr-yellow" aria-hidden />
          </Link>
        </div>
      </header>
    );
  }

  if (user) {
    const name = getDisplayName(profile, user.email);
    const initials = getInitials(profile?.fullName ?? "", user.email);

    return (
      <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <Link href="/cityrun/home" className="text-lg font-bold tracking-tight text-white">
          City Run
        </Link>
        <Link
          href="/cityrun/account"
          className="flex max-w-[11rem] items-center gap-2.5 rounded-full border border-white/10 bg-cr-surface py-1 pl-1 pr-3 transition-colors active:bg-cr-surface-hover"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-dark text-sm font-bold">
            {initials}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold leading-tight">
              {name}
            </span>
            <span className="block truncate text-[0.65rem] text-white/45">
              My orders
            </span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-white/30" />
        </Link>
      </header>
    );
  }

  return (
    <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
      <Link href="/cityrun" className="text-lg font-bold tracking-tight text-white">
        City Run
      </Link>
      <Link
        href="/cityrun/account"
        className="flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 py-1.5 pl-1.5 pr-3.5 transition-colors active:bg-accent/20"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-cr-surface text-accent">
          <User className="h-4 w-4" strokeWidth={2} />
        </span>
        <span className="text-sm font-semibold text-accent">Sign in</span>
      </Link>
    </header>
  );
}
