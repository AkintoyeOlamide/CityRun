import dynamic from "next/dynamic";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/home/Hero";
import { Products } from "@/components/home/Products";

export const revalidate = 86400;

const About = dynamic(() =>
  import("@/components/home/About").then((m) => ({ default: m.About })),
);
const Services = dynamic(() =>
  import("@/components/home/Services").then((m) => ({ default: m.Services })),
);
const Values = dynamic(() =>
  import("@/components/home/Values").then((m) => ({ default: m.Values })),
);
const WhyChoose = dynamic(() =>
  import("@/components/home/WhyChoose").then((m) => ({ default: m.WhyChoose })),
);
const Clients = dynamic(() =>
  import("@/components/home/Clients").then((m) => ({ default: m.Clients })),
);
const Contact = dynamic(() =>
  import("@/components/home/Contact").then((m) => ({ default: m.Contact })),
);

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Products />
        <About />
        <Services />
        <Values />
        <WhyChoose />
        <Clients />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
