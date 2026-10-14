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
              className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                selected
                  ? "border-cr-yellow/50 bg-cr-yellow-muted"
                  : "border-white/10 bg-white/[0.03] active:bg-white/[0.06]"
              }`}
            >
              <Icon
                className={`h-5 w-5 shrink-0 ${selected ? "text-cr-yellow" : "text-white/55"}`}
                strokeWidth={2.1}
              />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-white">{item.title}</span>
                <span className="block text-[10px] text-white/45">{item.priceHint}</span>
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
      <p className="mt-1 text-xs leading-relaxed text-white/45">
        Pick a ride type, like Bolt — bicycle for a flat fare, motorbike priced by distance.
      </p>
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
                className={`flex w-full items-start gap-3 rounded-2xl border px-4 py-4 text-left transition-colors ${
                  selected
                    ? "border-cr-yellow/45 bg-cr-yellow-muted shadow-[0_0_18px_rgb(250_204_21/0.12)]"
                    : "border-white/10 bg-white/[0.03] active:bg-white/[0.06]"
                }`}
              >
                <span
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                    id === "cityrun-plus"
                      ? "bg-accent/20 text-accent-light"
                      : "bg-cr-yellow-muted text-cr-yellow"
                  }`}
                >
                  <Icon className="h-6 w-6" strokeWidth={2.1} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="text-base font-bold text-white">{item.title}</span>
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/60">
                      {item.tagline}
                    </span>
                  </span>
                  <span className="mt-1 block text-sm font-semibold text-cr-yellow">
                    {item.priceHint}
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-white/50">
                    {item.explanation}
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
