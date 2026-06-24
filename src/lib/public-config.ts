/**
 * Public client config — values come from environment variables only.
 * Copy .env.example to .env.local (dev) or set vars in Vercel (production).
 */

function readEnv(...names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return undefined;
}

function isValidSupabaseUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" && parsed.hostname.endsWith(".supabase.co")
    );
  } catch {
    return false;
  }
}

function isValidSupabaseKey(key: string): boolean {
  if (key.startsWith("sb_publishable_") || key.startsWith("sb_secret_")) {
    return key.length > 20;
  }
  if (key.startsWith("eyJ")) {
    return key.length > 100;
  }
  return false;
}

function pickSupabaseUrl(): string {
  const fromEnv = readEnv("NEXT_PUBLIC_SUPABASE_URL");
  if (fromEnv && isValidSupabaseUrl(fromEnv)) return fromEnv;
  return "";
}

function pickSupabaseKey(): string {
  const fromEnv = readEnv(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  );
  if (fromEnv && isValidSupabaseKey(fromEnv)) return fromEnv;
  return "";
}

export const googleMapsApiKey =
  readEnv("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY") ?? "";

export const supabaseUrl = pickSupabaseUrl();
export const supabasePublishableKey = pickSupabaseKey();

export const firebaseConfig = {
  apiKey: readEnv("NEXT_PUBLIC_FIREBASE_API_KEY") ?? "",
  authDomain: readEnv("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN") ?? "",
  projectId: readEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID") ?? "",
  storageBucket: readEnv("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET") ?? "",
  messagingSenderId: readEnv("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID") ?? "",
  appId: readEnv("NEXT_PUBLIC_FIREBASE_APP_ID") ?? "",
  measurementId: readEnv("NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID") ?? "",
};

export function isSupabaseConfigured() {
  return (
    isValidSupabaseUrl(supabaseUrl) && isValidSupabaseKey(supabasePublishableKey)
  );
}

export function isFirebaseConfigured() {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.authDomain &&
      firebaseConfig.projectId &&
      firebaseConfig.storageBucket,
  );
}

export function isGoogleMapsConfigured() {
  return googleMapsApiKey.length > 0;
}
