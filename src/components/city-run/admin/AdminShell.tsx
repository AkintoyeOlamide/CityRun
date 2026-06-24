"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, LogOut, MapPin, Package, Store, UserCircle, Users } from "lucide-react";

type AdminShellProps = {
  title: string;
  backHref?: string;
  children: React.ReactNode;
};

const nav = [
  { href: "/cityrun/admin", label: "Orders", icon: LayoutDashboard, exact: true },
  { href: "/cityrun/admin/live", label: "Live map", icon: MapPin, exact: true },
  { href: "/cityrun/admin/riders", label: "Riders", icon: Users, exact: false },
  { href: "/cityrun/admin/accounts", label: "Accounts", icon: UserCircle, exact: false },
  { href: "/cityrun/admin/vendors", label: "Vendors", icon: Store, exact: false },
] as const;

export function AdminShell({ title, children }: AdminShellProps) {
  const router = useRouter();
  const pathname = usePathname();

  async function handleLogout() {
    await fetch("/api/cityrun/admin/logout", { method: "POST" });
    router.push("/cityrun/admin");
    router.refresh();
  }

  function isActive(item: (typeof nav)[number]) {
    if (item.exact) return pathname === item.href;
    return pathname.startsWith(item.href);
  }

  return (
    <div className="admin-shell min-h-dvh">
      <div className="flex min-h-dvh w-full">
        <aside className="admin-sidebar hidden w-44 shrink-0 flex-col border-r lg:flex">
          <div className="admin-divider flex items-center gap-2 border-b px-3 py-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent/12">
              <Package className="h-3.5 w-3.5 text-accent" strokeWidth={2.25} />
            </div>
            <div className="min-w-0">
              <p className="admin-title truncate text-[11px] font-semibold">City Run</p>
              <p className="admin-subtitle text-[10px]">Operations</p>
            </div>
          </div>

          <nav className="flex-1 space-y-0.5 p-2">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                data-active={isActive(item) ? "true" : "false"}
                className="admin-nav-link flex items-center gap-2 rounded-md py-1.5 pl-2.5 pr-2 text-[13px] font-medium transition-colors"
              >
                <item.icon className="h-3.5 w-3.5 shrink-0 opacity-80" strokeWidth={2} />
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="admin-divider border-t p-2">
            <button
              type="button"
              onClick={handleLogout}
              className="admin-nav-link flex w-full items-center gap-2 rounded-md py-1.5 pl-2.5 pr-2 text-[13px] font-medium transition-colors"
            >
              <LogOut className="h-3.5 w-3.5 opacity-80" />
              Sign out
            </button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="admin-header sticky top-0 z-20 border-b px-4 py-2 lg:px-6">
            <div className="flex items-center justify-between gap-3">
              <h1 className="admin-title truncate text-sm font-semibold tracking-tight">
                {title}
              </h1>
              <button
                type="button"
                onClick={handleLogout}
                className="admin-btn-ghost rounded-md p-1.5 lg:hidden"
                aria-label="Sign out"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>

            <nav className="-mx-1 mt-2 flex gap-1 overflow-x-auto pb-0.5 lg:hidden">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  data-active={isActive(item) ? "true" : "false"}
                  className="admin-nav-link flex shrink-0 items-center gap-1 rounded-md border border-transparent px-2.5 py-1 text-[11px] font-medium"
                >
                  <item.icon className="h-3 w-3" />
                  {item.label}
                </Link>
              ))}
            </nav>
          </header>

          <main className="flex-1 px-4 py-3 pb-8 lg:px-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
