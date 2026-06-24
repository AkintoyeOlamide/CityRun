"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, Luggage, Users } from "lucide-react";
import {
  fleetCategories,
  fleetVehicles,
  type FleetCategory,
  type FleetVehicle,
} from "@/lib/city-access-fleet";

const categoryLabels: Record<FleetCategory, string> = {
  sedan: "Executive sedan",
  suv: "Luxury SUV",
  van: "Executive van",
  ultra: "Ultra-luxury",
};

function FleetCard({
  vehicle,
  selected,
  onSelect,
}: {
  vehicle: FleetVehicle;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`fleet-card group relative w-full overflow-hidden rounded-2xl border text-left transition-[border-color,box-shadow,transform] duration-400 ${
        selected
          ? "border-luxury-gold/70 shadow-[0_0_0_1px_rgba(43,87,167,0.35),0_24px_48px_-24px_rgba(43,87,167,0.25)]"
          : "border-white/10 hover:border-white/25 hover:-translate-y-1"
      }`}
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-luxury-surface">
        <Image
          src={vehicle.image}
          alt={vehicle.name}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-105"
          style={{ objectPosition: vehicle.imagePosition ?? "center" }}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-luxury-black via-luxury-black/20 to-transparent" />
        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          <span className="rounded-full border border-white/15 bg-black/50 px-2.5 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-white/80 backdrop-blur-sm">
            {categoryLabels[vehicle.category]}
          </span>
          {vehicle.onRequest && (
            <span className="rounded-full border border-luxury-gold/40 bg-luxury-gold/15 px-2.5 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-luxury-gold">
              On request
            </span>
          )}
        </div>
        {selected && (
          <span className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-luxury-gold text-luxury-black">
            <Check className="h-4 w-4" strokeWidth={3} />
          </span>
        )}
      </div>

      <div className="relative bg-luxury-surface p-5 md:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold tracking-tight text-white md:text-xl">
              {vehicle.name}
            </h3>
            <p className="mt-1 text-sm text-white/45">{vehicle.tagline}</p>
          </div>
          <p className="shrink-0 text-right">
            <span className="block text-[0.6rem] uppercase tracking-wider text-white/35">
              From
            </span>
            <span className="text-sm font-semibold text-luxury-gold">
              {vehicle.priceFrom}
            </span>
          </p>
        </div>

        <div className="mt-4 flex gap-4 text-xs text-white/50">
          <span className="inline-flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-luxury-gold/80" />
            {vehicle.passengers} passengers
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Luggage className="h-3.5 w-3.5 text-luxury-gold/80" />
            {vehicle.luggage} bags
          </span>
        </div>

        <ul className="mt-4 flex flex-wrap gap-2">
          {vehicle.highlights.map((h) => (
            <li
              key={h}
              className="rounded-md border border-white/8 bg-white/[0.04] px-2 py-1 text-[0.65rem] text-white/55"
            >
              {h}
            </li>
          ))}
        </ul>

        <span
          className={`mt-5 block w-full rounded-xl py-2.5 text-center text-xs font-semibold uppercase tracking-[0.14em] transition-colors ${
            selected
              ? "bg-luxury-gold text-luxury-black"
              : "border border-white/15 text-white/70 group-hover:border-luxury-gold/40 group-hover:text-luxury-gold"
          }`}
        >
          {selected ? "Selected" : "Select vehicle"}
        </span>
      </div>
    </button>
  );
}

export function FleetSelector() {
  const [activeCategory, setActiveCategory] = useState<FleetCategory | "all">("all");
  const [selectedId, setSelectedId] = useState<string>(fleetVehicles[0].id);

  const filtered = useMemo(() => {
    if (activeCategory === "all") return fleetVehicles;
    return fleetVehicles.filter((v) => v.category === activeCategory);
  }, [activeCategory]);

  const selected = fleetVehicles.find((v) => v.id === selectedId) ?? fleetVehicles[0];

  const contactHref = `/#contact?service=City+Access&vehicle=${encodeURIComponent(selected.name)}`;

  return (
    <section id="fleet" className="relative bg-luxury-black py-16 md:py-20">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-luxury-gold/30 to-transparent" />

      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="max-w-2xl">
          <div className="flex items-center gap-3">
            <span className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-luxury-gold">
              Our fleet
            </span>
            <span className="luxury-accent-line h-px flex-1 max-w-[100px]" />
          </div>
          <h2 className="mt-4 text-[clamp(1.75rem,4vw,2.75rem)] font-bold leading-tight text-white">
            Choose your
            <span className="text-white/35"> chauffeured vehicle</span>
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-white/45 md:text-base">
            Select from executive sedans, luxury SUVs, and group vans — each
            maintained to showroom standard with professional chauffeurs.
          </p>
        </div>

        <div className="mt-8 flex flex-wrap gap-2">
          {fleetCategories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition-colors ${
                activeCategory === cat.id
                  ? "bg-luxury-gold text-luxury-black"
                  : "border border-white/15 text-white/55 hover:border-luxury-gold/40 hover:text-luxury-gold"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((vehicle) => (
            <FleetCard
              key={vehicle.id}
              vehicle={vehicle}
              selected={selectedId === vehicle.id}
              onSelect={() => setSelectedId(vehicle.id)}
            />
          ))}
        </div>

        <div className="fleet-selection-bar mt-10 flex flex-col gap-4 rounded-2xl border border-luxury-gold/25 bg-luxury-surface/80 p-5 backdrop-blur-md md:flex-row md:items-center md:justify-between md:p-6">
          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-luxury-gold">
              Your selection
            </p>
            <p className="mt-1 text-lg font-bold text-white">{selected.name}</p>
            <p className="text-sm text-white/45">{selected.tagline}</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href={contactHref}
              className="inline-flex items-center justify-center rounded-full bg-luxury-gold px-8 py-3.5 text-sm font-semibold text-white transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_40px_-12px_rgba(43,87,167,0.5)]"
            >
              Request this vehicle
            </Link>
            <a
              href="tel:+2347073667601"
              className="inline-flex items-center justify-center rounded-full border border-white/20 px-8 py-3.5 text-sm font-semibold text-white/90 transition-colors hover:border-luxury-gold/50 hover:text-luxury-gold"
            >
              Call concierge
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
