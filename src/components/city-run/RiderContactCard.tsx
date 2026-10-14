"use client";

import { useState } from "react";
import { Phone, UserRound } from "lucide-react";
import { formatPhoneDisplay, toTelHref } from "@/lib/city-run/phone";

type RiderContactCardProps = {
  name: string;
  phone?: string;
  compact?: boolean;
};

export function RiderContactCard({ name, phone, compact }: RiderContactCardProps) {
  const [revealed, setRevealed] = useState(false);
  const telHref = phone ? toTelHref(phone) : "";
  const displayPhone = phone ? formatPhoneDisplay(phone) : "";

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="cr-text-body text-sm">
          Rider: <span className="cr-text-label font-bold">{name}</span>
        </span>
        {telHref && (
          <a
            href={telHref}
            onClick={() => setRevealed(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold text-white transition-colors hover:bg-white/15"
          >
            <Phone className="h-3.5 w-3.5" />
            {revealed ? displayPhone : "Call"}
          </a>
        )}
      </div>
    );
  }

  return (
    <section className="cr-glass-card cr-glow-ring overflow-hidden rounded-2xl border border-white/15">
      <div className="flex items-start gap-4 px-5 py-5">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-accent/25 ring-1 ring-accent/40">
          <UserRound className="h-7 w-7 text-white" strokeWidth={2.25} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="cr-text-muted text-xs font-bold uppercase tracking-[0.14em]">
            Your rider
          </p>
          <p className="cr-text-headline mt-1 text-xl font-bold leading-tight text-white">
            {name}
          </p>
          {telHref ? (
            <div className="mt-4">
              {revealed && (
                <p className="cr-text-label mb-2 text-base font-semibold tracking-wide">
                  {displayPhone}
                </p>
              )}
              <a
                href={telHref}
                onClick={() => setRevealed(true)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3.5 text-sm font-bold text-white shadow-[0_8px_24px_-8px_rgb(52_120_246/0.55)] transition-transform active:scale-[0.98] sm:w-auto sm:min-w-[10rem]"
              >
                <Phone className="h-5 w-5" />
                {revealed ? "Call now" : "Call rider"}
              </a>
            </div>
          ) : (
            <p className="cr-text-muted mt-2 text-sm">Phone number not available yet.</p>
          )}
        </div>
      </div>
    </section>
  );
}
