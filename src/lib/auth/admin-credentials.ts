/** Server-only admin login (never import from client components). */

function readRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is not configured. Set it in .env.local or Vercel.`);
  }
  return value;
}

export function getAdminUsername(): string {
  return readRequiredEnv("CITY_RUN_ADMIN_USERNAME");
}

export function getAdminPassword(): string {
  return readRequiredEnv("CITY_RUN_ADMIN_PASSWORD");
}
