import { Link } from "react-router-dom";
import "./CardShine.css";

type DashboardCardProps = {
  title: string;
  subtitle?: string;
  to: string;
  icon?: JSX.Element;
};

export default function DashboardCard({ title, subtitle, to, icon }: DashboardCardProps) {
  return (
    <Link to={to}>
      <div
        className="
          liquid-card
          card-border-glow
          p-6
          rounded-2xl
          cursor-pointer
          transition-all
          duration-300
          text-white
          select-none
          h-40
          flex
          flex-col
          justify-between
        "
      >
        <div className="flex items-center gap-3">
          {icon ? <div className="text-emerald-300 text-3xl">{icon}</div> : null}
          <h2 className="text-xl font-semibold tracking-wide">{title}</h2>
        </div>
        {subtitle && <p className="text-sm text-gray-300">{subtitle}</p>}
      </div>
    </Link>
  );
}
