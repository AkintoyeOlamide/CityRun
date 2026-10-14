/** Server-only admin login (never import from client components). */

const DEFAULT_ADMIN_USERNAME = "cityrunadmin";
const DEFAULT_ADMIN_PASSWORD = "citygateshl2026";

function readEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

export function getAdminUsername(): string {
  return readEnv("CITY_RUN_ADMIN_USERNAME") ?? DEFAULT_ADMIN_USERNAME;
}

export function getAdminPassword(): string {
  return readEnv("CITY_RUN_ADMIN_PASSWORD") ?? DEFAULT_ADMIN_PASSWORD;
}

export function isAdminConfigured(): boolean {
  return true;
}
