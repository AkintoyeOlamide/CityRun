"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { LayoutDashboard } from "lucide-react";
import { AdminLoginForm } from "@/components/city-run/admin/AdminLoginForm";
import { AdminCard, AdminSkeleton } from "@/components/city-run/admin/AdminUI";

type AdminAccessGateProps = {
  children: React.ReactNode;
};

export function AdminAccessGate({ children }: AdminAccessGateProps) {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  const checkSession = useCallback(async () => {
    const res = await fetch("/api/cityrun/admin/me");
    if (res.ok) {
      const body = (await res.json()) as { authenticated?: boolean };
      setAuthenticated(Boolean(body.authenticated));
    } else {
      setAuthenticated(false);
    }
    setLoading(false);
  }, []);

  useEffect(() => { checkSession(); }, [checkSession]);

  if (loading) {
    return (
      <div className="admin-login-page flex min-h-dvh items-center justify-center px-4">
        <AdminSkeleton className="h-40 w-full max-w-xs" />
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="admin-login-page flex min-h-dvh flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-xs">
          <div className="mb-4 text-center">
            <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-accent/12">
              <LayoutDashboard className="h-4 w-4 text-accent" strokeWidth={2.25} />
            </div>
            <h1 className="admin-title text-base font-semibold">City Run Ops</h1>
            <p className="admin-subtitle mt-0.5 text-xs">Sign in to manage orders & riders</p>
          </div>

          <AdminCard>
            <AdminLoginForm onSuccess={() => checkSession()} />
          </AdminCard>

          <Link
            href="/cityrun"
            className="mt-4 block text-center text-[11px] font-medium text-accent"
          >
            ← Back to City Run
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
