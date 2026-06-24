import type { Metadata } from "next";
import { CityRunSplashLanding } from "@/components/city-run/CityRunSplashLanding";

export const metadata: Metadata = {
  title: "City Run — Last-Mile Dispatch",
  description:
    "Fast last-mile delivery for e-commerce, retail, SMEs, and food vendors across Lagos.",
};

export default function CityRunPage() {
  return (
    <main>
      <CityRunSplashLanding />
    </main>
  );
}
