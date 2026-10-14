export function buildOpenStreetMapEmbedUrl(
  points: Array<{ lat: number; lng: number }>,
  options?: { focus?: { lat: number; lng: number }; pad?: number },
) {
  if (points.length === 0) {
    return "https://www.openstreetmap.org/export/embed.html?bbox=3.35%2C6.50%2C3.41%2C6.55&layer=mapnik";
  }

  const pad = options?.pad ?? 0.004;
  const focus = options?.focus ?? points[points.length - 1];

  const lats = points.map((point) => point.lat);
  const lngs = points.map((point) => point.lng);
  const minLat = Math.min(...lats, focus.lat) - pad;
  const maxLat = Math.max(...lats, focus.lat) + pad;
  const minLng = Math.min(...lngs, focus.lng) - pad;
  const maxLng = Math.max(...lngs, focus.lng) + pad;

  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(`${minLng},${minLat},${maxLng},${maxLat}`)}&layer=mapnik&marker=${focus.lat}%2C${focus.lng}`;
}
