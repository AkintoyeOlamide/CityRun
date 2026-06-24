import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";

export function LuxuryHero() {
  return (
    <section className="relative min-h-[min(92vh,820px)] overflow-hidden bg-luxury-black text-white">
      <div className="absolute inset-0">
        <Image
          src="/images/city-access.webp"
          alt="Executive chauffeur vehicle"
          fill
          priority
          className="object-cover opacity-35"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-luxury-black/30 via-luxury-black/75 to-luxury-black" />
        <div
          className="absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(43, 87, 167, 0.15), transparent 60%)",
          }}
          aria-hidden
        />
      </div>

      <div className="relative mx-auto flex min-h-[min(92vh,820px)] max-w-7xl flex-col justify-end px-5 pb-14 pt-28 md:px-8 md:pb-20">
        <Link
          href="/"
          className="absolute left-5 top-8 inline-flex items-center gap-2 text-sm text-white/50 transition-colors hover:text-luxury-gold md:left-8 md:top-10"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        <div className="max-w-3xl">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-luxury-gold/30 bg-luxury-gold/10 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-luxury-gold">
              <Sparkles className="h-3 w-3" />
              City Access
            </span>
            <span className="luxury-accent-line h-px flex-1 max-w-[120px]" />
          </div>

          <h1 className="mt-6 text-[clamp(2.25rem,5.5vw,3.75rem)] font-bold leading-[1.02] tracking-tight">
            Executive charter,
            <br />
            <span className="bg-gradient-to-r from-luxury-gold via-accent-light to-luxury-gold/70 bg-clip-text text-transparent">
              redefined
            </span>
          </h1>

          <p className="mt-5 max-w-xl text-base leading-relaxed text-white/55 md:text-lg">
            Discreet chauffeurs, immaculate vehicles, and white-glove coordination
            for C-suite travel, VIP arrivals, and corporate delegations across Lagos
            and Nigeria.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <a
              href="#fleet"
              className="rounded-full bg-luxury-gold px-7 py-3.5 text-sm font-semibold text-white transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_40px_-12px_rgba(43,87,167,0.55)]"
            >
              Select your vehicle
            </a>
            <a
              href="/#contact"
              className="rounded-full border border-white/20 px-7 py-3.5 text-sm font-semibold text-white/90 transition-colors hover:border-luxury-gold/50 hover:text-luxury-gold"
            >
              Speak to concierge
            </a>
          </div>
        </div>

        <div className="mt-12 grid grid-cols-3 gap-4 border-t border-white/10 pt-8 md:max-w-lg md:gap-8">
          {[
            { value: "24/7", label: "Availability" },
            { value: "100%", label: "Discretion" },
            { value: "GPS", label: "Tracked fleet" },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="text-lg font-bold text-luxury-gold md:text-xl">{stat.value}</p>
              <p className="mt-0.5 text-[0.65rem] uppercase tracking-[0.18em] text-white/45">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
