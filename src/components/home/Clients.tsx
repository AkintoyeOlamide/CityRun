import {
  Briefcase,
  Factory,
  Plane,
  ShoppingBag,
  type LucideIcon,
} from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { company } from "@/lib/company";

const sectors: {
  label: string;
  desc: string;
  index: string;
  icon: LucideIcon;
}[] = [
  {
    index: "01",
    label: "Manufacturing",
    desc: "FMCG, industrial goods",
    icon: Factory,
  },
  {
    index: "02",
    label: "Aviation",
    desc: "Ground logistics, cargo",
    icon: Plane,
  },
  {
    index: "03",
    label: "Corporate",
    desc: "Executive transport, fleet management",
    icon: Briefcase,
  },
  {
    index: "04",
    label: "Retail & e-commerce",
    desc: "Last-mile delivery",
    icon: ShoppingBag,
  },
];

export function Clients() {
  return (
    <section
      id="clients"
      className="clients-section relative overflow-hidden border-t border-border bg-white py-10 md:py-12"
    >
      <div className="relative mx-auto max-w-7xl px-5 md:px-8">
        <Reveal>
          <div className="flex items-center gap-3">
            <span className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-accent">
              Clients & partners
            </span>
            <span className="clients-accent-line h-px flex-1 max-w-[100px]" />
          </div>
          <h2 className="mt-3 max-w-2xl text-[clamp(1.75rem,4vw,2.5rem)] font-bold leading-[1.05] tracking-tight text-navy">
            Trusted by leading organizations across Nigeria
          </h2>
        </Reveal>

        <Reveal delay={100} className="mt-6">
          <div className="clients-marquee rounded-2xl border border-border bg-cream/60 px-4 py-4 md:px-5">
            <p className="mb-3 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted">
              Selected partners
            </p>
            <ul className="flex flex-wrap gap-2">
              {company.clients.map((client, i) => (
                <li key={client}>
                  <span className="inline-block rounded-full border border-border bg-white px-4 py-2 text-sm font-semibold text-navy shadow-sm transition-[border-color,transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-md">
                    {client}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>

        <div className="clients-accent-line mt-8 h-px w-full opacity-70" aria-hidden />

        <Reveal delay={140} className="mt-6">
          <p className="text-sm text-muted">
            Industries we serve with charter, haulage, and last-mile capability.
          </p>
        </Reveal>

        <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:items-stretch lg:grid-cols-4 lg:gap-4">
          {sectors.map((sector, i) => {
            const Icon = sector.icon;
            return (
              <Reveal
                key={sector.label}
                as="li"
                delay={180 + i * 80}
                variant="up"
                className="h-full"
              >
                <article className="sector-card group flex h-full min-h-[148px] flex-col rounded-xl border border-border bg-gradient-to-b from-white to-cream/50 p-4 transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-1 hover:border-accent/30 hover:shadow-lg md:min-h-[156px] md:p-5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-accent/20 bg-accent/10 text-accent transition-colors duration-300 group-hover:bg-accent group-hover:text-white">
                      <Icon className="h-[1.125rem] w-[1.125rem]" strokeWidth={2} />
                    </span>
                    <span className="font-mono text-xs font-medium text-muted/60">
                      {sector.index}
                    </span>
                  </div>
                  <p className="mt-4 flex-1 text-sm leading-relaxed text-muted">
                    {sector.desc}
                  </p>
                  <div className="mt-4 flex items-end justify-between gap-2 border-t border-border/80 pt-3">
                    <h3 className="text-base font-bold leading-tight text-navy">
                      {sector.label}
                    </h3>
                    <span className="sector-card__bar h-1 w-6 shrink-0 rounded-full bg-accent/25 transition-all duration-300 group-hover:w-10 group-hover:bg-accent" />
                  </div>
                </article>
              </Reveal>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
