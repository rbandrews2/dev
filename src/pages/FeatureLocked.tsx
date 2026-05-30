import { GlassCard } from "@/components/GlassCard";

export default function FeatureLocked() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <GlassCard className="max-w-xl w-full p-6 text-center">
        <div className="space-y-3">
          <img src="/wzos-logo.svg" alt="Work Zone OS" className="h-10 w-10 mx-auto" />
          <h1 className="text-2xl font-semibold text-white">Available upon activation</h1>
          <p className="text-sm text-orange-100/80">
            This module is locked for the current demo build. Contact Superior Consultation to enable it for your environment.
          </p>
        </div>
      </GlassCard>
    </div>
  );
}
