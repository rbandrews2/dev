import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  trendUp?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, trend, trendUp }) => {
  return (
    <div
      className="bg-wz_glass backdrop-blur-xl border border-wz_border rounded-xl p-6 shadow-glow transition-all hover:shadow-glow-strong hover:border-orange-400/40"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide">{title}</p>
          <p className="text-3xl font-bold text-white mt-2">{value}</p>
          {trend && (
            <p className={`text-sm mt-2 ${trendUp ? "text-emerald-400" : "text-red-400"}`}>
              {trend}
            </p>
          )}
        </div>
        <div className="text-orange-300 bg-orange-500/10 p-3 rounded-lg border border-orange-500/20 shadow-inner">
          {icon}
        </div>
      </div>
    </div>
  );
};

export default StatCard;
