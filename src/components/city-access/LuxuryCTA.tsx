import Link from "next/link";

export function LuxuryCTA() {
  return (
    <section className="relative overflow-hidden border-t border-white/8 bg-luxury-black py-16 md:py-20">
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          background:
            "radial-gradient(ellipse 60% 80% at 50% 100%, rgba(43, 87, 167, 0.12), transparent)",
        }}
        aria-hidden
      />
      <div className="relative mx-auto max-w-7xl px-5 text-center md:px-8">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-luxury-gold">
          Concierge booking
        </p>
        <h2 className="mt-4 text-[clamp(1.5rem,3.5vw,2.5rem)] font-bold text-white">
          Ready to arrive in style?
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-sm text-white/45 md:text-base">
          Share your itinerary, preferred vehicle, and schedule — our team will
          confirm availability and corporate account options within hours.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href="/#contact?service=City+Access"
            className="rounded-full bg-luxury-gold px-8 py-3.5 text-sm font-semibold text-white transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_40px_-12px_rgba(43,87,167,0.5)]"
          >
            Book City Access
          </Link>
          <Link
            href="/#contact"
            className="rounded-full border border-white/20 px-8 py-3.5 text-sm font-semibold text-white/90 transition-colors hover:border-luxury-gold/50 hover:text-luxury-gold"
          >
            Corporate account enquiry
          </Link>
        </div>
      </div>
    </section>
  );
}
