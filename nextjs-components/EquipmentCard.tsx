'use client';

interface EquipmentCardProps {
  id: string;
  name: string;
  type: string;
  status: 'available' | 'in-use' | 'maintenance';
  lastMaintenance?: string;
  nextMaintenance?: string;
  onClick?: () => void;
}

export default function EquipmentCard({
  id, name, type, status, lastMaintenance, nextMaintenance, onClick
}: EquipmentCardProps) {
  const statusConfig = {
    available: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
    'in-use': { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
    maintenance: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' }
  };

  const config = statusConfig[status];

  return (
    <div
      onClick={onClick}
      className="bg-[rgba(255,255,255,0.03)] backdrop-blur-md border border-[rgba(255,255,255,0.12)] 
                 rounded-xl p-6 shadow-[0_0_15px_rgba(255,179,0,0.10)] 
                 hover:shadow-[0_0_25px_rgba(255,179,0,0.2)] transition-all cursor-pointer"
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-lg font-semibold text-white">{name}</h3>
          <p className="text-gray-400 text-sm">{type}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text} border ${config.border}`}>
          {status}
        </span>
      </div>
      
      {nextMaintenance && (
        <div className="mt-4 pt-4 border-t border-white/10">
          <p className="text-xs text-gray-400">Next Maintenance: {nextMaintenance}</p>
        </div>
      )}
    </div>
  );
}
