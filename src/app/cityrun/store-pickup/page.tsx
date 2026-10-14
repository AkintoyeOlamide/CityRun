import { DeliveryRequestFlow } from "@/components/city-run/DeliveryRequestFlow";

export const metadata = {
  title: "Store pickup",
};

export default function StorePickupPage() {
  return <DeliveryRequestFlow kind="store-pickup" />;
}
