export type DeliveryKind = "send" | "receive" | "store-pickup";

export type AddressValue = {
  formatted: string;
  placeId?: string;
  lat?: number;
  lng?: number;
};

export type DeliveryOrderDraft = {
  kind: DeliveryKind;
  pickup: AddressValue;
  dropoff: AddressValue;
  itemDescription: string;
  itemSize: "small" | "medium" | "large";
  notes: string;
  contactName: string;
  contactPhone: string;
  itemPhotoUrl?: string;
  proofOfDeliveryUrl?: string;
  userId?: string;
};

export type AccountType = "individual" | "business" | "vendor";

/** Saved client / delivery destination for business accounts */
export type SavedClient = {
  id: string;
  label: string;
  contactName: string;
  contactPhone: string;
  address: AddressValue;
};

export type UserProfile = {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  accountType: AccountType;
  businessName?: string;
  /** What the business typically ships — used on delivery requests */
  natureOfGoods?: string;
  businessAddress?: AddressValue;
  savedClients?: SavedClient[];
};

/** Admin-only vendor record (includes login password for ops). */
export type VendorAdmin = {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  businessName: string;
  businessAddress?: AddressValue;
  loginPassword: string | null;
  createdAt: string;
  orderCount: number;
  completedCount: number;
};

/** Admin view of any signed-in customer profile (individual, business, or vendor). */
export type CustomerAdminAccount = {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  accountType: AccountType;
  businessName?: string;
  natureOfGoods?: string;
  businessAddress?: AddressValue;
  loginPassword: string | null;
  createdAt: string;
  orderCount: number;
  completedCount: number;
  activeCount: number;
  cancelledCount: number;
  walletBalanceKobo?: number;
};

export type WalletSummary = {
  userId: string;
  balanceKobo: number;
  currency: string;
  updatedAt: string;
};

export type WalletTransaction = {
  id: string;
  type: "topup" | "debit" | "refund" | "adjustment";
  amountKobo: number;
  balanceAfterKobo: number;
  orderId?: string;
  description: string;
  createdAt: string;
};

export type Rider = {
  id: string;
  username: string;
  fullName: string;
  phone: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type RiderPublic = Omit<Rider, "updatedAt">;

/** Admin-only rider record (includes login password for ops). */
export type RiderAdmin = RiderPublic & {
  loginPassword: string | null;
  updatedAt: string;
};

/** Rider on an active delivery — used for admin fleet map. */
export type RiderFleetEntry = {
  riderId: string;
  riderName: string;
  riderPhone: string | null;
  location?: { lat: number; lng: number };
  updatedAt: string;
  hasGps: boolean;
  onDelivery: boolean;
  orderId?: string;
  orderStatus?: DeliveryOrderStatus;
};

export type DeliveryOrderStatus =
  | "pending"
  | "confirmed"
  | "rider_assigned"
  | "en_route_pickup"
  | "picked_up"
  | "in_transit"
  | "arrived_at_dropoff"
  | "delivered"
  | "cancelled";

export type DeliveryOrder = DeliveryOrderDraft & {
  id: string;
  status: DeliveryOrderStatus;
  createdAt: string;
  updatedAt: string;
  riderName?: string;
  riderPhone?: string;
  riderId?: string;
  userId?: string;
  /** Rider GPS — updated in real time once backend is connected */
  riderLocation?: { lat: number; lng: number };
  fareKobo?: number;
};
