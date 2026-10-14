import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { resolveSessionSecret } from "@/lib/auth/session-secrets";
import { getRiderById } from "@/lib/city-run/riders-store";
import type { RiderPublic } from "@/lib/city-run/types";
import { toPublicRider } from "@/lib/city-run/riders-store";

const COOKIE_NAME = "city_run_rider";
const SESSION_MAX_AGE = 60 * 60 * 24 * 14; // 14 days

function sessionSecret(): string {
  return resolveSessionSecret("CITY_RUN_RIDER_SESSION_SECRET", "rider");
}

function sessionTokenForRiderId(riderId: string): string {
  return createHmac("sha256", sessionSecret()).update(riderId).digest("hex");
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

export function riderSessionCookieOptions(riderId: string) {
  return {
    name: COOKIE_NAME,
    value: `${riderId}.${sessionTokenForRiderId(riderId)}`,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE,
  };
}

export function clearRiderSessionCookieOptions() {
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

function parseRiderIdFromCookie(value: string | undefined): string | null {
  if (!value) return null;
  const [riderId, token] = value.split(".");
  if (!riderId || !token) return null;
  if (!safeEqual(token, sessionTokenForRiderId(riderId))) return null;
  return riderId;
}

export async function getRiderSession(): Promise<RiderPublic | null> {
  const cookieStore = await cookies();
  const riderId = parseRiderIdFromCookie(cookieStore.get(COOKIE_NAME)?.value);
  if (!riderId) return null;

  const rider = await getRiderById(riderId);
  if (!rider || !rider.active) return null;
  return toPublicRider(rider);
}

export class RiderAuthError extends Error {
  constructor(message = "Rider sign-in required") {
    super(message);
    this.name = "RiderAuthError";
  }
}

export async function requireRider() {
  const session = await getRiderSession();
  if (!session) throw new RiderAuthError();
  return session;
}

export function getRiderActorLabel(username: string) {
  return `rider:${username}`;
}
