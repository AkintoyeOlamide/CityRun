import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { whyChoose } from "@/lib/company";

export function WhyChoose() {
  return (
    <section className="why-section relative overflow-hidden bg-cream py-10 md:py-12">
      <div
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          backgroundImage:
            "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
        }}
        aria-hidden
      />

      <div className="relative mx-auto max-w-7xl px-5 md:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
          <Reveal className="max-w-2xl">
            <div className="flex items-center gap-3">
              <span className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-accent">
                Why choose CHL
              </span>
              <span className="why-accent-line h-px flex-1 max-w-[100px]" />
            </div>
            <h2 className="mt-3 text-[clamp(1.75rem,4vw,2.5rem)] font-bold leading-[1.05] tracking-tight text-navy">
              Built on heritage, people,
              <br />
              <span className="text-muted/80">and proven delivery</span>
            </h2>
          </Reveal>
          <Reveal delay={100} className="max-w-sm lg:text-right">
            <p className="text-sm leading-relaxed text-muted">
              Six reasons partners trust Citygates for charter, haulage, and
              fleet operations across Nigeria.
            </p>
            <Link
              href="/#clients"
              className="why-explore mt-3 inline-flex items-center gap-2 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-accent transition-colors hover:text-accent-dark"
            >
              See our clients
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </Reveal>
        </div>

        <div className="why-accent-line mt-5 h-px w-full opacity-80" aria-hidden />

        <ul className="mt-6 grid gap-3 sm:grid-cols-2 sm:items-stretch lg:grid-cols-3 lg:gap-4">
          {whyChoose.map((item, i) => (
            <Reveal
              key={item.title}
              as="li"
              delay={120 + i * 70}
              variant="up"
              className="h-full"
            >
              <article className="why-card group flex h-full min-h-[168px] flex-col rounded-xl border border-border bg-white p-4 transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-1 hover:border-accent/25 hover:shadow-lg md:p-5">
                <span
                  className="text-3xl font-bold leading-none text-accent/20 transition-colors duration-300 group-hover:text-accent/35"
                  aria-hidden
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-muted">
                  {item.desc}
                </p>
                <div className="mt-4 flex items-end justify-between gap-3 border-t border-border pt-3">
                  <h3 className="text-base font-bold leading-snug text-navy md:text-[1.05rem]">
                    {item.title}
                  </h3>
                  <span className="why-card__tick h-1.5 w-8 shrink-0 rounded-full bg-accent/30 transition-all duration-300 group-hover:w-12 group-hover:bg-accent" />
                </div>
              </article>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
