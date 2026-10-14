/** Browser Maps JS key — must use HTTP referrer restrictions in Google Cloud. */
export function readBrowserMapsApiKey(): string {
  return (
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ||
    process.env.GOOGLE_MAPS_API_KEY?.trim() ||
    ""
  );
}

/**
 * Server Places/Geocoding key. Prefer GOOGLE_MAPS_SERVER_API_KEY with no HTTP
 * referrer restrictions. Fall back to the browser key so address search still
 * hits Google when only one key is configured.
 */
export function readServerMapsApiKey(): string {
  return (
    process.env.GOOGLE_MAPS_SERVER_API_KEY?.trim() ||
    process.env.GOOGLE_MAPS_API_KEY?.trim() ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ||
    ""
  );
}

/** @deprecated Use readBrowserMapsApiKey for client / readServerMapsApiKey for server. */
export function readGoogleMapsApiKey(): string {
  return readBrowserMapsApiKey();
}

export function isBrowserMapsKeyConfigured(): boolean {
  return readBrowserMapsApiKey().length > 0;
}

export function isServerMapsKeyConfigured(): boolean {
  return Boolean(process.env.GOOGLE_MAPS_SERVER_API_KEY?.trim());
}

export function isGoogleMapsKeyConfigured(): boolean {
  return isBrowserMapsKeyConfigured();
}
