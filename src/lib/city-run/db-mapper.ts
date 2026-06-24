import type {
  AddressValue,
  DeliveryKind,
  DeliveryOrder,
  DeliveryOrderDraft,
  DeliveryOrderStatus,
} from "@/lib/city-run/types";

export type DeliveryOrderRow = {
  id: string;
  kind: DeliveryKind;
  status: DeliveryOrderStatus;
  pickup: AddressValue;
  dropoff: AddressValue;
  item_description: string;
  item_size: "small" | "medium" | "large";
  notes: string;
  contact_name: string;
  contact_phone: string;
  rider_name: string | null;
  rider_phone: string | null;
  rider_id: string | null;
  rider_location: { lat: number; lng: number } | null;
  item_photo_url: string | null;
  proof_of_delivery_url: string | null;
  user_id: string | null;
  fare_kobo: number | null;
  payment_method: "wallet" | "none" | null;
  wallet_transaction_id: string | null;
  created_at: string;
  updated_at: string;
};

export function rowToOrder(row: DeliveryOrderRow): DeliveryOrder {
  return {
    id: row.id,
    kind: row.kind,
    status: row.status,
    pickup: row.pickup,
    dropoff: row.dropoff,
    itemDescription: row.item_description,
    itemSize: row.item_size,
    notes: row.notes,
    contactName: row.contact_name,
    contactPhone: row.contact_phone,
    riderName: row.rider_name ?? undefined,
    riderPhone: row.rider_phone ?? undefined,
    riderId: row.rider_id ?? undefined,
    riderLocation: row.rider_location ?? undefined,
    itemPhotoUrl: row.item_photo_url ?? undefined,
    proofOfDeliveryUrl: row.proof_of_delivery_url ?? undefined,
    userId: row.user_id ?? undefined,
    fareKobo: row.fare_kobo ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function draftToInsert(draft: DeliveryOrderDraft) {
  return {
    kind: draft.kind,
    status: "pending" as const,
    pickup: draft.pickup,
    dropoff: draft.dropoff,
    item_description: draft.itemDescription,
    item_size: draft.itemSize,
    notes: draft.notes,
    contact_name: draft.contactName,
    contact_phone: draft.contactPhone,
    ...(draft.itemPhotoUrl ? { item_photo_url: draft.itemPhotoUrl } : {}),
    ...(draft.userId ? { user_id: draft.userId } : {}),
  };
}
