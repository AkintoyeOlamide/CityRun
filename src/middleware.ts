import { type NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

/** Only refresh Supabase sessions on page navigations — skip API routes (each handler reads cookies itself). */
export const config = {
  matcher: ["/cityrun/:path*", "/auth/:path*"],
};
