"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PasswordInput } from "@/components/city-run/PasswordInput";
import { tryCreateClient } from "@/utils/supabase/client";

const AUTH_INPUT =
  "w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none transition-colors focus:border-accent/60 focus:bg-white/[0.05]";

export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const supabase = tryCreateClient();
    if (!supabase) {
      setLoading(false);
      setError("Sign-in service is not available right now.");
      return;
    }

    void supabase.auth.getSession().then(({ data: { session } }) => {
      setReady(Boolean(session));
      setLoading(false);
      if (!session) {
        setError("This reset link has expired or is invalid. Request a new one.");
      }
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    const supabase = tryCreateClient();
    if (!supabase) {
      setError("Sign-in service is not available right now.");
      return;
    }

    setSubmitting(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw new Error(updateError.message);

      setMessage("Password updated. Redirecting…");
      window.setTimeout(() => {
        router.push("/cityrun/home");
        router.refresh();
      }, 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update password.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-sm">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-white">New password</h2>
      </div>

      {loading && <p className="text-xs text-white/40">Checking reset link…</p>}

      {!loading && !ready && (
        <div className="space-y-3">
          {error && (
            <p className="rounded-lg border border-red-400/20 bg-red-500/8 px-3 py-2 text-xs text-red-300">
              {error}
            </p>
          )}
          <Link
            href="/cityrun/account?forgot=1"
            className="block w-full rounded-lg bg-accent py-2.5 text-center text-sm font-semibold text-white"
          >
            Request new reset link
          </Link>
        </div>
      )}

      {!loading && ready && (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label
              htmlFor="new-password"
              className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-white/40"
            >
              New password
            </label>
            <PasswordInput
              id="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              inputClassName={`${AUTH_INPUT} pr-10`}
              placeholder="Min. 6 characters"
              autoComplete="new-password"
              minLength={6}
              required
            />
          </div>

          <div>
            <label
              htmlFor="confirm-password"
              className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-white/40"
            >
              Confirm password
            </label>
            <PasswordInput
              id="confirm-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              inputClassName={`${AUTH_INPUT} pr-10`}
              placeholder="Repeat password"
              autoComplete="new-password"
              minLength={6}
              required
            />
          </div>

          {error && (
            <p className="rounded-lg border border-red-400/20 bg-red-500/8 px-3 py-2 text-xs text-red-300">
              {error}
            </p>
          )}
          {message && (
            <p className="rounded-lg border border-emerald-400/20 bg-emerald-500/8 px-3 py-2 text-xs text-emerald-300">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-accent py-2.5 text-sm font-semibold text-white disabled:opacity-40"
          >
            {submitting ? "Saving…" : "Update password"}
          </button>
        </form>
      )}
    </div>
  );
}
