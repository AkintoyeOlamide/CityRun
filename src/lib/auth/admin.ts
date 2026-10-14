import { getAdminUsername } from "@/lib/auth/admin-credentials";
import { isAdminSessionActive } from "@/lib/auth/admin-session";

export class AdminAuthError extends Error {
  constructor(message = "Admin access required") {
    super(message);
    this.name = "AdminAuthError";
  }
}

export async function requireAdmin() {
  const ok = await isAdminSessionActive();
  if (!ok) {
    throw new AdminAuthError();
  }
  return { username: getAdminUsername() };
}
