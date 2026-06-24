"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { ClipboardList, Home, Plus, User } from "lucide-react";

const items: { label: string; href: string; icon: LucideIcon }[] = [
  { label: "Home", href: "/cityrun/home", icon: Home },
  { label: "Orders", href: "/cityrun/account", icon: ClipboardList },
  { label: "New", href: "/cityrun/send", icon: Plus },
  { label: "Account", href: "/cityrun/account", icon: User },
];

export function CityRunBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-50 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <ul className="cr-nav-pill pointer-events-auto mx-auto grid max-w-md grid-cols-4 gap-0.5 rounded-2xl p-1">
        {items.map((item) => {
          const active =
            item.href === "/cityrun/home"
              ? pathname === "/cityrun/home"
              : pathname.startsWith(item.href);

          return (
            <li key={item.label}>
              <Link
                href={item.href}
                className={`flex flex-col items-center gap-px rounded-xl py-1.5 text-[10px] font-medium transition-all ${
                  active
                    ? "bg-cr-yellow text-[#0f172a]"
                    : "text-white/45 active:text-white/70"
                }`}
              >
                <item.icon
                  className={`h-[1.15rem] w-[1.15rem] ${active ? "stroke-[2.5]" : "stroke-2"}`}
                />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
