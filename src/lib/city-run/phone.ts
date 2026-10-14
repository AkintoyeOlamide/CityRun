/** Normalize a phone string for tel: links (keeps leading +). */
export function toTelHref(phone: string): string {
  const trimmed = phone.trim();
  if (!trimmed) return "";
  const digits = trimmed.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return `tel:${digits}`;
  if (digits.startsWith("0")) return `tel:+234${digits.slice(1)}`;
  if (digits.length === 10 || digits.length === 11) {
    const local = digits.length === 11 && digits.startsWith("0") ? digits.slice(1) : digits;
    return `tel:+234${local}`;
  }
  return `tel:${digits}`;
}

/** Human-readable phone for display after the customer taps Call. */
export function formatPhoneDisplay(phone: string): string {
  const trimmed = phone.trim();
  if (!trimmed) return "";
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("0")) {
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  }
  if (digits.length === 13 && digits.startsWith("234")) {
    return `+${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}`;
  }
  if (digits.length === 10) {
    return `0${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }
  return trimmed;
}
