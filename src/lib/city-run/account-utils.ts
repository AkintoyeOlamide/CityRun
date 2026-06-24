import type { UserProfile } from "@/lib/city-run/types";
import {
  isBusinessUser,
  mergeProfileWithUserMetadata,
} from "@/lib/auth/profile-metadata";

export function isBusinessAccount(
  profile?: UserProfile | null,
  user?: { user_metadata?: Record<string, unknown> } | null,
): boolean {
  if (isBusinessUser(user ?? null)) return true;
  if (!profile) return false;
  if (profile.accountType === "business") return true;
  if (profile.accountType === "vendor") return false;
  return Boolean(
    profile.businessName?.trim() &&
      profile.businessAddress?.formatted &&
      profile.natureOfGoods?.trim(),
  );
}

export function isBusinessAccountProfile(profile: UserProfile): boolean {
  return isBusinessAccount(profile, null);
}

/** Prefer this on send page — uses auth metadata when DB profile is incomplete. */
export function shouldUseBusinessSendFlow(
  profile?: UserProfile | null,
  user?: { user_metadata?: Record<string, unknown> } | null,
): boolean {
  return isBusinessAccount(profile, user);
}

export function isVendorProfile(profile?: UserProfile | null): boolean {
  return profile?.accountType === "vendor";
}

export function isBusinessLikeProfile(
  profile?: UserProfile | null,
  user?: { user_metadata?: Record<string, unknown> } | null,
): boolean {
  if (isBusinessUser(user ?? null)) return true;
  if (!profile) return false;
  if (profile.accountType === "business" || profile.accountType === "vendor") {
    return true;
  }
  return Boolean(
    profile.businessName?.trim() &&
      profile.businessAddress?.formatted &&
      profile.natureOfGoods?.trim(),
  );
}
