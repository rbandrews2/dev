export const wzosTheme = {
  accent: "#facc15", // amber / yellow focal color
  accentSoft: "rgba(250, 204, 21, 0.16)",
  glassBg: "rgba(6, 6, 10, 0.72)",
  glassBorder: "rgba(250, 204, 21, 0.25)",
  glowShadow: "0 0 24px rgba(250, 204, 21, 0.32)",
} as const;

export const wzosCardClasses = {
  surface:
    "rounded-2xl border backdrop-blur-xl text-yellow-100 shadow-[0_18px_40px_rgba(0,0,0,0.55)]",
  hover:
    "transition-transform duration-300 hover:-translate-y-1 hover:shadow-[0_0_26px_rgba(250,204,21,0.32)]",
};
