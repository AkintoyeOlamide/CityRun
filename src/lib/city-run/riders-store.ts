import fs from "fs";
import path from "path";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { Rider, RiderAdmin, RiderPublic, RiderFleetEntry } from "@/lib/city-run/types";

const RIDERS_PATH = path.join(process.cwd(), ".city-run-riders.json");

type RiderRecord = Rider & {
  passwordHash: string;
  loginPassword: string | null;
  lastLocation?: { lat: number; lng: number };
  locationUpdatedAt?: string;
};

type RiderRow = {
  id: string;
  username: string;
  password_hash: string;
  full_name: string;
  phone: string;
  login_password: string | null;
  active: boolean;
  last_location: { lat: number; lng: number } | null;
  location_updated_at: string | null;
  created_at: string;
  updated_at: string;
};

function canUseFileStore() {
  if (process.env.VERCEL === "1" || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return false;
  }
  return process.env.NODE_ENV === "development";
}

function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

function validateUsername(username: string) {
  const normalized = normalizeUsername(username);
  if (!/^[a-z0-9_]{3,32}$/.test(normalized)) {
    throw new Error(
      "Username must be 3–32 characters (lowercase letters, numbers, underscore).",
    );
  }
  return normalized;
}

function rowToRider(row: RiderRow): RiderRecord {
  return {
    id: row.id,
    username: row.username,
    fullName: row.full_name,
    phone: row.phone,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    passwordHash: row.password_hash,
    loginPassword: row.login_password ?? null,
    lastLocation: row.last_location ?? undefined,
    locationUpdatedAt: row.location_updated_at ?? undefined,
  };
}

export function toAdminRider(rider: RiderRecord): RiderAdmin {
  return {
    ...toPublicRider(rider),
    loginPassword: rider.loginPassword,
    updatedAt: rider.updatedAt,
  };
}

export function toPublicRider(rider: RiderRecord): RiderPublic {
  return {
    id: rider.id,
    username: rider.username,
    fullName: rider.fullName,
    phone: rider.phone,
    active: rider.active,
    createdAt: rider.createdAt,
  };
}

function readFileStore(): Map<string, RiderRecord> {
  try {
    const raw = fs.readFileSync(RIDERS_PATH, "utf8");
    const list = JSON.parse(raw) as RiderRecord[];
    return new Map(list.map((r) => [r.id, r]));
  } catch {
    return new Map();
  }
}

function writeFileStore(riders: Map<string, RiderRecord>) {
  if (!canUseFileStore()) {
    throw new Error("Rider store unavailable on this server. Configure Supabase.");
  }
  fs.writeFileSync(RIDERS_PATH, JSON.stringify([...riders.values()], null, 2));
}

function isMissingColumnError(error: { code?: string; message?: string }) {
  const msg = (error.message ?? "").toLowerCase();
  return (
    error.code === "42703" ||
    msg.includes("does not exist") ||
    msg.includes("login_password") ||
    msg.includes("last_location") ||
    msg.includes("location_updated_at") ||
    msg.includes("schema cache")
  );
}

const RIDER_SELECT_FULL =
  "id, username, full_name, phone, login_password, active, last_location, location_updated_at, created_at, updated_at";
const RIDER_SELECT_BASIC =
  "id, username, full_name, phone, active, created_at, updated_at";

async function fetchAllRiderRows(): Promise<RiderRow[]> {
  const supabase = createAdminClient();
  const full = await supabase
    .from("riders")
    .select(RIDER_SELECT_FULL)
    .order("created_at", { ascending: false });

  if (!full.error) {
    return (full.data as RiderRow[]).map((row) => ({
      ...row,
      password_hash: "",
      login_password: row.login_password ?? null,
      last_location: row.last_location ?? null,
      location_updated_at: row.location_updated_at ?? null,
    }));
  }

  if (full.error.code === "PGRST205") {
    throw full.error;
  }

  if (!isMissingColumnError(full.error)) {
    throw new Error(full.error.message);
  }

  const basic = await supabase
    .from("riders")
    .select(RIDER_SELECT_BASIC)
    .order("created_at", { ascending: false });

  if (basic.error) {
    throw new Error(basic.error.message);
  }

  return (basic.data as Omit<RiderRow, "login_password" | "password_hash" | "last_location" | "location_updated_at">[]).map(
    (row) => ({
      ...row,
      password_hash: "",
      login_password: null,
      last_location: null,
      location_updated_at: null,
    }),
  );
}

async function fetchRiderRowById(id: string): Promise<RiderRow | null> {
  const rows = await fetchAllRiderRows();
  const row = rows.find((r) => r.id === id);
  if (!row) return null;

  const supabase = createAdminClient();
  const hashRow = await supabase
    .from("riders")
    .select("password_hash")
    .eq("id", id)
    .maybeSingle();

  if (hashRow.data && typeof (hashRow.data as { password_hash?: string }).password_hash === "string") {
    row.password_hash = (hashRow.data as { password_hash: string }).password_hash;
  }

  return row;
}

export async function listRiders(): Promise<RiderPublic[]> {
  const admins = await listRidersAdmin();
  return admins.map(({ loginPassword: _pw, updatedAt: _ua, ...rest }) => rest);
}

/** Full rider records for admin (includes stored login password when column exists). */
export async function listRidersAdmin(): Promise<RiderAdmin[]> {
  if (!isSupabaseConfigured()) {
    if (!canUseFileStore()) return [];
    return [...readFileStore().values()].map(toAdminRider);
  }

  try {
    const rows = await fetchAllRiderRows();
    return rows.map((row) => toAdminRider(rowToRider(row)));
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "PGRST205"
    ) {
      return canUseFileStore() ? [...readFileStore().values()].map(toAdminRider) : [];
    }
    throw error;
  }
}

export async function createRider(input: {
  username: string;
  password: string;
  fullName: string;
  phone?: string;
}): Promise<RiderAdmin> {
  const username = validateUsername(input.username);
  if (input.password.length < 6) {
    throw new Error("Password must be at least 6 characters.");
  }
  if (!input.fullName.trim()) {
    throw new Error("Full name is required.");
  }

  const passwordHash = hashPassword(input.password);
  const now = new Date().toISOString();

  if (!isSupabaseConfigured()) {
    if (!canUseFileStore()) {
      throw new Error("Rider onboarding requires Supabase. Run supabase/migrations/add_riders.sql.");
    }
    const riders = readFileStore();
    if ([...riders.values()].some((r) => r.username === username)) {
      throw new Error("Username already exists.");
    }
    const rider: RiderRecord = {
      id: crypto.randomUUID(),
      username,
      fullName: input.fullName.trim(),
      phone: input.phone?.trim() ?? "",
      active: true,
      createdAt: now,
      updatedAt: now,
      passwordHash,
      loginPassword: input.password,
    };
    riders.set(rider.id, rider);
    writeFileStore(riders);
    return toAdminRider(rider);
  }

  const supabase = createAdminClient();
  const baseInsert = {
    username,
    password_hash: passwordHash,
    full_name: input.fullName.trim(),
    phone: input.phone?.trim() ?? "",
  };

  let result = await supabase
    .from("riders")
    .insert({ ...baseInsert, login_password: input.password })
    .select(RIDER_SELECT_FULL)
    .single();

  if (result.error && isMissingColumnError(result.error)) {
    result = await supabase
      .from("riders")
      .insert(baseInsert)
      .select(RIDER_SELECT_BASIC)
      .single();
  }

  const { data, error } = result;

  if (error) {
    if (error.code === "23505") throw new Error("Username already exists.");
    if (error.code === "PGRST205") {
      throw new Error(
        "Riders table missing. Run supabase/migrations/add_riders.sql in Supabase SQL Editor.",
      );
    }
    if (error.code === "42501" || error.message?.includes("row-level security")) {
      throw new Error(
        "Riders table needs permissions. Run supabase/migrations/fix_riders_rls.sql in Supabase SQL Editor.",
      );
    }
    throw new Error(error.message);
  }

  const row = data as RiderRow;
  return toAdminRider(
    rowToRider({
      ...row,
      password_hash: passwordHash,
      login_password: row.login_password ?? input.password,
    }),
  );
}

export async function getRiderAdmin(id: string): Promise<RiderAdmin | undefined> {
  const rider = await getRiderById(id);
  if (!rider) return undefined;
  return toAdminRider(rider);
}

export async function updateRiderPassword(
  id: string,
  password: string,
): Promise<RiderAdmin | undefined> {
  if (password.length < 6) {
    throw new Error("Password must be at least 6 characters.");
  }

  const passwordHash = hashPassword(password);
  const now = new Date().toISOString();

  if (!isSupabaseConfigured()) {
    if (!canUseFileStore()) return undefined;
    const riders = readFileStore();
    const rider = riders.get(id);
    if (!rider) return undefined;
    rider.passwordHash = passwordHash;
    rider.loginPassword = password;
    rider.updatedAt = now;
    riders.set(id, rider);
    writeFileStore(riders);
    return toAdminRider(rider);
  }

  const existing = await getRiderById(id);
  if (!existing) return undefined;

  const supabase = createAdminClient();
  const patchWithLogin = {
    password_hash: passwordHash,
    login_password: password,
    updated_at: now,
  };
  const patchBasic = { password_hash: passwordHash, updated_at: now };

  let result = await supabase
    .from("riders")
    .update(patchWithLogin)
    .eq("id", id)
    .select(RIDER_SELECT_FULL)
    .maybeSingle();

  if (result.error && isMissingColumnError(result.error)) {
    result = await supabase
      .from("riders")
      .update(patchBasic)
      .eq("id", id)
      .select(RIDER_SELECT_BASIC)
      .maybeSingle();
  }

  const { data, error } = result;
  if (error) throw new Error(error.message);
  if (!data) return undefined;
  return toAdminRider(
    rowToRider({
      ...(data as RiderRow),
      password_hash: passwordHash,
      login_password: (data as RiderRow).login_password ?? password,
    }),
  );
}

export async function updateRiderProfile(
  id: string,
  patch: { fullName?: string; phone?: string; active?: boolean },
): Promise<RiderAdmin | undefined> {
  const now = new Date().toISOString();

  if (!isSupabaseConfigured()) {
    if (!canUseFileStore()) return undefined;
    const riders = readFileStore();
    const rider = riders.get(id);
    if (!rider) return undefined;
    if (patch.fullName !== undefined) rider.fullName = patch.fullName.trim();
    if (patch.phone !== undefined) rider.phone = patch.phone.trim();
    if (patch.active !== undefined) rider.active = patch.active;
    rider.updatedAt = now;
    riders.set(id, rider);
    writeFileStore(riders);
    return toAdminRider(rider);
  }

  const update: Record<string, unknown> = { updated_at: now };
  if (patch.fullName !== undefined) update.full_name = patch.fullName.trim();
  if (patch.phone !== undefined) update.phone = patch.phone.trim();
  if (patch.active !== undefined) update.active = patch.active;

  const supabase = createAdminClient();
  let result = await supabase
    .from("riders")
    .update(update)
    .eq("id", id)
    .select(RIDER_SELECT_FULL)
    .maybeSingle();

  if (result.error && isMissingColumnError(result.error)) {
    result = await supabase
      .from("riders")
      .update(update)
      .eq("id", id)
      .select(RIDER_SELECT_BASIC)
      .maybeSingle();
  }

  const { data, error } = result;
  if (error || !data) return undefined;
  return toAdminRider(
    rowToRider({
      ...(data as RiderRow),
      password_hash: "",
      login_password: (data as RiderRow).login_password ?? null,
    }),
  );
}

export async function getRiderByUsername(
  username: string,
): Promise<RiderRecord | undefined> {
  const normalized = normalizeUsername(username);

  if (!isSupabaseConfigured()) {
    if (!canUseFileStore()) return undefined;
    return [...readFileStore().values()].find((r) => r.username === normalized);
  }

  const rows = await fetchAllRiderRows();
  const row = rows.find((r) => r.username === normalized);
  if (!row) return undefined;

  const supabase = createAdminClient();
  const hashRow = await supabase
    .from("riders")
    .select("password_hash")
    .eq("username", normalized)
    .maybeSingle();

  if (
    hashRow.data &&
    typeof (hashRow.data as { password_hash?: string }).password_hash === "string"
  ) {
    row.password_hash = (hashRow.data as { password_hash: string }).password_hash;
  }

  return rowToRider(row);
}

export async function getRiderById(id: string): Promise<RiderRecord | undefined> {
  if (!isSupabaseConfigured()) {
    if (!canUseFileStore()) return undefined;
    return readFileStore().get(id);
  }

  const row = await fetchRiderRowById(id);
  if (!row) return undefined;
  return rowToRider(row);
}

export async function verifyRiderLogin(
  username: string,
  password: string,
): Promise<RiderRecord | null> {
  const rider = await getRiderByUsername(username);
  if (!rider || !rider.active) return null;
  if (!verifyPassword(password, rider.passwordHash)) return null;
  return rider;
}

export async function setRiderActive(
  id: string,
  active: boolean,
): Promise<RiderAdmin | undefined> {
  return updateRiderProfile(id, { active });
}

/** How long admin fleet map keeps showing a rider after the last GPS ping. */
export const RIDER_LOCATION_MAX_AGE_MS = 15 * 60 * 1000;

export async function updateRiderLiveLocation(
  riderId: string,
  location: { lat: number; lng: number },
): Promise<void> {
  const now = new Date().toISOString();

  if (!isSupabaseConfigured()) {
    if (!canUseFileStore()) {
      throw new Error("Rider store unavailable on this server. Configure Supabase.");
    }
    const riders = readFileStore();
    const rider = riders.get(riderId);
    if (!rider) return;
    rider.lastLocation = location;
    rider.locationUpdatedAt = now;
    rider.updatedAt = now;
    riders.set(riderId, rider);
    writeFileStore(riders);
    return;
  }

  const supabase = createAdminClient();
  const patch = {
    last_location: location,
    location_updated_at: now,
    updated_at: now,
  };

  let result = await supabase.from("riders").update(patch).eq("id", riderId);

  if (result.error && isMissingColumnError(result.error)) {
    throw new Error(
      "Riders table needs last_location columns. Run supabase/migrations/add_rider_last_location.sql in Supabase SQL Editor.",
    );
  }

  if (result.error) {
    throw new Error(result.error.message);
  }
}

export async function clearRiderLiveLocation(riderId: string): Promise<void> {
  const now = new Date().toISOString();

  if (!isSupabaseConfigured()) {
    if (!canUseFileStore()) return;
    const riders = readFileStore();
    const rider = riders.get(riderId);
    if (!rider) return;
    rider.lastLocation = undefined;
    rider.locationUpdatedAt = undefined;
    rider.updatedAt = now;
    riders.set(riderId, rider);
    writeFileStore(riders);
    return;
  }

  const supabase = createAdminClient();
  const patch = {
    last_location: null,
    location_updated_at: null,
    updated_at: now,
  };

  const result = await supabase.from("riders").update(patch).eq("id", riderId);
  if (result.error && !isMissingColumnError(result.error)) {
    throw new Error(result.error.message);
  }
}

export async function listRidersWithRecentLocation(
  maxAgeMs = RIDER_LOCATION_MAX_AGE_MS,
): Promise<RiderFleetEntry[]> {
  const cutoff = new Date(Date.now() - maxAgeMs).toISOString();

  if (!isSupabaseConfigured()) {
    if (!canUseFileStore()) return [];
    return [...readFileStore().values()]
      .filter(
        (rider) =>
          rider.active &&
          rider.lastLocation &&
          rider.locationUpdatedAt &&
          rider.locationUpdatedAt >= cutoff,
      )
      .map((rider) => ({
        riderId: rider.id,
        riderName: rider.fullName,
        riderPhone: rider.phone || null,
        location: rider.lastLocation,
        updatedAt: rider.locationUpdatedAt!,
        hasGps: true,
        onDelivery: false,
      }))
      .sort((a, b) => a.riderName.localeCompare(b.riderName));
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("riders")
      .select("id, full_name, phone, last_location, location_updated_at, active")
      .eq("active", true)
      .not("last_location", "is", null)
      .gte("location_updated_at", cutoff)
      .order("location_updated_at", { ascending: false });

    if (error) {
      if (isMissingColumnError(error)) return [];
      throw new Error(error.message);
    }

    return (data ?? []).map((row) => ({
      riderId: row.id as string,
      riderName: row.full_name as string,
      riderPhone: (row.phone as string) || null,
      location: row.last_location as { lat: number; lng: number },
      updatedAt: row.location_updated_at as string,
      hasGps: true,
      onDelivery: false,
    }));
  } catch {
    return [];
  }
}

export async function deleteRiders(ids: string[]): Promise<{ deleted: string[] }> {
  const unique = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
  if (unique.length === 0) return { deleted: [] };

  if (!isSupabaseConfigured()) {
    if (!canUseFileStore()) {
      throw new Error("Rider store unavailable on this server. Configure Supabase.");
    }
    const riders = readFileStore();
    const deleted: string[] = [];
    for (const id of unique) {
      if (riders.delete(id)) deleted.push(id);
    }
    writeFileStore(riders);
    return { deleted };
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("riders")
    .delete()
    .in("id", unique)
    .select("id");

  if (error) {
    if (error.code === "42501" || error.message?.includes("row-level security")) {
      throw new Error(
        "Riders table needs permissions. Run supabase/migrations/fix_riders_rls.sql in Supabase SQL Editor.",
      );
    }
    throw new Error(error.message);
  }

  return { deleted: (data ?? []).map((row) => (row as { id: string }).id) };
}
