import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Package, Send, Store } from "lucide-react";

const shortcuts: {
  href: string;
  label: string;
  icon: LucideIcon;
  accent: "yellow" | "blue";
}[] = [
  { href: "/cityrun/send", label: "Send", icon: Send, accent: "yellow" },
  { href: "/cityrun/receive", label: "Receive", icon: Package, accent: "blue" },
  { href: "/cityrun/store-pickup", label: "Store", icon: Store, accent: "blue" },
];

type DeliveryTypeShortcutsProps = {
  compact?: boolean;
};

export function DeliveryTypeShortcuts({ compact = false }: DeliveryTypeShortcutsProps) {
  return (
    <ul className={`grid grid-cols-3 ${compact ? "gap-1" : "gap-2"}`}>
      {shortcuts.map((item) => (
        <li key={item.href}>
          <Link
            href={item.href}
            className={
              compact
                ? "flex flex-col items-center gap-1 py-1 active:opacity-70"
                : "flex flex-col items-center gap-1.5 rounded-xl border border-white/8 bg-white/[0.03] px-2 py-2.5 transition-colors active:bg-white/[0.06]"
            }
          >
            <span
              className={`flex items-center justify-center rounded-lg ${
                compact ? "h-8 w-8" : "h-9 w-9"
              } ${
                item.accent === "yellow"
                  ? "bg-cr-yellow-muted text-cr-yellow"
                  : "bg-accent/15 text-accent-light"
              }`}
            >
              <item.icon className="h-4 w-4" strokeWidth={2.25} />
            </span>
            <span
              className={`text-center font-medium leading-tight text-white/70 ${
                compact ? "text-[9px]" : "text-[10px]"
              }`}
            >
              {item.label}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
