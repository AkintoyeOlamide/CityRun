import type { Metadata } from "next";
import Image from "next/image";
import { Check } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ServicePageHero } from "@/components/service/ServicePageHero";
import { CTABand } from "@/components/service/CTABand";
import { company } from "@/lib/company";

export const metadata: Metadata = {
  title: "City Move — Haulage & Cargo Solutions",
  description:
    "Haulage for bulk goods and industrial transport across Lagos and Nigeria, with goods-in-transit insurance.",
};

const capabilities = [
  { label: "Fleet", value: "Heavy-duty cargo trucks" },
  { label: "Coverage", value: "Lagos & nationwide" },
  { label: "Insurance", value: "Goods-in-transit" },
  { label: "Drivers", value: "Qualified & trained" },
  { label: "Maintenance", value: "Routine protocols" },
  { label: "Tracking", value: "Real-time GPS" },
  { label: "Scheduling", value: "Flexible" },
  { label: "Expansion", value: "Q1 2026" },
];

export default function CityMovePage() {
  return (
    <>
      <Header />
      <main>
        <ServicePageHero
          eyebrow="City Move"
          title="Haulage & cargo solutions"
          description="Dynamic haulage and cargo solutions for bulk goods, industrial transport, and large-scale logistics — connecting businesses to markets with efficiency, reliability, and complete goods-in-transit insurance."
          image="/images/city-move.webp"
          imageAlt="Heavy duty truck for cargo haulage"
        />

        <section className="section-pad bg-cream">
          <div className="mx-auto max-w-6xl px-5 md:px-8">
            <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
              <div className="relative aspect-[4/3] overflow-hidden rounded-lg">
                <Image
                  src="/images/city-move.webp"
                  alt="Cargo truck on highway"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-navy md:text-3xl">
                  Built for manufacturers and distributors
                </h2>
                <p className="mt-4 text-muted leading-relaxed">
                  Our haulage fleet serves manufacturers,
                  distributors, and enterprises across Lagos and Nigeria. Every
                  movement is supported by trained drivers, routine maintenance,
                  and transparent GPS tracking.
                </p>
                <p className="mt-4 text-sm font-semibold text-navy">
                  Trusted by leading organizations
                </p>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {company.clients.map((c) => (
                    <li
                      key={c}
                      className="rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-navy"
                    >
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="section-pad border-t border-border bg-card">
          <div className="mx-auto max-w-6xl px-5 md:px-8">
            <h2 className="text-2xl font-bold text-navy">Fleet & capabilities</h2>
            <dl className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {capabilities.map((cap) => (
                <div
                  key={cap.label}
                  className="rounded-lg border border-border bg-background p-4"
                >
                  <dt className="text-xs font-semibold uppercase tracking-wider text-muted">
                    {cap.label}
                  </dt>
                  <dd className="mt-1 font-medium text-navy">{cap.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className="section-pad bg-background">
          <div className="mx-auto max-w-6xl px-5 md:px-8">
            <h2 className="text-2xl font-bold text-navy">What we haul</h2>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {[
                "Bulk goods and raw materials",
                "FMCG and finished products",
                "Industrial equipment",
                "Aviation ground logistics support",
                "Scheduled and ad-hoc routes",
                "Nationwide distribution",
              ].map((item) => (
                <li key={item} className="flex gap-3 text-sm text-foreground">
                  <Check className="h-4 w-4 shrink-0 text-accent" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <CTABand
          title="Schedule City Move"
          description="Request a haulage quote for bulk cargo, industrial transport, or recurring distribution routes."
        />
      </main>
      <Footer />
    </>
  );
}
