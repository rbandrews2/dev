import React from 'react';

interface EquipmentCardProps {
  name: string;
  image: string;
  status: 'available' | 'in-use' | 'maintenance';
  location: string;
  operator?: string;
  onClick: () => void;
}

const EquipmentCard: React.FC<EquipmentCardProps> = ({
  name, image, status, location, operator, onClick
}) => {
  const statusColors = {
    available: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
    'in-use': 'bg-orange-500/20 text-orange-300 border-orange-500/40',
    maintenance: 'bg-red-500/20 text-red-300 border-red-500/40',
  } as const;


  return (
    <div 
      onClick={onClick}
      className="bg-wz_glass backdrop-blur-xl border border-wz_border rounded-xl shadow-glow overflow-hidden hover:shadow-glow-strong transition-all cursor-pointer hover:border-amber-400/40 hover:bg-white/5"
    >
      <div className="h-48 overflow-hidden">
        <img src={image} alt={name} className="w-full h-full object-cover hover:scale-105 transition-transform" />
      </div>
      <div className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-bold text-white">{name}</h3>
          <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${statusColors[status]}`}>
            {status}
          </span>
        </div>
        <p className="text-sm text-gray-400 mb-1">Location: {location}</p>
        {operator && <p className="text-sm text-gray-500">Operator: {operator}</p>}
      </div>
    </div>
  );
};

export default EquipmentCard;
