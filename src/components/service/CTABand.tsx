import Link from "next/link";

type CTABandProps = {
  title: string;
  description: string;
};

export function CTABand({ title, description }: CTABandProps) {
  return (
    <section className="border-t border-border bg-navy py-14 text-white">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-5 md:flex-row md:items-center md:px-8">
        <div>
          <h2 className="text-2xl font-bold">{title}</h2>
          <p className="mt-2 max-w-lg text-sm text-white/70">{description}</p>
        </div>
        <Link
          href="/#contact"
          className="shrink-0 rounded-md bg-accent px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-dark"
        >
          Request a quote
        </Link>
      </div>
    </section>
  );
}
