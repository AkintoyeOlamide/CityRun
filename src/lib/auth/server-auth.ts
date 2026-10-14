import type { User } from "@supabase/supabase-js";
import { getProfile, upsertProfileForSession } from "@/lib/auth/profile-store";
import {
  mergeProfileWithUserMetadata,
  profilePatchFromUserMetadata,
} from "@/lib/auth/profile-metadata";
import type { UserProfile } from "@/lib/city-run/types";
import { createClient } from "@/utils/supabase/server";

export type InitialAuthState = {
  user: User | null;
  profile: UserProfile | null;
};

export function profileUsableFromMetadata(user: User): boolean {
  const merged = mergeProfileWithUserMetadata(null, user);
  if (!merged) return false;
  if (merged.accountType === "business" || merged.accountType === "vendor") {
    return Boolean(merged.businessAddress?.formatted);
  }
  return Boolean(merged.fullName.trim() && merged.phone.trim());
}

/** Session + profile for City Run layout — avoids client auth waterfall on first paint. */
export async function getInitialAuthState(): Promise<InitialAuthState> {
  try {
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user ?? null;
    if (!user) {
      return { user: null, profile: null };
    }

    if (profileUsableFromMetadata(user)) {
      return { user, profile: mergeProfileWithUserMetadata(null, user) };
    }

    try {
      const dbProfile = await getProfile(user.id, user.email ?? "", supabase);
      return { user, profile: mergeProfileWithUserMetadata(dbProfile, user) };
    } catch {
      return { user, profile: mergeProfileWithUserMetadata(null, user) };
    }
  } catch {
    return { user: null, profile: null };
  }
}

/** Sync business fields from signup metadata into profiles (best-effort). */
export async function repairProfileFromUserMetadata(user: User): Promise<UserProfile | null> {
  const patch = profilePatchFromUserMetadata(user);
  if (!patch) return null;

  const supabase = await createClient();
  try {
    return await upsertProfileForSession(supabase, user.id, user.email ?? "", patch);
  } catch {
    return mergeProfileWithUserMetadata(
      await getProfile(user.id, user.email ?? "", supabase),
      user,
    );
  }
}
