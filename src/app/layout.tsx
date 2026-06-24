import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: {
    default: "Citygates Haulage & Logistics | Lagos, Nigeria",
    template: "%s | Citygates Haulage & Logistics",
  },
  description:
    "Premium haulage and logistics across Nigeria. Executive charter, cargo haulage, last-mile dispatch, and fleet management. Driven by People. Delivered with Precision.",
  icons: {
    icon: [
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  other: {
    google: "notranslate",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      translate="no"
      className={`notranslate ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body
        className="notranslate min-h-full flex flex-col bg-background text-foreground"
        suppressHydrationWarning
      >
        <Script
          id="hydration-guard"
          strategy="lazyOnload"
          dangerouslySetInnerHTML={{
            __html: `(function(){var s=[".translate-tooltip-mtz",".translator-hidden","[class*='translator-']","[class*='translate-tooltip']"];function c(){s.forEach(function(q){document.querySelectorAll(q).forEach(function(el){el.remove()})})}c();document.documentElement.setAttribute("translate","no");document.documentElement.classList.add("notranslate");document.addEventListener("DOMContentLoaded",c)})();`,
          }}
        />
        {children}
      </body>
    </html>
  );
}
