import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { deleteCustomerAccounts } from "@/lib/city-run/customers-store";
import { registerVendorByAdmin } from "@/lib/auth/customer-auth";
import { upsertProfile, type ProfileRow } from "@/lib/auth/profile-store";
import { listOrdersForUser } from "@/lib/city-run/orders-store";
import type { AddressValue, VendorAdmin } from "@/lib/city-run/types";

const VENDOR_SELECT =
  "id, full_name, phone, account_type, business_name, business_address, login_password, created_at";

type VendorRow = ProfileRow & {
  created_at?: string | null;
};

async function getUserEmail(userId: string): Promise<string> {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error || !data.user?.email) return "";
  return data.user.email;
}

function rowToVendorAdmin(
  row: VendorRow,
  email: string,
  stats: { orderCount: number; completedCount: number },
): VendorAdmin {
  return {
    id: row.id,
    email,
    fullName: row.full_name,
    phone: row.phone,
    businessName: row.business_name?.trim() || "",
    businessAddress: row.business_address?.formatted
      ? row.business_address
      : undefined,
    loginPassword: row.login_password ?? null,
    createdAt: row.created_at ?? new Date().toISOString(),
    orderCount: stats.orderCount,
    completedCount: stats.completedCount,
  };
}

export async function listVendorsAdmin(): Promise<VendorAdmin[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(VENDOR_SELECT)
    .eq("account_type", "vendor")
    .order("created_at", { ascending: false });

  if (error) {
    if (error.message?.includes("account_type") || error.code === "PGRST204") {
      return [];
    }
    throw new Error(error.message);
  }

  const rows = (data ?? []) as VendorRow[];

  return Promise.all(
    rows.map(async (row) => {
      const email = await getUserEmail(row.id);
      let orderCount = 0;
      let completedCount = 0;
      try {
        const orders = await listOrdersForUser(row.id);
        orderCount = orders.length;
        completedCount = orders.filter((o) => o.status === "delivered").length;
      } catch {
        /* stats optional */
      }
      return rowToVendorAdmin(row, email, { orderCount, completedCount });
    }),
  );
}

export async function createVendor(input: {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  businessName: string;
  businessAddress: AddressValue;
}): Promise<VendorAdmin> {
  const user = await registerVendorByAdmin(input);
  const email = user.email ?? input.email.trim();
  return {
    id: user.id,
    email,
    fullName: input.fullName.trim(),
    phone: input.phone.trim(),
    businessName: input.businessName.trim(),
    businessAddress: input.businessAddress,
    loginPassword: input.password,
    createdAt: user.created_at ?? new Date().toISOString(),
    orderCount: 0,
    completedCount: 0,
  };
}

export async function deleteVendors(ids: string[]): Promise<{ deleted: string[] }> {
  return deleteCustomerAccounts(ids);
}

export async function updateVendorPassword(
  vendorId: string,
  email: string,
  password: string,
  profile: { fullName: string; phone: string; businessName: string; businessAddress?: AddressValue },
): Promise<void> {
  if (password.length < 6) {
    throw new Error("Password must be at least 6 characters.");
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(vendorId, { password });
  if (error) throw new Error(error.message);

  await upsertProfile(vendorId, email, {
    fullName: profile.fullName,
    phone: profile.phone,
    accountType: "vendor",
    businessName: profile.businessName,
    ...(profile.businessAddress?.formatted
      ? { businessAddress: profile.businessAddress }
      : {}),
    loginPassword: password,
  });
}

export async function getVendorAdmin(vendorId: string): Promise<VendorAdmin | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(VENDOR_SELECT)
    .eq("id", vendorId)
    .eq("account_type", "vendor")
    .maybeSingle();

  if (error || !data) return null;

  const row = data as VendorRow;
  const email = await getUserEmail(row.id);
  let orderCount = 0;
  let completedCount = 0;
  try {
    const orders = await listOrdersForUser(row.id);
    orderCount = orders.length;
    completedCount = orders.filter((o) => o.status === "delivered").length;
  } catch {
    /* optional */
  }

  return rowToVendorAdmin(row, email, { orderCount, completedCount });
}
