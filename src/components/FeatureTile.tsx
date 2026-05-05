import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { GlassCard } from "./GlassCard";
import { wzosTheme, wzosCardClasses } from "@/theme/wzosTheme";

type FeatureTileProps = {
  title: string;
  description?: string;
  icon?: ReactNode;
  to?: string;
};

export default function FeatureTile({ title, description, icon, to }: FeatureTileProps) {
  const card = (
    <GlassCard
      className={`h-full p-5 ${wzosCardClasses.hover} hover:border-yellow-300/60`}
      style={{
        borderColor: wzosTheme.glassBorder,
      }}
    >
      <div className="relative flex flex-col gap-3 h-full">
        {icon && (
          <div className="w-10 h-10 rounded-xl border border-yellow-400/30 bg-black/40 flex items-center justify-center text-yellow-300 shadow-[0_6px_18px_rgba(0,0,0,0.4)]">
            {icon}
          </div>
        )}

        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-yellow-100 tracking-wide">
            {title}
          </h3>
          {description && (
            <p className="text-sm text-yellow-100/75 leading-relaxed">
              {description}
            </p>
          )}
        </div>

        <div className="mt-auto flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-yellow-200/70">
          <span className="h-[1px] w-8 bg-gradient-to-r from-transparent via-yellow-300/60 to-transparent" />
          {to ? "Launch" : "Coming soon"}
        </div>
      </div>
    </GlassCard>
  );

  if (!to) {
    return <div className="h-full">{card}</div>;
  }

  return (
    <Link
      to={to}
      className="group block h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/70 rounded-2xl"
    >
      {card}
    </Link>
  );
}
