"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

type PasswordInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type"
> & {
  inputClassName?: string;
  /** Show "Show" / "Hide" text beside the icon (better for account forms). */
  showToggleLabel?: boolean;
};

export function PasswordInput({
  className = "relative w-full",
  inputClassName,
  showToggleLabel = false,
  ...props
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className={className}>
      <input
        {...props}
        type={visible ? "text" : "password"}
        className={
          inputClassName ??
          "w-full rounded-xl border border-white/10 bg-cr-page px-4 py-3 pr-11 text-base text-white placeholder:text-white/35 outline-none focus:border-accent"
        }
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className={`absolute right-2 top-1/2 z-10 flex -translate-y-1/2 items-center gap-1 rounded-md px-2 py-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white ${
          showToggleLabel ? "text-xs font-medium" : ""
        }`}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
      >
        {visible ? (
          <EyeOff className="h-4 w-4 shrink-0" aria-hidden />
        ) : (
          <Eye className="h-4 w-4 shrink-0" aria-hidden />
        )}
        {showToggleLabel && (
          <span className="hidden min-[360px]:inline">
            {visible ? "Hide" : "Show"}
          </span>
        )}
      </button>
    </div>
  );
}
