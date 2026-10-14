"use client";

import { useState } from "react";
import { PasswordInput } from "@/components/city-run/PasswordInput";
import { OPS_INPUT } from "@/components/city-run/ops/OpsUI";

type RiderLoginFormProps = {
  onSuccess: () => void;
};

export function RiderLoginForm({ onSuccess }: RiderLoginFormProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/cityrun/rider/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(body.error ?? "Login failed");
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" autoComplete="on">
      <div>
        <label
          htmlFor="rider-login-username"
          className="mb-2 block text-sm font-medium text-white/80"
        >
          Username
        </label>
        <input
          id="rider-login-username"
          name="rider_login_username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          className={OPS_INPUT}
          placeholder="Your rider username"
          required
        />
      </div>
      <div>
        <label
          htmlFor="rider-login-password"
          className="mb-2 block text-sm font-medium text-white/80"
        >
          Password
        </label>
        <PasswordInput
          id="rider-login-password"
          name="rider_login_password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          placeholder="Password"
          required
        />
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-accent py-3.5 text-base font-bold text-white shadow-[0_8px_24px_-8px_rgb(52_120_246/0.55)] disabled:opacity-40"
      >
        {loading ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
