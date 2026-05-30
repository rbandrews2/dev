import type { ReactNode } from "react";

type LayoutBackgroundProps = {
  children: ReactNode;
};

export default function LayoutBackground({ children }: LayoutBackgroundProps) {
  return (
    <div className="app-bg min-h-screen text-white">
      <div className="relative z-10">{children}</div>
    </div>
  );
}
