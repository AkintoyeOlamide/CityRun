import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import {
  getAdminPassword,
  getAdminUsername,
} from "@/lib/auth/admin-credentials";
import { resolveSessionSecret } from "@/lib/auth/session-secrets";

const COOKIE_NAME = "city_run_admin";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function sessionSecret(): string {
  return resolveSessionSecret("CITY_RUN_ADMIN_SESSION_SECRET", "admin");
}

function expectedSessionToken(): string {
  return createHmac("sha256", sessionSecret())
    .update(`${getAdminUsername()}:${getAdminPassword()}`)
    .digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) return false;
    return timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

export function verifyAdminCredentials(
  username: string,
  password: string,
): boolean {
  return (
    safeEqual(username.trim().toLowerCase(), getAdminUsername().toLowerCase()) &&
    safeEqual(password, getAdminPassword())
  );
}

export async function isAdminSessionActive(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return false;
  return safeEqual(token, expectedSessionToken());
}

export function adminSessionCookieOptions() {
  return {
    name: COOKIE_NAME,
    value: expectedSessionToken(),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE,
  };
}

export function clearAdminSessionCookieOptions() {
  return {
    name: COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 0,
  };
}

export function getAdminActorLabel(): string {
  return `admin:${getAdminUsername()}`;
}
