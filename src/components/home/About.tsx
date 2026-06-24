import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { company } from "@/lib/company";

const pillars = [
  {
    index: "01",
    label: "Vision",
    text: "To become a globally recognized logistics brand known for precision, innovation, and people-first service.",
  },
  {
    index: "02",
    label: "Mission",
    text: "To deliver reliable, efficient, and customer-centric transport solutions through advanced technology, empowered teams, and operational excellence.",
  },
] as const;

export function About() {
  return (
    <section
      id="about"
      className="about-section relative flex min-h-[100dvh] flex-col justify-center overflow-hidden bg-white py-8 md:py-10"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.4]"
        style={{
          backgroundImage:
            "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }}
        aria-hidden
      />
      <span
        className="about-watermark pointer-events-none absolute -right-8 top-1/2 -translate-y-1/2 select-none font-bold text-navy/[0.03]"
        aria-hidden
      >
        CHL
      </span>

      <div className="relative mx-auto max-w-7xl px-5 md:px-8">
        <Reveal>
          <div className="flex items-center gap-3">
            <span className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-accent">
              Who we are
            </span>
            <span className="about-accent-line h-px flex-1 max-w-[100px]" />
          </div>
        </Reveal>

        <Reveal delay={80} className="mt-3">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
            <h2 className="max-w-2xl text-[clamp(1.75rem,4vw,2.75rem)] font-bold leading-[1.08] tracking-tight text-navy">
              About Citygates Haulage & Logistics
            </h2>
            <Link
              href="/#services"
              className="about-explore inline-flex shrink-0 items-center gap-2 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-accent transition-colors hover:text-accent-dark"
            >
              Explore services
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </Reveal>

        <div className="about-accent-line mt-5 h-px w-full opacity-60" aria-hidden />

        <div className="mt-6 grid gap-6 lg:grid-cols-12 lg:gap-8 lg:items-center">
          <Reveal variant="left" className="lg:col-span-5">
            <div className="about-image-frame relative">
              <div className="absolute -left-3 top-4 bottom-4 w-1 rounded-full bg-accent md:-left-4" aria-hidden />
              <div className="relative h-[200px] w-full overflow-hidden rounded-2xl shadow-[0_20px_40px_-18px_rgba(21,34,56,0.22)] sm:h-[220px] lg:h-[min(34vh,260px)]">
                <Image
                  src="/images/about-team.webp"
                  alt="Citygates Haulage team collaboration"
                  fill
                  className="object-cover transition-transform duration-700 hover:scale-[1.03]"
                  sizes="(max-width: 1024px) 100vw, 40vw"
                />
              </div>
              <p className="mt-2.5 text-[0.65rem] font-medium uppercase tracking-wider text-muted">
                Lagos, Nigeria · {company.parent}
              </p>
            </div>
          </Reveal>

          <div className="lg:col-span-7">
            <Reveal delay={120}>
              <div className="space-y-3 text-sm leading-relaxed text-muted md:text-[0.9rem]">
                <p>
                  Citygates Haulage & Logistics (CHL) is a premium, professionally
                  managed logistics company headquartered in Lagos, Nigeria. We
                  deliver reliable, safe, and efficient transport and haulage
                  solutions across Nigeria, backed by structured processes, trained
                  personnel, and disciplined execution.
                </p>
                <p>
                  As a proud member of {company.parent}, CHL operates with
                  integrity, innovation, and an unwavering commitment to excellence.
                  We are a people-centered organization — our team-first approach
                  drives exceptional service and lasting client relationships.
                </p>
              </div>
            </Reveal>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 sm:items-stretch">
              {pillars.map((pillar, i) => (
                <Reveal
                  key={pillar.label}
                  delay={200 + i * 90}
                  variant="up"
                  className="h-full"
                >
                  <div className="about-pillar group flex h-full min-h-[150px] flex-col rounded-xl border border-border bg-gradient-to-b from-cream/80 to-white p-4 transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-1 hover:border-accent/30 hover:shadow-lg sm:min-h-[160px]">
                    <p className="flex-1 text-sm leading-relaxed text-muted">
                      {pillar.text}
                    </p>
                    <div className="mt-4 flex shrink-0 items-end justify-between gap-3 border-t border-border pt-3">
                      <span
                        className="text-2xl font-bold leading-none text-navy/10 transition-colors duration-300 group-hover:text-accent/25"
                        aria-hidden
                      >
                        {pillar.index}
                      </span>
                      <span className="text-xs font-semibold uppercase tracking-[0.22em] text-navy">
                        {pillar.label}
                      </span>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
