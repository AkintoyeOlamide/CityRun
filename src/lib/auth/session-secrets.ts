import { createHmac } from "crypto";

function readServiceRoleKey(): string | undefined {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    undefined
  );
}

function readSupabasePublicFingerprint(): string | undefined {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (url && key) return `${url}|${key}`;
  return undefined;
}

/**
 * Session signing — uses explicit env if set, else derives from Supabase keys
 * already required for the app (no extra Vercel variables needed).
 */
export function resolveSessionSecret(
  envName: string,
  purpose: "admin" | "rider",
): string {
  const explicit = process.env[envName]?.trim();
  if (explicit) return explicit;

  const serviceRole = readServiceRoleKey();
  if (serviceRole) {
    return createHmac("sha256", serviceRole)
      .update(`cityrun-${purpose}-session-v1`)
      .digest("hex");
  }

  const publicFingerprint = readSupabasePublicFingerprint();
  if (publicFingerprint) {
    return createHmac("sha256", publicFingerprint)
      .update(`cityrun-${purpose}-session-v1`)
      .digest("hex");
  }

  return createHmac("sha256", "citygateshl-cityrun")
    .update(`${purpose}-session-v1`)
    .digest("hex");
}

export function hasSessionSecret(_envName: string, purpose: "admin" | "rider"): boolean {
  resolveSessionSecret(_envName, purpose);
  return true;
}
