import { Shield, Clock, MapPin, UserCheck } from "lucide-react";

const pillars = [
  {
    icon: UserCheck,
    title: "Professional chauffeurs",
    description:
      "Trained, vetted drivers in formal attire — punctual, discreet, and familiar with executive protocols.",
  },
  {
    icon: Shield,
    title: "Absolute discretion",
    description:
      "Privacy glass, confidential itineraries, and secure handling for C-suite and VIP movements.",
  },
  {
    icon: Clock,
    title: "On-time guarantee",
    description:
      "Flight monitoring, traffic-aware routing, and real-time coordination from our Lagos desk.",
  },
  {
    icon: MapPin,
    title: "Nationwide coverage",
    description:
      "Lagos operations with intercity and airport transfers across Nigeria on request.",
  },
];

const idealFor = [
  "C-Suite executives & board members",
  "Corporate delegations & roadshows",
  "Airport VIP meet & greet",
  "Client entertainment & events",
];

export function LuxuryExperience() {
  return (
    <section className="border-t border-white/8 bg-luxury-surface py-16 md:py-20">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-start">
          <div>
            <span className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-luxury-gold">
              The experience
            </span>
            <h2 className="mt-4 text-[clamp(1.5rem,3.5vw,2.25rem)] font-bold leading-tight text-white">
              Every journey handled with precision
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-white/45 md:text-base">
              City Access is our premium charter division — built for organizations
              that expect more than a ride. Corporate accounts, hourly charters,
              and multi-day assignments are available with flexible billing.
            </p>
            <ul className="mt-8 space-y-3">
              {idealFor.map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-3 border-l-2 border-luxury-gold/50 pl-4 text-sm text-white/70"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {pillars.map((pillar) => {
              const Icon = pillar.icon;
              return (
                <div
                  key={pillar.title}
                  className="luxury-pillar rounded-2xl border border-white/8 bg-luxury-black/60 p-5 transition-[border-color] duration-300 hover:border-luxury-gold/25"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-luxury-gold/25 bg-luxury-gold/10 text-luxury-gold">
                    <Icon className="h-4 w-4" strokeWidth={2} />
                  </span>
                  <h3 className="mt-4 text-sm font-bold text-white">{pillar.title}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-white/45">
                    {pillar.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
