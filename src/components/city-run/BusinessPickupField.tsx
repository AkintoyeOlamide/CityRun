"use client";

import { useEffect, useState } from "react";
import { AddressAutocomplete } from "@/components/city-run/AddressAutocomplete";
import type { AddressValue } from "@/lib/city-run/types";

type BusinessPickupFieldProps = {
  label?: string;
  defaultAddress: AddressValue;
  value: AddressValue;
  onChange: (value: AddressValue) => void;
  placeholder?: string;
};

export function BusinessPickupField({
  label = "Pickup (from your profile)",
  defaultAddress,
  value,
  onChange,
  placeholder = "Enter pickup address",
}: BusinessPickupFieldProps) {
  const [custom, setCustom] = useState(false);

  useEffect(() => {
    if (!custom && defaultAddress.formatted.trim()) {
      onChange(defaultAddress);
    }
  }, [custom, defaultAddress, onChange]);

  if (!custom) {
    return (
      <div>
        <div className="rounded-xl border border-accent/25 bg-accent/10 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-accent/80">
            {label}
          </p>
          <p className="mt-1 text-sm">{defaultAddress.formatted || "Not set yet"}</p>
        </div>
        <button
          type="button"
          onClick={() => setCustom(true)}
          className="mt-2 text-sm font-semibold text-accent transition-colors hover:text-accent-light"
        >
          Use a different pickup address{" "}
          <span className="font-normal text-white/45">(optional)</span>
        </button>
      </div>
    );
  }

  return (
    <div>
      <AddressAutocomplete
        id="pickup"
        label={label}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        showCurrentLocation={false}
      />
      <button
        type="button"
        onClick={() => {
          setCustom(false);
          onChange(defaultAddress);
        }}
        className="mt-2 text-sm font-semibold text-accent transition-colors hover:text-accent-light"
      >
        Use business address from profile
      </button>
    </div>
  );
}
