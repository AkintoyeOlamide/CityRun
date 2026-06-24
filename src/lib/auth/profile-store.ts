import { createAdminClient, isSupabaseConfigured, type SupabaseClient } from "@/lib/supabase/server";
import type {
  AccountType,
  AddressValue,
  SavedClient,
  UserProfile,
} from "@/lib/city-run/types";

export type ProfileRow = {
  id: string;
  full_name: string;
  phone: string;
  account_type?: AccountType | null;
  business_name?: string | null;
  nature_of_goods?: string | null;
  business_address?: AddressValue | null;
  saved_clients?: SavedClient[] | null;
  login_password?: string | null;
  created_at?: string | null;
};

export type ProfilePatch = {
  fullName: string;
  phone: string;
  accountType?: AccountType;
  businessName?: string;
  natureOfGoods?: string;
  businessAddress?: AddressValue;
  savedClients?: SavedClient[];
  loginPassword?: string | null;
};

function parseAccountType(raw: unknown): AccountType {
  if (raw === "business") return "business";
  if (raw === "vendor") return "vendor";
  return "individual";
}

function isBusinessLikeType(accountType: AccountType) {
  return accountType === "business" || accountType === "vendor";
}

function isMissingColumnError(error: { code?: string; message?: string }) {
  const msg = (error.message ?? "").toLowerCase();
  return (
    error.code === "PGRST204" ||
    error.code === "42703" ||
    msg.includes("column") ||
    msg.includes("does not exist") ||
    msg.includes("schema cache")
  );
}

function missingColumnHint(error: { message?: string }) {
  const msg = error.message ?? "";
  if (msg.includes("nature_of_goods")) {
    return (
      "Database is missing the nature_of_goods column. " +
      "Run supabase/migrations/add_nature_of_goods.sql in Supabase SQL Editor."
    );
  }
  if (msg.includes("business_address")) {
    return (
      "Database is missing the business_address column. " +
      "Open Supabase → SQL Editor and run supabase/migrations/apply_cityrun_profile_updates.sql"
    );
  }
  if (msg.includes("saved_clients")) {
    return (
      "Database is missing the saved_clients column. " +
      "Run supabase/migrations/apply_cityrun_profile_updates.sql in Supabase SQL Editor."
    );
  }
  if (msg.includes("login_password")) {
    return (
      "Database is missing the login_password column. " +
      "Run supabase/migrations/apply_cityrun_profile_updates.sql in Supabase SQL Editor."
    );
  }
  if (msg.includes("account_type") || msg.includes("vendor")) {
    return (
      "Database needs profile updates for vendor accounts. " +
      "Run supabase/migrations/apply_cityrun_profile_updates.sql in Supabase SQL Editor."
    );
  }
  return msg;
}

function parseSavedClients(raw: unknown): SavedClient[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (item): item is SavedClient =>
      typeof item === "object" &&
      item !== null &&
      typeof (item as SavedClient).id === "string" &&
      typeof (item as SavedClient).contactName === "string" &&
      typeof (item as SavedClient).address?.formatted === "string",
  );
}

function rowToProfile(row: ProfileRow, email: string): UserProfile {
  const accountType = parseAccountType(row.account_type);
  const businessName = row.business_name?.trim() || undefined;
  const natureOfGoods = row.nature_of_goods?.trim() || undefined;
  const businessAddress = row.business_address?.formatted
    ? row.business_address
    : undefined;
  const savedClients = parseSavedClients(row.saved_clients);

  return {
    id: row.id,
    fullName: row.full_name,
    phone: row.phone,
    email,
    accountType,
    ...(businessName ? { businessName } : {}),
    ...(natureOfGoods ? { natureOfGoods } : {}),
    ...(businessAddress ? { businessAddress } : {}),
    ...(savedClients.length ? { savedClients } : {}),
  };
}

function emptyProfile(userId: string, email: string): UserProfile {
  return { id: userId, fullName: "", phone: "", email, accountType: "individual" };
}

const PROFILE_SELECT =
  "id, full_name, phone, account_type, business_name, nature_of_goods, business_address, saved_clients, login_password, created_at";

export async function getProfile(
  userId: string,
  email: string,
  supabaseClient?: SupabaseClient,
): Promise<UserProfile | null> {
  if (!isSupabaseConfigured()) {
    return emptyProfile(userId, email);
  }

  const supabase = supabaseClient ?? createAdminClient();
  let { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_SELECT)
    .eq("id", userId)
    .maybeSingle();

  if (error && isMissingColumnError(error)) {
    ({ data, error } = await supabase
      .from("profiles")
      .select("id, full_name, phone, account_type, business_name")
      .eq("id", userId)
      .maybeSingle());
  }

  if (error || !data) {
    return emptyProfile(userId, email);
  }

  return rowToProfile(data as ProfileRow, email);
}

export async function upsertProfile(
  userId: string,
  email: string,
  patch: ProfilePatch,
): Promise<UserProfile> {
  const accountType = patch.accountType ?? "individual";
  const businessName = patch.businessName?.trim() ?? "";
  const natureOfGoods = patch.natureOfGoods?.trim() ?? "";
  const savedClients = patch.savedClients ?? [];

  if (!isSupabaseConfigured()) {
    return {
      id: userId,
      fullName: patch.fullName,
      phone: patch.phone,
      email,
      accountType,
      ...(isBusinessLikeType(accountType) && businessName ? { businessName } : {}),
      ...(isBusinessLikeType(accountType) && natureOfGoods ? { natureOfGoods } : {}),
      ...(patch.businessAddress?.formatted ? { businessAddress: patch.businessAddress } : {}),
      ...(savedClients.length ? { savedClients } : {}),
    };
  }

  const supabase = createAdminClient();
  return upsertProfileRow(supabase, userId, email, patch);
}

async function upsertProfileRow(
  supabase: SupabaseClient,
  userId: string,
  email: string,
  patch: ProfilePatch,
): Promise<UserProfile> {
  const accountType = patch.accountType ?? "individual";
  const businessName = patch.businessName?.trim() ?? "";
  const natureOfGoods = patch.natureOfGoods?.trim() ?? "";
  const savedClients = patch.savedClients ?? [];

  const row: Record<string, unknown> = {
    id: userId,
    full_name: patch.fullName,
    phone: patch.phone,
    updated_at: new Date().toISOString(),
    account_type: accountType,
    business_name: isBusinessLikeType(accountType) ? businessName : "",
    nature_of_goods: isBusinessLikeType(accountType) ? natureOfGoods : "",
    business_address: patch.businessAddress?.formatted ? patch.businessAddress : null,
    saved_clients: savedClients,
  };

  if (patch.loginPassword !== undefined) {
    row.login_password = patch.loginPassword;
  }

  let { data, error } = await supabase
    .from("profiles")
    .upsert(row)
    .select(PROFILE_SELECT)
    .single();

  if (error && isMissingColumnError(error)) {
    const needsExtendedColumns =
      Boolean(patch.businessAddress?.formatted) ||
      savedClients.length > 0 ||
      patch.loginPassword !== undefined ||
      isBusinessLikeType(accountType);

    if (needsExtendedColumns) {
      throw new Error(missingColumnHint(error));
    }

    const legacy: Record<string, unknown> = {
      id: userId,
      full_name: patch.fullName,
      phone: patch.phone,
      updated_at: new Date().toISOString(),
    };
    ({ data, error } = await supabase
      .from("profiles")
      .upsert(legacy)
      .select("id, full_name, phone")
      .single());
  }

  if (error) throw new Error(missingColumnHint(error));

  const profile = rowToProfile(data as ProfileRow, email);
  if (patch.businessAddress?.formatted && !profile.businessAddress) {
    profile.businessAddress = patch.businessAddress;
  }
  if (savedClients.length && !profile.savedClients?.length) {
    profile.savedClients = savedClients;
  }
  if (!profile.accountType && accountType) profile.accountType = accountType;
  if (!profile.businessName && businessName) profile.businessName = businessName;
  if (!profile.natureOfGoods && natureOfGoods) profile.natureOfGoods = natureOfGoods;
  return profile;
}

function stripMissingProfileColumns(
  row: Record<string, unknown>,
  error: { message?: string },
): Record<string, unknown> | null {
  const msg = (error.message ?? "").toLowerCase();
  const next = { ...row };
  let stripped = false;

  if (msg.includes("nature_of_goods")) {
    delete next.nature_of_goods;
    stripped = true;
  }
  if (msg.includes("business_address")) {
    delete next.business_address;
    stripped = true;
  }
  if (msg.includes("saved_clients")) {
    delete next.saved_clients;
    stripped = true;
  }
  if (msg.includes("account_type") || msg.includes("business_name")) {
    delete next.account_type;
    delete next.business_name;
    stripped = true;
  }

  return stripped ? next : null;
}

/** Save profile using the signed-in user's session (no service role required). */
export async function upsertProfileForSession(
  supabase: SupabaseClient,
  userId: string,
  email: string,
  patch: ProfilePatch,
): Promise<UserProfile> {
  if (!isSupabaseConfigured()) {
    return {
      id: userId,
      fullName: patch.fullName,
      phone: patch.phone,
      email,
      accountType: patch.accountType ?? "individual",
      ...(patch.businessName ? { businessName: patch.businessName } : {}),
      ...(patch.natureOfGoods ? { natureOfGoods: patch.natureOfGoods } : {}),
      ...(patch.businessAddress?.formatted ? { businessAddress: patch.businessAddress } : {}),
    };
  }

  const accountType = patch.accountType ?? "individual";
  const businessName = patch.businessName?.trim() ?? "";
  const natureOfGoods = patch.natureOfGoods?.trim() ?? "";
  const savedClients = patch.savedClients ?? [];

  const baseRow: Record<string, unknown> = {
    full_name: patch.fullName,
    phone: patch.phone,
    updated_at: new Date().toISOString(),
    account_type: accountType,
    business_name: isBusinessLikeType(accountType) ? businessName : "",
    nature_of_goods: isBusinessLikeType(accountType) ? natureOfGoods : "",
    business_address: patch.businessAddress?.formatted ? patch.businessAddress : null,
    saved_clients: savedClients,
  };

  if (patch.loginPassword !== undefined) {
    baseRow.login_password = patch.loginPassword;
  }

  let row = { ...baseRow };

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const { data: updated, error: updateError } = await supabase
      .from("profiles")
      .update(row)
      .eq("id", userId)
      .select(PROFILE_SELECT)
      .maybeSingle();

    if (!updateError && updated) {
      return mergeProfilePatch(rowToProfile(updated as ProfileRow, email), patch, {
        accountType,
        businessName,
        natureOfGoods,
      });
    }

    if (updateError && isMissingColumnError(updateError)) {
      const stripped = stripMissingProfileColumns(row, updateError);
      if (stripped) {
        row = stripped;
        continue;
      }
      throw new Error(missingColumnHint(updateError));
    }

    if (updateError) throw new Error(missingColumnHint(updateError));

    const insertRow = { id: userId, ...row };
    let { data: inserted, error: insertError } = await supabase
      .from("profiles")
      .insert(insertRow)
      .select(PROFILE_SELECT)
      .single();

    if (insertError && isMissingColumnError(insertError)) {
      const stripped = stripMissingProfileColumns(row, insertError);
      if (stripped) {
        row = stripped;
        continue;
      }

      const legacy = {
        id: userId,
        full_name: patch.fullName,
        phone: patch.phone,
        updated_at: new Date().toISOString(),
      };
      ({ data: inserted, error: insertError } = await supabase
        .from("profiles")
        .insert(legacy)
        .select("id, full_name, phone")
        .single());
    }

    if (insertError) throw new Error(missingColumnHint(insertError));

    return mergeProfilePatch(rowToProfile(inserted as ProfileRow, email), patch, {
      accountType,
      businessName,
      natureOfGoods,
    });
  }

  throw new Error("Could not save profile.");
}

function mergeProfilePatch(
  profile: UserProfile,
  patch: ProfilePatch,
  extras: {
    accountType: AccountType;
    businessName: string;
    natureOfGoods: string;
  },
): UserProfile {
  if (patch.businessAddress?.formatted && !profile.businessAddress) {
    profile.businessAddress = patch.businessAddress;
  }
  if (!profile.accountType && extras.accountType) profile.accountType = extras.accountType;
  if (!profile.businessName && extras.businessName) profile.businessName = extras.businessName;
  if (!profile.natureOfGoods && extras.natureOfGoods) {
    profile.natureOfGoods = extras.natureOfGoods;
  }
  return profile;
}
