export function formatDistance(meters: number): string {
  if (meters < 100) return "Very close";
  if (meters < 1000) return `${Math.round(meters)} m away`;
  return `${(meters / 1000).toFixed(1)} km away`;
}

/** Urban bike / okada average speed used for rough ETAs. */
const RIDER_SPEED_MPS = 22 / 3.6;

export function estimateEtaMinutes(meters: number): number {
  const adjustedMeters = meters * 1.25;
  return Math.max(1, Math.ceil(adjustedMeters / RIDER_SPEED_MPS / 60));
}

export function formatEta(minutes: number): string {
  if (minutes <= 1) return "~1 min";
  if (minutes < 60) return `~${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `~${hours}h ${mins}m` : `~${hours}h`;
}

export function formatEtaFromMeters(meters: number): string {
  return formatEta(estimateEtaMinutes(meters));
}

export function secondsSince(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
}

export function formatSecondsAgo(seconds: number): string {
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const mins = Math.floor(seconds / 60);
  return `${mins} min ago`;
}
