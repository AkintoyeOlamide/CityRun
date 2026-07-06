"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { Bike, Building2, User } from "lucide-react";
import { completeAuthRedirect } from "@/lib/auth/complete-auth-redirect";
import { PasswordInput } from "@/components/city-run/PasswordInput";
import type { AccountType, AddressValue } from "@/lib/city-run/types";

const AddressAutocomplete = dynamic(
  () =>
    import("@/components/city-run/AddressAutocomplete").then((m) => ({
      default: m.AddressAutocomplete,
    })),
  { ssr: false, loading: () => null },
);

const AUTH_INPUT =
  "w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none transition-colors focus:border-accent/60 focus:bg-white/[0.05]";

type AuthFormProps = {
  onSuccess?: (role: "customer" | "rider", redirectTo?: string) => void;
  defaultMode?: "signin" | "signup" | "forgot";
};

export function AuthForm({ onSuccess, defaultMode = "signin" }: AuthFormProps) {
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">(defaultMode);
  const [signInRole, setSignInRole] = useState<"customer" | "rider">("customer");
  const [accountType, setAccountType] = useState<AccountType>("individual");
  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [natureOfGoods, setNatureOfGoods] = useState("");
  const [businessAddress, setBusinessAddress] = useState<AddressValue>({ formatted: "" });
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    setMode(defaultMode);
  }, [defaultMode]);

  function switchMode(next: "signin" | "signup" | "forgot") {
    setMode(next);
    setError("");
    setMessage("");
  }

  function finishAuth(role: "customer" | "rider", redirectTo?: string) {
    if (onSuccess) {
      onSuccess(role, redirectTo);
      return;
    }
    completeAuthRedirect(role, redirectTo);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      if (mode === "forgot") {
        const res = await fetch("/api/cityrun/auth/forgot-password", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const body = (await res.json()) as { error?: string; message?: string };
        if (!res.ok) throw new Error(body.error ?? "Could not send reset email");
        setMessage(
          body.message ??
            "If an account exists for that email, we sent a password reset link.",
        );
        return;
      }

      if (mode === "signup") {
        if (!fullName.trim() || !phone.trim()) {
          throw new Error("Name and phone are required.");
        }
        if (accountType === "business" && !businessName.trim()) {
          throw new Error("Business name is required.");
        }
        if (accountType === "business" && !natureOfGoods.trim()) {
          throw new Error("Nature of goods is required.");
        }
        if (
          accountType === "business" &&
          businessAddress.formatted.trim().length <= 5
        ) {
          throw new Error("Business address is required.");
        }

        const res = await fetch("/api/cityrun/auth/signup", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            password,
            fullName: fullName.trim(),
            phone: phone.trim(),
            accountType,
            ...(accountType === "business"
              ? {
                  businessName: businessName.trim(),
                  natureOfGoods: natureOfGoods.trim(),
                  businessAddress,
                }
              : {}),
          }),
        });
        const body = (await res.json()) as { error?: string; accountType?: string };
        if (!res.ok) throw new Error(body.error ?? "Could not create account");

        const redirectTo =
          body.accountType === "business"
            ? "/cityrun/account?welcomeWallet=1"
            : "/cityrun/home?welcomeWallet=1";
        finishAuth("customer", redirectTo);
        return;
      }

      if (signInRole === "rider") {
        const res = await fetch("/api/cityrun/rider/login", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: username.trim(), password }),
        });
        const body = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(body.error ?? "Rider sign in failed");

        finishAuth("rider");
        return;
      }

      const res = await fetch("/api/cityrun/auth/signin", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? "Sign in failed");

      finishAuth("customer");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-sm">
      {mode !== "forgot" ? (
        <div className="mb-4 flex border-b border-white/10">
          <AuthTab active={mode === "signin"} onClick={() => switchMode("signin")}>
            Sign in
          </AuthTab>
          <AuthTab active={mode === "signup"} onClick={() => switchMode("signup")}>
            Sign up
          </AuthTab>
        </div>
      ) : (
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-white">Reset password</h2>
        </div>
      )}

      {mode === "signin" && (
        <div className="mb-4 flex gap-1.5 rounded-lg border border-white/10 bg-white/[0.02] p-1">
          <SignInRolePill
            selected={signInRole === "customer"}
            onSelect={() => setSignInRole("customer")}
            icon={User}
            label="Customer"
          />
          <SignInRolePill
            selected={signInRole === "rider"}
            onSelect={() => setSignInRole("rider")}
            icon={Bike}
            label="Rider"
          />
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        {mode === "signup" && (
          <>
            <div className="flex gap-1.5 rounded-lg border border-white/10 bg-white/[0.02] p-1">
              <AccountTypePill
                selected={accountType === "individual"}
                onSelect={() => setAccountType("individual")}
                icon={User}
                label="Individual"
              />
              <AccountTypePill
                selected={accountType === "business"}
                onSelect={() => setAccountType("business")}
                icon={Building2}
                label="Business"
              />
            </div>

            {accountType === "business" && (
              <>
                <AuthField label="Business name">
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className={AUTH_INPUT}
                    placeholder="Company name"
                    autoComplete="organization"
                    required
                  />
                </AuthField>
                <div>
                  <AddressAutocomplete
                    id="signup-business-address"
                    label="Business address"
                    placeholder="Shop or office address"
                    value={businessAddress}
                    onChange={setBusinessAddress}
                    compact
                  />
                </div>
                <AuthField label="Nature of goods">
                  <input
                    type="text"
                    value={natureOfGoods}
                    onChange={(e) => setNatureOfGoods(e.target.value)}
                    className={AUTH_INPUT}
                    placeholder="e.g. Electronics, food, documents"
                    required
                  />
                </AuthField>
              </>
            )}

            <AuthField label={accountType === "business" ? "Contact person" : "Full name"}>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={AUTH_INPUT}
                placeholder={accountType === "business" ? "Who we should call" : "Your name"}
                autoComplete="name"
                required
              />
            </AuthField>

            <AuthField label="Phone">
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0801 234 5678"
                className={AUTH_INPUT}
                autoComplete="tel"
                required
              />
            </AuthField>
          </>
        )}

        {mode === "signin" && signInRole === "rider" ? (
          <AuthField label="Username">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={AUTH_INPUT}
              placeholder="Rider username from admin"
              autoComplete="username"
              required
            />
          </AuthField>
        ) : mode !== "forgot" ? (
          <AuthField label="Email">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={AUTH_INPUT}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </AuthField>
        ) : (
          <AuthField label="Email">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={AUTH_INPUT}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </AuthField>
        )}

        {mode === "signin" && signInRole === "customer" && (
          <div className="-mt-1 text-right">
            <button
              type="button"
              onClick={() => switchMode("forgot")}
              className="text-[11px] font-medium text-white/45 transition-colors hover:text-accent"
            >
              Forgot password?
            </button>
          </div>
        )}

        {mode !== "forgot" && (
          <AuthField label="Password" htmlFor="auth-password">
            <PasswordInput
              id="auth-password"
              key={`${mode}-${signInRole}`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              inputClassName={`${AUTH_INPUT} pr-10`}
              placeholder={mode === "signup" ? "Min. 6 characters" : "Password"}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              minLength={6}
              required
            />
          </AuthField>
        )}

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
          disabled={loading}
          className="mt-1 w-full rounded-lg bg-accent py-2.5 text-sm font-semibold text-white transition-opacity disabled:opacity-40"
        >
          {loading
            ? "Please wait…"
            : mode === "forgot"
              ? "Send reset link"
              : mode === "signup"
                ? "Create account"
                : signInRole === "rider"
                  ? "Sign in as rider"
                  : "Sign in"}
        </button>

        {mode === "forgot" && (
          <button
            type="button"
            onClick={() => switchMode("signin")}
            className="w-full py-1 text-xs text-white/40 transition-colors hover:text-white/65"
          >
            Back to sign in
          </button>
        )}

        {mode === "signin" && signInRole === "rider" && (
          <p className="text-center text-[11px] leading-relaxed text-white/40">
            Use the username and password created for you in admin.
          </p>
        )}
      </form>
    </div>
  );
}

function AuthTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex-1 pb-2.5 text-sm font-medium transition-colors ${
        active ? "text-white" : "text-white/40 hover:text-white/65"
      }`}
    >
      {children}
      {active && (
        <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-accent" />
      )}
    </button>
  );
}

function SignInRolePill({
  selected,
  onSelect,
  icon: Icon,
  label,
}: {
  selected: boolean;
  onSelect: () => void;
  icon: typeof User;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
        selected
          ? "bg-accent/20 text-white"
          : "text-white/45 hover:text-white/70"
      }`}
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={2} />
      {label}
    </button>
  );
}

function AccountTypePill({
  selected,
  onSelect,
  icon: Icon,
  label,
}: {
  selected: boolean;
  onSelect: () => void;
  icon: typeof User;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
        selected
          ? "bg-accent/20 text-white"
          : "text-white/45 hover:text-white/70"
      }`}
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={2} />
      {label}
    </button>
  );
}

function AuthField({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-white/40"
      >
        {label}
      </label>
      {children}
    </div>
  );
}
