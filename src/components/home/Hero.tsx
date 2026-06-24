import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronDown, Shield, Truck } from "lucide-react";
import { company } from "@/lib/company";

export function Hero() {
  return (
    <section className="relative isolate min-h-[min(92vh,920px)] overflow-hidden bg-navy text-white">
      <div className="absolute inset-0 hero-fade-in">
        <div className="absolute inset-0 overflow-hidden">
          <Image
            src="/images/hero-premium.webp"
            alt="Premium freight trucks on highway at golden hour"
            fill
            priority
            className="hero-ken-burns object-cover object-[center_40%]"
            sizes="100vw"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-navy via-navy/88 to-navy/45" />
        <div className="absolute inset-0 bg-gradient-to-t from-navy via-transparent to-navy/30" />
        <div
          className="hero-glow absolute -right-24 top-1/4 h-96 w-96 rounded-full bg-accent/25 blur-[100px]"
          aria-hidden
        />
        <div
          className="hero-glow absolute -left-16 bottom-0 h-72 w-72 rounded-full bg-navy-light/50 blur-[80px] [animation-delay:2s]"
          aria-hidden
        />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
          aria-hidden
        />
      </div>

      <div className="relative mx-auto flex min-h-[min(92vh,920px)] max-w-6xl flex-col justify-center px-5 py-24 md:px-8 md:py-28">
        <div className="max-w-2xl">
          <div className="hero-accent-line hero-fade-up hero-delay-1 h-1 w-16 rounded-full bg-accent" />

          <h1 className="hero-fade-up hero-delay-2 mt-6 text-4xl font-bold leading-[1.06] tracking-tight md:text-5xl lg:text-[3.5rem] lg:leading-[1.05]">
            <span className="bg-gradient-to-br from-white via-white to-white/75 bg-clip-text text-transparent">
              {company.name}
            </span>
          </h1>

          <p className="hero-fade-up hero-delay-3 mt-6 max-w-xl text-xl font-medium leading-snug text-white/90 md:text-2xl">
            {company.tagline}
          </p>

          <p className="hero-fade-up hero-delay-4 mt-5 max-w-lg text-base leading-relaxed text-white/65">
            Premium haulage and logistics headquartered in Lagos — reliable,
            safe, and efficient transport across Nigeria.
          </p>

          <div className="hero-fade-up hero-delay-5 mt-9 flex flex-wrap gap-4">
            <Link
              href="/#contact"
              className="group relative inline-flex items-center gap-2 overflow-hidden rounded-lg bg-accent px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-accent/25 transition-[transform,box-shadow,background] duration-300 hover:-translate-y-0.5 hover:bg-accent-dark hover:shadow-xl hover:shadow-accent/30"
            >
              <span className="relative z-10">{company.heroCta.primary}</span>
              <ArrowRight className="relative z-10 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              <span
                className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-500 group-hover:translate-x-full"
                aria-hidden
              />
            </Link>
            <Link
              href="/#about"
              className="inline-flex items-center rounded-lg border border-white/25 bg-white/5 px-6 py-3.5 text-sm font-medium text-white backdrop-blur-sm transition-[transform,background,border-color] duration-300 hover:-translate-y-0.5 hover:border-white/40 hover:bg-white/10"
            >
              {company.heroCta.secondary}
            </Link>
          </div>

          <div className="mt-10 flex flex-wrap gap-6 border-t border-white/10 pt-8">
            <p className="hero-fade-up hero-delay-6 flex items-center gap-2 text-sm text-white/70">
              <Shield className="h-4 w-4 shrink-0 text-accent" />
              Fully insured cargo
            </p>
            <p className="hero-fade-up hero-delay-7 flex items-center gap-2 text-sm text-white/70">
              <Truck className="h-4 w-4 shrink-0 text-accent" />
              Nationwide fleet coverage
            </p>
          </div>
        </div>

        <Link
          href="/#products"
          className="hero-fade-up hero-delay-6 absolute bottom-8 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-1 text-white/50 transition-colors hover:text-white/80 md:flex"
          aria-label="Scroll to explore"
        >
          <span className="text-[0.65rem] font-medium uppercase tracking-[0.2em]">
            Explore
          </span>
          <ChevronDown className="hero-scroll-hint h-5 w-5" />
        </Link>
      </div>
    </section>
  );
}
