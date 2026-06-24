import { ResetPasswordForm } from "@/components/city-run/ResetPasswordForm";
import { CityRunBottomNav } from "@/components/city-run/CityRunBottomNav";

export const metadata = {
  title: "Reset password | City Run",
};

export default function ResetPasswordPage() {
  return (
    <div className="min-h-dvh bg-cr-page cr-mesh-page text-white">
      <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col pb-28">
        <header className="px-4 pt-8 pb-2">
          <h1 className="text-center text-lg font-semibold text-white">Reset password</h1>
        </header>
        <main className="flex-1 px-4 pb-8 pt-2">
          <ResetPasswordForm />
        </main>
        <CityRunBottomNav />
      </div>
    </div>
  );
}
