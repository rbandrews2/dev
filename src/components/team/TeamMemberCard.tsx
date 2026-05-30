import React from 'react';

interface TeamMemberCardProps {
  name: string;
  role: string;
  image: string;
  status: 'active' | 'break' | 'offline';
  hoursToday: number;
  currentTask?: string;
  onClick: () => void;
}

const TeamMemberCard: React.FC<TeamMemberCardProps> = ({
  name, role, image, status, hoursToday, currentTask, onClick
}) => {
  const statusColors = {
    active: 'bg-green-500',
    break: 'bg-orange-400',
    offline: 'bg-gray-500'
  };

  return (
    <div 
      onClick={onClick}
      className="bg-wz_glass backdrop-blur-xl border border-wz_border rounded-xl shadow-glow p-4 hover:shadow-glow-strong transition-all cursor-pointer hover:border-orange-400/40 hover:bg-white/5"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="relative">
          <img src={image} alt={name} className="w-16 h-16 rounded-full object-cover border-2 border-orange-500/30" />
          <span className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-black ${statusColors[status]}`}></span>
        </div>
        <div>
          <h3 className="font-bold text-white">{name}</h3>
          <p className="text-sm text-gray-400">{role}</p>
        </div>
      </div>
      <div className="border-t border-orange-500/20 pt-3">
        <p className="text-sm text-gray-300 mb-1">Hours Today: <span className="font-semibold text-orange-400">{hoursToday}h</span></p>
        {currentTask && <p className="text-xs text-gray-500">Task: {currentTask}</p>}
      </div>
    </div>
  );
};

export default TeamMemberCard;
