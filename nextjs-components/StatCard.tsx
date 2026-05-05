'use client';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  trendUp?: boolean;
}

export default function StatCard({ title, value, icon, trend, trendUp }: StatCardProps) {
  return (
    <div className="bg-[rgba(255,255,255,0.03)] backdrop-blur-md border border-[rgba(255,255,255,0.12)] 
                    rounded-xl p-6 shadow-[0_0_15px_rgba(255,179,0,0.10)] 
                    hover:shadow-[0_0_25px_rgba(255,179,0,0.2)] transition-all hover:border-amber-500/30">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-400 text-sm font-medium">{title}</p>
          <p className="text-3xl font-bold text-white mt-2">{value}</p>
          {trend && (
            <p className={`text-sm mt-2 ${trendUp ? 'text-green-400' : 'text-red-400'}`}>
              {trend}
            </p>
          )}
        </div>
        <div className="text-amber-400 bg-amber-500/10 p-3 rounded-lg border border-amber-500/20">
          {icon}
        </div>
      </div>
    </div>
  );
}
