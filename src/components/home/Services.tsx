import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";
import { Reveal } from "@/components/Reveal";

const serviceGroups = [
  {
    index: "A",
    title: "Core services",
    tagline: "End-to-end logistics for corporate and industrial clients",
    items: [
      "Executive Charter Services",
      "Last-Mile Delivery",
      "Haulage Solutions",
      "Total Fleet Management",
    ],
  },
  {
    index: "B",
    title: "Fleet & support",
    tagline: "Operational support that keeps your fleet moving",
    items: [
      "Home Relocation (NEW)",
      "Vehicle Retainership Scheme",
      "Fuel Management Solutions",
      "Driver Allocation & Training",
      "Vehicle Documentation Management",
    ],
  },
] as const;

export function Services() {
  return (
    <section
      id="services"
      className="services-section relative overflow-hidden bg-navy py-8 text-white md:py-10"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.55) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.55) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-32 top-1/4 h-80 w-80 rounded-full bg-accent/15 blur-[100px]"
        aria-hidden
      />

      <div className="relative mx-auto w-full max-w-7xl px-5 md:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between lg:gap-8">
          <Reveal className="max-w-2xl">
            <div className="flex items-center gap-3">
              <span className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-accent">
                Service portfolio
              </span>
              <span className="services-accent-line h-px flex-1 max-w-[100px]" />
            </div>
            <h2 className="mt-3 text-[clamp(1.75rem,4vw,2.5rem)] font-bold leading-[1.05] tracking-tight">
              Comprehensive logistics
              <br />
              <span className="text-white/35">solutions across Nigeria</span>
            </h2>
          </Reveal>
          <Reveal delay={100} className="max-w-sm lg:text-right">
            <p className="text-sm leading-relaxed text-white/55">
              Structured delivery for charter, haulage, fleet management, and
              nationwide support — built for scale and accountability.
            </p>
            <Link
              href="/#contact"
              className="services-explore mt-3 inline-flex items-center gap-2 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-accent transition-colors hover:text-[#f0a070]"
            >
              Request a quote
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </Reveal>
        </div>

        <div className="services-accent-line mt-5 h-px w-full opacity-70" aria-hidden />

        <div className="mt-5 grid gap-3 sm:items-stretch lg:grid-cols-2 lg:gap-4">
          {serviceGroups.map((group, gi) => (
            <Reveal
              key={group.title}
              delay={140 + gi * 100}
              variant={gi === 0 ? "left" : "right"}
              className="h-full min-h-0"
            >
              <div className="service-panel group/panel flex h-full flex-col rounded-xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-sm transition-[border-color,box-shadow] duration-300 hover:border-white/20 hover:shadow-[0_20px_40px_-20px_rgba(0,0,0,0.45)] md:p-4">
                <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3">
                  <div>
                    <span className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-accent">
                      Group {group.index}
                    </span>
                    <h3 className="mt-0.5 text-lg font-bold tracking-tight md:text-xl">
                      {group.title}
                    </h3>
                    <p className="mt-1 max-w-sm text-[0.7rem] leading-snug text-white/55 md:text-xs">
                      {group.tagline}
                    </p>
                  </div>
                  <span
                    className="text-3xl font-bold leading-none text-white/[0.07] transition-colors duration-300 group-hover/panel:text-accent/20"
                    aria-hidden
                  >
                    {group.index}
                  </span>
                </div>

                <ul className="mt-3 flex flex-col gap-1">
                  {group.items.map((item, i) => (
                    <li
                      key={item}
                      className="service-item flex items-center gap-2.5 rounded-md border border-transparent px-2 py-2 transition-[border-color,background] duration-300 hover:border-white/10 hover:bg-white/[0.06]"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-accent/35 bg-accent/10">
                        <Check className="h-3 w-3 text-accent" strokeWidth={2.5} />
                      </span>
                      <span className="min-w-0 flex-1 text-[0.8rem] font-medium leading-snug text-white/90 md:text-sm">
                        {item}
                      </span>
                      <span className="font-mono text-[0.65rem] text-white/25">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
