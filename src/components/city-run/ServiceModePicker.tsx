"use client";

import { Bike, Motorbike } from "lucide-react";
import {
  serviceModeCatalog,
  type ServiceMode,
} from "@/lib/city-run/service-mode";

const icons = {
  cityrun: Bike,
  "cityrun-plus": Motorbike,
} as const;

type ServiceModePickerProps = {
  value: ServiceMode | null;
  onChange: (mode: ServiceMode) => void;
  compact?: boolean;
};

export function ServiceModePicker({
  value,
  onChange,
  compact = false,
}: ServiceModePickerProps) {
  if (compact && value) {
    return (
      <div className="grid grid-cols-2 gap-2">
        {(Object.keys(serviceModeCatalog) as ServiceMode[]).map((id) => {
          const item = serviceModeCatalog[id];
          const Icon = icons[id];
          const selected = value === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2.5 text-left transition-colors ${
                selected
                  ? id === "cityrun-plus"
                    ? "border-accent bg-accent/25 shadow-[0_0_16px_rgb(52_120_246/0.35)]"
                    : "border-cr-yellow bg-cr-yellow-muted shadow-[0_0_16px_rgb(250_204_21/0.35)]"
                  : "border-white/10 bg-white/[0.03] text-white/55 active:bg-white/[0.06]"
              }`}
            >
              <Icon
                className={`h-5 w-5 shrink-0 ${
                  selected
                    ? id === "cityrun-plus"
                      ? "text-accent-light"
                      : "text-cr-yellow"
                    : "text-white/40"
                }`}
                strokeWidth={2.1}
              />
              <span className="min-w-0">
                <span className={`block text-sm font-semibold ${selected ? "text-white" : "text-white/55"}`}>
                  {item.title}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <section>
      <h2 className="text-sm font-semibold text-white/90">How should we deliver?</h2>
      <ul className="mt-4 space-y-3">
        {(Object.keys(serviceModeCatalog) as ServiceMode[]).map((id) => {
          const item = serviceModeCatalog[id];
          const Icon = icons[id];
          const selected = value === id;
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => onChange(id)}
                className={`flex w-full items-center gap-3 rounded-2xl border-2 px-4 py-4 text-left transition-colors ${
                  selected
                    ? id === "cityrun-plus"
                      ? "border-accent bg-accent/25 shadow-[0_0_18px_rgb(52_120_246/0.35)]"
                      : "border-cr-yellow bg-cr-yellow-muted shadow-[0_0_18px_rgb(250_204_21/0.35)]"
                    : "border-white/10 bg-white/[0.03] active:bg-white/[0.06]"
                }`}
              >
                <span
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                    selected
                      ? id === "cityrun-plus"
                        ? "bg-accent/30 text-accent-light"
                        : "bg-cr-yellow-muted text-cr-yellow"
                      : "bg-white/5 text-white/40"
                  }`}
                >
                  <Icon className="h-6 w-6" strokeWidth={2.1} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`text-base font-bold ${selected ? "text-white" : "text-white/55"}`}>
                    {item.title}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
