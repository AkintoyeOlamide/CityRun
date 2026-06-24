import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { productLinks } from "@/lib/company";

const layoutByHref: Record<
  (typeof productLinks)[number]["href"],
  string
> = {
  "/city-access": "lg:col-span-7 lg:row-span-2",
  "/city-move": "lg:col-span-5 lg:col-start-8 lg:row-start-1",
  "/cityrun": "lg:col-span-5 lg:col-start-8 lg:row-start-2",
};

export function Products() {
  return (
    <section
      id="products"
      className="products-mesh relative flex min-h-[100dvh] flex-col overflow-hidden text-white"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
        }}
        aria-hidden
      />

      <div className="relative mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col px-5 py-8 md:px-8 md:py-10">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
          <Reveal className="max-w-2xl">
            <div className="flex items-center gap-3">
              <span className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-accent">
                Product lines
              </span>
              <span className="h-px flex-1 max-w-[80px] products-grid-line" />
            </div>
            <h2 className="mt-3 text-[clamp(1.75rem,4vw,2.5rem)] font-bold leading-[1.05] tracking-tight">
              Three brands.
              <br />
              <span className="text-white/35">One standard of delivery.</span>
            </h2>
          </Reveal>
          <Reveal delay={100} className="max-w-sm lg:text-right">
            <p className="text-sm leading-relaxed text-white/55">
              Each Citygates brand is built for a distinct need — from executive
              charter to heavy haulage and last-mile dispatch.
            </p>
          </Reveal>
        </div>

        <div className="products-grid-line mt-6 w-full opacity-80" aria-hidden />

        <div className="products-bento mt-5 grid min-h-0 flex-1 grid-cols-1 gap-3 sm:gap-3.5 lg:mt-6 lg:grid-cols-12 lg:grid-rows-2 lg:gap-4">
          {productLinks.map((product, i) => (
            <Reveal
              key={product.href}
              delay={140 + i * 100}
              variant="up"
              className={`h-full min-h-0 ${layoutByHref[product.href]}`}
            >
              <Link
                href={product.href}
                className="brand-card brand-card--compact group relative flex h-full min-h-[28dvh] flex-col justify-end overflow-hidden rounded-xl bg-navy-light/40 lg:min-h-0"
              >
                <div className="absolute inset-0 overflow-hidden">
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    className="brand-card__img object-cover brightness-[0.82]"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                  <div className="absolute inset-0 bg-black/25" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 from-0% via-black/45 via-50% to-black/15 to-100%" />
                  <div className="absolute inset-0 bg-gradient-to-br from-accent/25 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                </div>

                <span
                  className="brand-card__index brand-card__index--compact pointer-events-none absolute right-2 top-1 z-0 font-bold select-none"
                  aria-hidden
                >
                  {product.index}
                </span>

                <span className="absolute left-3 top-3 z-10 rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-white backdrop-blur-md">
                  {product.tag}
                </span>

                <span className="brand-card__cta absolute bottom-3 right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white backdrop-blur-md">
                  <ArrowUpRight className="h-4 w-4" strokeWidth={2.25} />
                </span>

                <div className="brand-card__copy relative z-10 flex w-full flex-col gap-2.5 p-4 pb-4 pr-14 md:p-5 md:pb-5 md:pr-16">
                  <p className="line-clamp-2 text-sm leading-relaxed text-white/90 md:text-[0.85rem]">
                    {product.summary}
                  </p>
                  <div className="flex items-end justify-between gap-4">
                    <h3
                      className={`font-bold leading-none tracking-tight text-white ${
                        product.href === "/city-access"
                          ? "text-2xl md:text-3xl"
                          : "text-xl md:text-2xl"
                      }`}
                    >
                      {product.name}
                    </h3>
                    <span className="inline-flex shrink-0 items-center gap-2 pb-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-accent">
                      Explore
                      <span className="h-px w-6 bg-accent transition-all duration-500 group-hover:w-10" />
                    </span>
                  </div>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
