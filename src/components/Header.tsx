"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu, X, ChevronDown } from "lucide-react";
import { company, navLinks, productLinks } from "@/lib/company";

type HeaderProps = {
  variant?: "default" | "luxury";
};

export function Header({ variant = "default" }: HeaderProps) {
  const [open, setOpen] = useState(false);
  const [productsOpen, setProductsOpen] = useState(false);
  const isLuxury = variant === "luxury";

  return (
    <header
      className={
        isLuxury
          ? "sticky top-0 z-50 border-b border-white/10 bg-luxury-black/90 backdrop-blur-md"
          : "sticky top-0 z-50 border-b border-border bg-cream/95 backdrop-blur-sm"
      }
    >
      <div className="mx-auto flex h-[4.25rem] max-w-6xl items-center justify-between gap-6 px-5 md:px-8">
        <Link href="/" className="shrink-0">
          <Image
            src="/chl.png"
            alt={`${company.name} logo`}
            width={926}
            height={158}
            className="h-6 w-auto md:h-7"
            priority
          />
        </Link>

        <nav className="hidden items-center gap-7 lg:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={
                isLuxury
                  ? "text-sm text-white/60 transition-colors hover:text-luxury-gold"
                  : "text-sm text-muted transition-colors hover:text-navy"
              }
            >
              {link.label}
            </Link>
          ))}
          <div className="relative">
            <button
              type="button"
              className={
                isLuxury
                  ? "flex items-center gap-1 text-sm text-white/60 transition-colors hover:text-luxury-gold"
                  : "flex items-center gap-1 text-sm text-muted transition-colors hover:text-navy"
              }
              onClick={() => setProductsOpen(!productsOpen)}
              onBlur={() => setTimeout(() => setProductsOpen(false), 150)}
            >
              Our brands
              <ChevronDown
                className={`h-4 w-4 transition-transform ${productsOpen ? "rotate-180" : ""}`}
              />
            </button>
            {productsOpen && (
              <div
                className={`absolute right-0 top-full mt-2 w-56 rounded-lg border py-2 shadow-lg ${
                  isLuxury
                    ? "border-white/10 bg-luxury-surface"
                    : "border-border bg-card"
                }`}
              >
                {productLinks.map((p) => (
                  <Link
                    key={p.href}
                    href={p.href}
                    className={`block px-4 py-2.5 text-sm ${
                      isLuxury ? "hover:bg-white/5" : "hover:bg-background"
                    }`}
                  >
                    <span
                      className={`font-medium ${isLuxury ? "text-white" : "text-navy"}`}
                    >
                      {p.name}
                    </span>
                    <span
                      className={`mt-0.5 block text-xs ${
                        isLuxury ? "text-white/45" : "text-muted"
                      }`}
                    >
                      {p.tag}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </nav>

        <Link
          href="/#contact"
          className={
            isLuxury
              ? "hidden rounded-full bg-luxury-gold px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-light lg:inline-block"
              : "hidden rounded-md bg-navy px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-navy-light lg:inline-block"
          }
        >
          Request a quote
        </Link>

        <button
          type="button"
          className={`rounded-md p-2 lg:hidden ${isLuxury ? "text-white" : "text-navy"}`}
          onClick={() => setOpen(!open)}
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <nav
          className={
            isLuxury
              ? "border-t border-white/10 bg-luxury-surface px-5 py-4 lg:hidden"
              : "border-t border-border bg-card px-5 py-4 lg:hidden"
          }
        >
          <div className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-md px-2 py-2.5 text-sm ${
                  isLuxury ? "text-white/80" : "text-foreground"
                }`}
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <p
              className={`mt-3 px-2 text-xs font-semibold uppercase tracking-wider ${
                isLuxury ? "text-white/40" : "text-muted"
              }`}
            >
              Our brands
            </p>
            {productLinks.map((p) => (
              <Link
                key={p.href}
                href={p.href}
                className={`rounded-md px-2 py-2 text-sm font-medium ${
                  isLuxury ? "text-white" : "text-navy"
                }`}
                onClick={() => setOpen(false)}
              >
                {p.name}
              </Link>
            ))}
            <Link
              href="/#contact"
              className={
                isLuxury
                  ? "mt-3 rounded-full bg-luxury-gold py-3 text-center text-sm font-semibold text-luxury-black"
                  : "mt-3 rounded-md bg-navy py-3 text-center text-sm font-medium text-white"
              }
              onClick={() => setOpen(false)}
            >
              Request a quote
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
