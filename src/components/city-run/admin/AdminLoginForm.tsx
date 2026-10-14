"use client";

import { useState } from "react";
import { PasswordInput } from "@/components/city-run/PasswordInput";
import { ADMIN_INPUT, AdminAlert, AdminField } from "@/components/city-run/admin/AdminUI";

type AdminLoginFormProps = {
  onSuccess: () => void;
};

export function AdminLoginForm({ onSuccess }: AdminLoginFormProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/cityrun/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Login failed");
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2.5" autoComplete="on">
      <AdminField label="Username">
        <input
          id="admin-login-username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          className={ADMIN_INPUT}
          required
        />
      </AdminField>
      <AdminField label="Password">
        <PasswordInput
          id="admin-login-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          inputClassName={`${ADMIN_INPUT} pr-10`}
          required
        />
      </AdminField>
      {error && <AdminAlert tone="error">{error}</AdminAlert>}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-accent py-2 text-[13px] font-medium text-white disabled:opacity-40"
      >
        {loading ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
