import { Suspense } from "react";
import { AccountDashboard } from "@/components/city-run/AccountDashboard";

export const metadata = {
  title: "Account | City Run",
};

export default async function CityRunAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ signup?: string; forgot?: string }>;
}) {
  const params = await searchParams;
  const initialAuthMode =
    params.signup === "1" ? "signup" : params.forgot === "1" ? "forgot" : "signin";

  return (
    <main>
      <Suspense fallback={<div className="cr-mesh-page min-h-dvh" />}>
        <AccountDashboard initialAuthMode={initialAuthMode} />
      </Suspense>
    </main>
  );
}
