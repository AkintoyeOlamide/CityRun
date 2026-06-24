import { Reveal } from "@/components/Reveal";
import { coreValues } from "@/lib/company";

export function Values() {
  return (
    <section className="section-pad bg-navy text-white">
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <Reveal className="max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            Core values
          </p>
          <h2 className="mt-3 text-3xl font-bold md:text-4xl">
            How we work with clients and our people
          </h2>
        </Reveal>

        <ul className="mt-12 grid gap-px overflow-hidden rounded-lg border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-5">
          {coreValues.map((value, i) => (
            <Reveal key={value.title} as="li" delay={i * 80} variant="up">
              <div className="h-full bg-navy p-5 transition-colors duration-300 hover:bg-navy-light md:p-6">
                <h3 className="font-semibold text-accent">{value.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/70">
                  {value.desc}
                </p>
              </div>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
