/** Greater Lagos metro — keeps suggestions local without being too tight. */
export const lagosMetroRestriction = {
  west: 3.0,
  south: 6.35,
  east: 3.75,
  north: 6.75,
};

export const lagosMetroCenter = {
  lat: 6.5244,
  lng: 3.3792,
};

/** Drop vague OpenStreetMap hits that are not useful for delivery. */
export function filterNominatimPredictions<T extends { description: string }>(
  input: string,
  predictions: T[],
): T[] {
  const needle = input.trim().toLowerCase();
  if (!needle) return [];

  return predictions.filter((prediction) => {
    const haystack = prediction.description.toLowerCase();

    if (needle.length <= 8 && !haystack.includes(needle)) {
      return false;
    }

    const hasStreetDetail = /\d/.test(haystack) || /\b(road|street|avenue|ave|lane|close|way|drive|boulevard|blvd|estate|phase|court|crescent|str\.|st\.|rd\.)\b/i.test(
      haystack,
    );

    const isBroadLagosOnly =
      /^lagos,\s*lagos island,\s*lagos/i.test(prediction.description) &&
      !hasStreetDetail;

    return !isBroadLagosOnly;
  });
}
