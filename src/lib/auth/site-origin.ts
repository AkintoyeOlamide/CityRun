export function resolveSiteOrigin(request: Request): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }

  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost.split(",")[0].trim()}`;
  }

  const { origin } = new URL(request.url);
  return origin;
}
