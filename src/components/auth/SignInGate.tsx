import { ReactNode } from "react";
import AuthLandingCard from "@/components/auth/AuthLandingCard";

type Props = {
  label: string;
  title: string;
  description: string;
  icon?: ReactNode;
};

export default function SignInGate({ label, title, description, icon }: Props) {
  return (
    <div className="min-h-[70vh] flex flex-col gap-6 text-amber-50 pb-10">
      <header className="space-y-2">
        <p className="text-sm uppercase tracking-[0.2em] text-amber-300/80">{label}</p>
        <h1 className="text-3xl font-semibold text-white">{title}</h1>
        <p className="text-amber-100/75 text-sm max-w-2xl">{description}</p>
      </header>

      <div className="w-full max-w-5xl space-y-4">
        <div className="rounded-2xl border border-amber-500/30 bg-black/60 p-6 shadow-[0_0_30px_rgba(0,0,0,0.4)]">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl border border-amber-400/40 bg-amber-500/10 flex items-center justify-center text-amber-200">
              {icon ?? "🔒"}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">{label}</h2>
              <p className="text-sm text-amber-100/75">Sign in to access this section.</p>
            </div>
          </div>
        </div>

        <div className="w-full">
          <AuthLandingCard
            title="Sign in or create an account"
            subtitle="Access crew messaging, forms, training, navigation, and more."
          />
        </div>
      </div>
    </div>
  );
}
