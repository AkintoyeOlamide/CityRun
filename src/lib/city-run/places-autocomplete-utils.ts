/** Greater Lagos metro — keeps suggestions local without being too tight. */
export const lagosMetroRestriction = {
  west: 2.7,
  south: 6.32,
  east: 4.05,
  north: 6.82,
};

export const lagosMetroCenter = {
  lat: 6.5244,
  lng: 3.3792,
};

export const lagosLocationBiasMeters = 50_000;

/** Drop vague OpenStreetMap hits that are not useful for delivery. */
export function filterNominatimPredictions<T extends { description: string }>(
  input: string,
  predictions: T[],
): T[] {
  const needle = input.trim().toLowerCase();
  if (!needle) return [];

  const tokens = needle
    .split(/[\s,]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);

  return predictions.filter((prediction) => {
    const haystack = prediction.description.toLowerCase();

    const hasStreetDetail =
      /\d/.test(haystack) ||
      /\b(road|street|avenue|ave|lane|close|way|drive|boulevard|blvd|estate|phase|court|crescent|str\.|st\.|rd\.)\b/i.test(
        haystack,
      );

    const isBroadLagosOnly =
      /^lagos,\s*lagos island,\s*lagos/i.test(prediction.description) &&
      !hasStreetDetail;

    if (isBroadLagosOnly) return false;
    if (tokens.length === 0) return true;
    return tokens.some((token) => haystack.includes(token));
  });
}
