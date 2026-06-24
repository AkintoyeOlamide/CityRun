import Link from "next/link";
import { ArrowLeft } from "lucide-react";

type CityRunShellProps = {
  title: string;
  backHref?: string;
  children: React.ReactNode;
  /** Glass header + mesh background for rider/ops mobile views */
  variant?: "default" | "ops";
};

export function CityRunShell({
  title,
  backHref = "/cityrun/home",
  children,
  variant = "default",
}: CityRunShellProps) {
  const ops = variant === "ops";

  return (
    <div className={`min-h-dvh text-white ${ops ? "bg-cr-page cr-mesh-page" : "bg-cr-page"}`}>
      <div className="mx-auto min-h-dvh w-full max-w-lg">
        <header
          className={
            ops
              ? "cr-ops-header sticky top-0 z-10 flex items-center gap-3 px-4 py-4"
              : "flex items-center gap-3 border-b border-white/10 px-4 py-4"
          }
        >
          <Link
            href={backHref}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/75 transition-colors active:bg-white/[0.08]"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="cr-text-headline text-lg font-bold">{title}</h1>
        </header>
        {children}
      </div>
    </div>
  );
}
