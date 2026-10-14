import type { DeliveryOrder } from "@/lib/city-run/types";

export type OrderPaymentMethod = "wallet" | "paystack";

export function isOrderPaid(
  order: Pick<DeliveryOrder, "paymentMethod">,
): boolean {
  return (
    order.paymentMethod === "wallet" || order.paymentMethod === "paystack"
  );
}

export function orderAwaitingPayment(order: DeliveryOrder): boolean {
  return order.status === "arrived_at_dropoff" && !isOrderPaid(order);
}

export function orderDueKobo(order: DeliveryOrder): number {
  return order.fareKobo ?? 0;
}
