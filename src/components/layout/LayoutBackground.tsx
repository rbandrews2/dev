import type { ReactNode } from "react";

type LayoutBackgroundProps = {
  children: ReactNode;
};

export default function LayoutBackground({ children }: LayoutBackgroundProps) {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-gradient-to-br from-black via-[#0f0f0f] to-[#050505] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,179,0,0.06),transparent_30%),radial-gradient(circle_at_80%_0%,rgba(255,179,0,0.04),transparent_25%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(255,179,0,0.05),transparent_45%),linear-gradient(180deg,#050505_0%,#0a0a0a_40%,#050505_100%)]" />
      <div className="relative">{children}</div>
    </div>
  );
}
