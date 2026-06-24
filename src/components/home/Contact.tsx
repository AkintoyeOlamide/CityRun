import type { ReactNode } from "react";
import {
  Globe,
  Mail,
  MapPin,
  Phone,
  Send,
  type LucideIcon,
} from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { company } from "@/lib/company";

const contactChannels: {
  label: string;
  value: ReactNode;
  href?: string;
  icon: LucideIcon;
}[] = [
  {
    label: "Address",
    value: company.address,
    icon: MapPin,
  },
  {
    label: "Email",
    value: company.email,
    href: `mailto:${company.email}`,
    icon: Mail,
  },
  {
    label: "Phone",
    value: company.phone,
    href: `tel:${company.phone.replace(/\s/g, "")}`,
    icon: Phone,
  },
  {
    label: "Website & social",
    value: (
      <>
        {company.website}
        <span className="text-white/40"> · </span>
        Instagram {company.instagram}
      </>
    ),
    icon: Globe,
  },
];

const inputClass =
  "w-full rounded-xl border border-border/80 bg-white px-4 py-3 text-sm text-foreground outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-muted/60 focus:border-accent/50 focus:ring-2 focus:ring-accent/15";

export function Contact() {
  return (
    <section
      id="contact"
      className="contact-section relative overflow-hidden bg-navy py-10 text-white md:py-12"
    >
      <div
        className="pointer-events-none absolute -right-20 top-0 h-72 w-72 rounded-full bg-accent/20 blur-[100px]"
        aria-hidden
      />

      <div className="relative mx-auto max-w-7xl px-5 md:px-8">
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-10 lg:items-start">
          <div>
            <Reveal>
              <div className="flex items-center gap-3">
                <span className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-accent">
                  Contact
                </span>
                <span className="contact-accent-line h-px flex-1 max-w-[100px]" />
              </div>
              <h2 className="mt-3 text-[clamp(1.75rem,4vw,2.5rem)] font-bold leading-[1.05] tracking-tight">
                Let&apos;s move your business
                <br />
                <span className="text-white/35">forward</span>
              </h2>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-white/55 md:text-base">
                Connect with Citygates Haulage & Logistics for quotes, fleet
                management, or partnership enquiries.
              </p>
            </Reveal>

            <address className="mt-6 grid gap-3 sm:grid-cols-2 not-italic lg:grid-cols-1">
              {contactChannels.map((channel, i) => {
                const Icon = channel.icon;
                const content = channel.href ? (
                  <a
                    href={channel.href}
                    className="mt-1 block text-sm font-medium text-white transition-colors hover:text-accent"
                  >
                    {channel.value}
                  </a>
                ) : (
                  <span className="mt-1 block text-sm font-medium text-white">
                    {channel.value}
                  </span>
                );

                return (
                  <Reveal key={channel.label} delay={100 + i * 70} variant="left">
                    <div className="contact-channel group flex gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-4 transition-[border-color,background] duration-300 hover:border-white/20 hover:bg-white/[0.07]">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-accent/30 bg-accent/10 text-accent transition-colors duration-300 group-hover:bg-accent group-hover:text-white">
                        <Icon className="h-4 w-4" strokeWidth={2} />
                      </span>
                      <div className="min-w-0">
                        <span className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-white/45">
                          {channel.label}
                        </span>
                        {content}
                      </div>
                    </div>
                  </Reveal>
                );
              })}
            </address>
          </div>

          <Reveal variant="right" delay={160}>
            <form className="contact-form rounded-2xl border border-white/10 bg-white p-5 text-foreground shadow-[0_24px_56px_-24px_rgba(0,0,0,0.45)] md:p-7">
              <div className="flex items-end justify-between gap-4 border-b border-border pb-4">
                <div>
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-accent">
                    Enquiry form
                  </p>
                  <h3 className="mt-1 text-xl font-bold text-navy">Send a message</h3>
                </div>
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-accent">
                  <Send className="h-4 w-4" strokeWidth={2.25} />
                </span>
              </div>

              <div className="mt-5 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="name"
                      className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted"
                    >
                      Full name
                    </label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      className={inputClass}
                      placeholder="Your name"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="email"
                      className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted"
                    >
                      Email
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      className={inputClass}
                      placeholder="you@company.com"
                    />
                  </div>
                </div>
                <div>
                  <label
                    htmlFor="service"
                    className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted"
                  >
                    Service interest
                  </label>
                  <select id="service" name="service" className={inputClass} defaultValue="">
                    <option value="" disabled>
                      Select a service
                    </option>
                    <option>City Access</option>
                    <option>City Move</option>
                    <option>City Run</option>
                    <option>Home Relocation</option>
                    <option>Fleet Management</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="message"
                    className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted"
                  >
                    Message
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={4}
                    className={`${inputClass} resize-none`}
                    placeholder="Tell us about your logistics needs..."
                  />
                </div>
                <button
                  type="submit"
                  className="group flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-3.5 text-sm font-semibold text-white shadow-lg shadow-accent/25 transition-[transform,background,box-shadow] duration-300 hover:-translate-y-0.5 hover:bg-accent-dark hover:shadow-xl hover:shadow-accent/30"
                >
                  Submit enquiry
                  <Send className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                </button>
              </div>
            </form>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
