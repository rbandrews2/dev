"use client";

import React from "react";
import { wzosTheme, wzosCardClasses } from "@/theme/wzosTheme";

export function GlassCard({
  children,
  className = "",
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`glass-card ${wzosCardClasses.surface} relative overflow-hidden ${className}`}
      style={{
        background:
          "radial-gradient(circle at 20% 15%, rgba(255,255,255,0.06), transparent 30%)," +
          "radial-gradient(circle at 80% 0%, rgba(255,204,64,0.05), transparent 22%)," +
          wzosTheme.glassBg,
        borderColor: wzosTheme.glassBorder,
        boxShadow: `0 18px 36px rgba(0,0,0,0.45), 0 0 28px rgba(255,204,64,0.14)`,
        ...style,
      }}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/8 via-transparent to-white/10 opacity-28" />
      <div className="glass-card-beam pointer-events-none absolute inset-0 opacity-16" />
      <div className="relative">{children}</div>
    </div>
  );
}
