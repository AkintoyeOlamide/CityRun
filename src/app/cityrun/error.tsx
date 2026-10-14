"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function CityRunError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[city-run]", error);
  }, [error]);

  const hint =
    error.message?.includes("supabaseUrl") ||
    error.message?.includes("Supabase")
      ? "Check Supabase URL and API key in Vercel (or remove invalid placeholders so built-in defaults apply), then redeploy."
      : "Try reloading. If this persists after a deploy, check the browser console (F12) for details.";

  return (
    <div className="city-run-theme flex min-h-dvh flex-col items-center justify-center bg-cr-page px-6 text-center text-white">
      <p className="text-lg font-semibold">Something went wrong</p>
      <p className="mt-2 max-w-sm text-sm text-white/50">{hint}</p>
      {process.env.NODE_ENV === "development" && error.message && (
        <p className="mt-3 max-w-sm break-words rounded-lg bg-black/30 px-3 py-2 font-mono text-xs text-red-200">
          {error.message}
        </p>
      )}
      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white"
        >
          Reload
        </button>
        <Link
          href="/cityrun"
          className="rounded-xl border border-white/15 px-5 py-2.5 text-sm font-medium"
        >
          Back to cityrun
        </Link>
      </div>
    </div>
  );
}
