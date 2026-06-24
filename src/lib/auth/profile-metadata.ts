import type { User } from "@supabase/supabase-js";
import type { AccountType, AddressValue, UserProfile } from "@/lib/city-run/types";

type UserMetadata = {
  account_type?: unknown;
  business_name?: unknown;
  nature_of_goods?: unknown;
  business_address?: AddressValue | null;
  full_name?: unknown;
  phone?: unknown;
};

function parseMetaAccountType(raw: unknown): AccountType {
  if (raw === "business") return "business";
  if (raw === "vendor") return "vendor";
  return "individual";
}

function metaString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function metaAddress(raw: unknown): AddressValue | undefined {
  if (typeof raw === "string") {
    const formatted = raw.trim();
    if (formatted.length > 5) return { formatted };
    return undefined;
  }
  if (!raw || typeof raw !== "object") return undefined;
  const formatted = metaString((raw as AddressValue).formatted);
  if (formatted.length <= 5) return undefined;
  return raw as AddressValue;
}

export function profilePatchFromUserMetadata(user: User) {
  const meta = (user.user_metadata ?? {}) as UserMetadata;
  const accountType = parseMetaAccountType(meta.account_type);
  if (accountType !== "business" && accountType !== "vendor") {
    return null;
  }

  return {
    fullName: metaString(meta.full_name) || metaString(user.email?.split("@")[0]),
    phone: metaString(meta.phone),
    accountType,
    businessName: metaString(meta.business_name),
    natureOfGoods: metaString(meta.nature_of_goods),
    businessAddress: metaAddress(meta.business_address),
  };
}

/** Fill gaps in DB profile from auth signup metadata (when migrations were not run). */
export function mergeProfileWithUserMetadata(
  profile: UserProfile | null,
  user: User | null | undefined,
): UserProfile | null {
  if (!user) return profile;

  const meta = (user.user_metadata ?? {}) as UserMetadata;
  const metaAccountType = parseMetaAccountType(meta.account_type);

  const base: UserProfile =
    profile ?? {
      id: user.id,
      fullName: "",
      phone: "",
      email: user.email ?? "",
      accountType: "individual",
    };

  const accountType: AccountType =
    base.accountType !== "individual"
      ? base.accountType
      : metaAccountType !== "individual"
        ? metaAccountType
        : base.accountType;

  const businessName = base.businessName?.trim() || metaString(meta.business_name) || undefined;
  const natureOfGoods =
    base.natureOfGoods?.trim() || metaString(meta.nature_of_goods) || undefined;
  const businessAddress = base.businessAddress?.formatted
    ? base.businessAddress
    : metaAddress(meta.business_address);

  const fullName = base.fullName.trim() || metaString(meta.full_name);
  const phone = base.phone.trim() || metaString(meta.phone);

  return {
    ...base,
    fullName,
    phone,
    email: base.email || user.email || "",
    accountType,
    ...(businessName ? { businessName } : {}),
    ...(natureOfGoods ? { natureOfGoods } : {}),
    ...(businessAddress ? { businessAddress } : {}),
  };
}

export function resolveBusinessPickup(
  profile: UserProfile | null | undefined,
  user: User | null | undefined,
): AddressValue | undefined {
  if (profile?.businessAddress?.formatted) {
    return profile.businessAddress;
  }
  if (!user) return undefined;
  return metaAddress((user.user_metadata as UserMetadata)?.business_address);
}

export function resolveNatureOfGoods(
  profile: UserProfile | null | undefined,
  user: User | null | undefined,
): string {
  const fromProfile = profile?.natureOfGoods?.trim() ?? "";
  if (fromProfile) return fromProfile;
  if (!user) return "";
  return metaString((user.user_metadata as UserMetadata)?.nature_of_goods);
}

export function isBusinessUser(
  user: User | { user_metadata?: Record<string, unknown> } | null | undefined,
): boolean {
  if (!user) return false;
  return parseMetaAccountType(user.user_metadata?.account_type) === "business";
}
