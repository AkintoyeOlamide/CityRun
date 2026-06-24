import "./city-run-theme.css";
import type { Metadata } from "next";
import { CityRunClientShell } from "@/components/city-run/CityRunClientShell";
import { getInitialAuthState } from "@/lib/auth/server-auth";

export const metadata: Metadata = {
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "City Run",
    statusBarStyle: "black-translucent",
  },
};

export default async function CityRunLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile } = await getInitialAuthState();

  return (
    <div className="city-run-theme min-h-dvh">
      <CityRunClientShell initialAuthState={{ user, profile }}>
        {children}
      </CityRunClientShell>
    </div>
  );
}
