import Image from "next/image";
import Link from "next/link";
import { company, productLinks } from "@/lib/company";

export function Footer() {
  return (
    <footer className="border-t border-border bg-white text-navy">
      <div className="mx-auto max-w-6xl px-5 py-14 md:px-8">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <Image
              src="/chl.png"
              alt={`${company.name} logo`}
              width={926}
              height={158}
              className="h-6 w-auto md:h-7"
            />
            <p className="mt-4 text-sm leading-relaxed text-muted">
              {company.tagline}
            </p>
            <p className="mt-3 text-xs text-muted/80">
              Member of {company.parent}
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold">Our brands</h4>
            <ul className="mt-4 space-y-2">
              {productLinks.map((p) => (
                <li key={p.href}>
                  <Link
                    href={p.href}
                    className="text-sm text-muted transition-colors hover:text-navy"
                  >
                    {p.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/#services"
                  className="text-sm text-muted transition-colors hover:text-navy"
                >
                  Home Relocation
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold">Company</h4>
            <ul className="mt-4 space-y-2 text-sm text-muted">
              <li>
                <Link href="/#about" className="hover:text-navy">
                  About CHL
                </Link>
              </li>
              <li>
                <Link href="/#services" className="hover:text-navy">
                  All services
                </Link>
              </li>
              <li>
                <Link href="/#clients" className="hover:text-navy">
                  Clients
                </Link>
              </li>
              <li>
                <Link href="/#contact" className="hover:text-navy">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold">Contact</h4>
            <ul className="mt-4 space-y-2 text-sm text-muted">
              <li>{company.address}</li>
              <li>
                <a href={`mailto:${company.email}`} className="hover:text-navy">
                  {company.email}
                </a>
              </li>
              <li>
                <a
                  href={`tel:${company.phone.replace(/\s/g, "")}`}
                  className="hover:text-navy"
                >
                  {company.phone}
                </a>
              </li>
              <li>Instagram: {company.instagram}</li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-border pt-8 text-xs text-muted md:flex-row md:justify-between">
          <p>
            © {company.year} {company.name}. All rights reserved.
          </p>
          <p>Company Profile {company.year}</p>
        </div>
      </div>
    </footer>
  );
}
