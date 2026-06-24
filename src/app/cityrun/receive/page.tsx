import { DeliveryRequestFlow } from "@/components/city-run/DeliveryRequestFlow";

export const metadata = {
  title: "Receive items | City Run",
};

export default function ReceiveItemsPage() {
  return <DeliveryRequestFlow kind="receive" />;
}
