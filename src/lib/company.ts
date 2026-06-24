export const company = {
  name: "Citygates Haulage & Logistics",
  shortName: "CHL",
  tagline: "Driven by People. Delivered with Precision.",
  year: 2026,
  parent: "Bitachon: The VMO Group",
  hq: "Lagos, Nigeria",
  address: "47a, Oduduwa Crescent, Ikeja GRA, Lagos",
  email: "info@citygateshl.com",
  phone: "+234 707 366 7601",
  website: "www.citygateshl.com",
  instagram: "@citygateshl",
  clients: ["Unilever Nigeria", "PZ Cussons", "Sonia Foods", "VMO Aero Limited"],
  heroCta: {
    primary: "Get a quote",
    secondary: "About us",
  },
} as const;

export const navLinks = [
  { href: "/#about", label: "About" },
  { href: "/#services", label: "Services" },
  { href: "/#clients", label: "Clients" },
  { href: "/#contact", label: "Contact" },
] as const;

export const productLinks = [
  {
    href: "/city-access",
    name: "City Access",
    tag: "Executive Charter",
    image: "/images/city-access.webp",
    summary:
      "Premium charter and corporate transport with professional chauffeurs and executive vehicles.",
    index: "01",
  },
  {
    href: "/city-move",
    name: "City Move",
    tag: "Haulage & Cargo",
    image: "/images/city-move.webp",
    summary:
      "Haulage for bulk goods and industrial transport with goods-in-transit insurance.",
    index: "02",
  },
  {
    href: "/cityrun",
    name: "City Run",
    tag: "Last-Mile Dispatch",
    image: "/images/city-run-card.webp",
    summary:
      "Last-mile delivery for e-commerce, retail, and SMEs across Lagos.",
    index: "03",
  },
] as const;

export const coreValues = [
  { title: "Precision", desc: "Accuracy, speed and clarity in every delivery." },
  { title: "Integrity", desc: "Honesty and transparency with clients and partners." },
  { title: "Service", desc: "People-first excellence across our operations." },
  { title: "Innovation", desc: "Smart, agile solutions for modern logistics." },
  { title: "Empowerment", desc: "Growth and leadership for our teams." },
] as const;

export const whyChoose = [
  {
    title: "VMO Group heritage",
    desc: "Backed by the integrity and standards of Bitachon: The VMO Group.",
  },
  {
    title: "People-first culture",
    desc: "A team-first approach that drives exceptional customer experiences.",
  },
  {
    title: "Tech-enabled operations",
    desc: "GPS tracking, digital booking, and real-time updates for accountability.",
  },
  {
    title: "Local expertise",
    desc: "Nigerian-rooted operations with systems built for nationwide scale.",
  },
  {
    title: "Trained personnel",
    desc: "Qualified drivers and staff trained to international service standards.",
  },
  {
    title: "Proven track record",
    desc: "Trusted by Unilever, PZ Cussons, Sonia Foods, and VMO Aero Limited.",
  },
] as const;
