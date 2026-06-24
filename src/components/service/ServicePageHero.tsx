import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

type ServicePageHeroProps = {
  eyebrow: string;
  title: string;
  description: string;
  image: string;
  imageAlt: string;
};

export function ServicePageHero({
  eyebrow,
  title,
  description,
  image,
  imageAlt,
}: ServicePageHeroProps) {
  return (
    <section className="relative bg-navy text-white">
      <div className="absolute inset-0">
        <Image
          src={image}
          alt={imageAlt}
          fill
          priority
          className="object-cover opacity-40"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/80 to-navy/50" />
      </div>

      <div className="relative mx-auto max-w-6xl px-5 pb-16 pt-8 md:px-8 md:pb-20 md:pt-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-white/70 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        <div className="mt-12 max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">
            {eyebrow}
          </p>
          <h1 className="mt-3 text-4xl font-bold leading-tight md:text-5xl">
            {title}
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-white/80">
            {description}
          </p>
        </div>
      </div>
    </section>
  );
}
