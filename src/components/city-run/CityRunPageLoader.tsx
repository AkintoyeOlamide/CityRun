/** Minimal in-app loader — never reuse the marketing splash / bike scene here. */
export function CityRunPageLoader({ label }: { label?: string }) {
  return (
    <div className="cr-mesh-page flex min-h-dvh flex-col items-center justify-center px-6 text-white">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-white/15 border-t-accent"
        aria-hidden
      />
      {label ? (
        <p className="mt-3 text-sm text-white/45">{label}</p>
      ) : (
        <span className="sr-only">Loading</span>
      )}
    </div>
  );
}
