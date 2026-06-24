import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { LuxuryHero } from "@/components/city-access/LuxuryHero";
import { FleetSelector } from "@/components/city-access/FleetSelector";
import { LuxuryExperience } from "@/components/city-access/LuxuryExperience";
import { LuxuryCTA } from "@/components/city-access/LuxuryCTA";

export const metadata: Metadata = {
  title: "City Access — Executive Charter & Luxury Fleet",
  description:
    "Premium executive charter with professional chauffeurs. Select from Mercedes-Benz, BMW, Range Rover, Lexus, and ultra-luxury vehicles across Lagos and Nigeria.",
};

export default function CityAccessPage() {
  return (
    <>
      <Header variant="luxury" />
      <main className="bg-luxury-black">
        <LuxuryHero />
        <FleetSelector />
        <LuxuryExperience />
        <LuxuryCTA />
      </main>
      <Footer />
    </>
  );
}
