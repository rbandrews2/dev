import type { ReactNode } from "react";
import { GlassCard } from "@/components/GlassCard";

type Props = {
  title: string;
  kicker?: string;
  children: ReactNode;
};

export default function LegalPageShell({ title, kicker, children }: Props) {
  return (
    <div className="min-h-screen pb-16 max-w-5xl mx-auto space-y-4">
      <div className="space-y-1">
        {kicker && (
          <p className="text-xs uppercase tracking-[0.2em] text-orange-200/80">
            {kicker}
          </p>
        )}
        <h1 className="text-3xl font-semibold text-white">{title}</h1>
      </div>
      <GlassCard className="p-5 text-sm leading-relaxed text-orange-100/85 space-y-3">
        {children}
      </GlassCard>
    </div>
  );
}
