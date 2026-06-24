export type FleetCategory = "sedan" | "suv" | "van" | "ultra";

export type FleetVehicle = {
  id: string;
  name: string;
  tagline: string;
  category: FleetCategory;
  passengers: number;
  luggage: number;
  priceFrom: string;
  highlights: string[];
  onRequest?: boolean;
  image: string;
  imagePosition?: string;
};

export const fleetCategories: { id: FleetCategory | "all"; label: string }[] = [
  { id: "all", label: "All vehicles" },
  { id: "sedan", label: "Executive sedans" },
  { id: "suv", label: "Luxury SUVs" },
  { id: "van", label: "Executive vans" },
  { id: "ultra", label: "Ultra-luxury" },
];

export const fleetVehicles: FleetVehicle[] = [
  {
    id: "mercedes-s-class",
    name: "Mercedes-Benz S-Class",
    tagline: "Flagship executive sedan",
    category: "sedan",
    passengers: 3,
    luggage: 3,
    priceFrom: "₦95,000",
    highlights: ["Rear executive lounge", "Privacy glass", "Bottled water"],
    image: "/images/city-access.webp",
    imagePosition: "center 35%",
  },
  {
    id: "bmw-7-series",
    name: "BMW 7 Series",
    tagline: "Business-class comfort",
    category: "sedan",
    passengers: 3,
    luggage: 3,
    priceFrom: "₦88,000",
    highlights: ["Ambient lighting", "Wi-Fi on request", "Professional chauffeur"],
    image: "/images/city-access.webp",
    imagePosition: "60% 40%",
  },
  {
    id: "lexus-es",
    name: "Lexus ES 350",
    tagline: "Refined daily executive travel",
    category: "sedan",
    passengers: 3,
    luggage: 2,
    priceFrom: "₦72,000",
    highlights: ["Whisper-quiet cabin", "Leather interior", "City & airport runs"],
    image: "/images/city-access.webp",
    imagePosition: "40% 50%",
  },
  {
    id: "range-rover",
    name: "Range Rover Autobiography",
    tagline: "Commanding presence",
    category: "suv",
    passengers: 4,
    luggage: 4,
    priceFrom: "₦120,000",
    highlights: ["All-terrain capability", "Elevated seating", "VIP road presence"],
    image: "/images/city-access.webp",
    imagePosition: "center 30%",
  },
  {
    id: "land-cruiser-300",
    name: "Toyota Land Cruiser 300",
    tagline: "Executive SUV standard",
    category: "suv",
    passengers: 6,
    luggage: 5,
    priceFrom: "₦98,000",
    highlights: ["Secure convoy-ready", "Spacious rear cabin", "Nationwide routes"],
    image: "/images/city-access.webp",
    imagePosition: "70% 45%",
  },
  {
    id: "lexus-lx",
    name: "Lexus LX 600",
    tagline: "Premium SUV charter",
    category: "suv",
    passengers: 6,
    luggage: 5,
    priceFrom: "₦115,000",
    highlights: ["Multi-zone climate", "Captain rear seats", "Discreet transfers"],
    image: "/images/city-access.webp",
    imagePosition: "25% 40%",
  },
  {
    id: "mercedes-gle",
    name: "Mercedes-Benz GLE",
    tagline: "Versatile luxury SUV",
    category: "suv",
    passengers: 4,
    luggage: 4,
    priceFrom: "₦90,000",
    highlights: ["Panoramic roof option", "Smooth highway travel", "Corporate accounts"],
    image: "/images/city-access.webp",
    imagePosition: "50% 55%",
  },
  {
    id: "mercedes-v-class",
    name: "Mercedes-Benz V-Class",
    tagline: "Group executive transport",
    category: "van",
    passengers: 6,
    luggage: 6,
    priceFrom: "₦110,000",
    highlights: ["Delegation seating", "Conference-friendly", "Airport meet & greet"],
    image: "/images/city-access.webp",
    imagePosition: "center 25%",
  },
  {
    id: "rolls-royce-ghost",
    name: "Rolls-Royce Ghost",
    tagline: "The pinnacle of arrival",
    category: "ultra",
    passengers: 3,
    luggage: 2,
    priceFrom: "On request",
    highlights: ["White-glove service", "Bespoke itinerary", "Event & VIP protocol"],
    onRequest: true,
    image: "/images/city-access.webp",
    imagePosition: "center 20%",
  },
];

export function getVehicleById(id: string) {
  return fleetVehicles.find((v) => v.id === id);
}
