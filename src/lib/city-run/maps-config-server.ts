/** Server-side Google Maps key — any of the standard env names. */
export function readGoogleMapsApiKey(): string {
  return (
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ||
    process.env.GOOGLE_MAPS_API_KEY?.trim() ||
    process.env.GOOGLE_MAPS_SERVER_API_KEY?.trim() ||
    ""
  );
}

export function isGoogleMapsKeyConfigured(): boolean {
  return readGoogleMapsApiKey().length > 0;
}
