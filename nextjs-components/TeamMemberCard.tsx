'use client';

interface TeamMemberCardProps {
  name: string;
  role: string;
  image: string;
  status: 'active' | 'break' | 'offline';
  hoursToday: number;
  currentTask?: string;
  onClick?: () => void;
}

export default function TeamMemberCard({
  name, role, image, status, hoursToday, currentTask, onClick
}: TeamMemberCardProps) {
  const statusColors = {
    active: 'bg-green-500',
    break: 'bg-yellow-500',
    offline: 'bg-gray-400'
  };

  return (
    <div 
      onClick={onClick}
      className="bg-[rgba(255,255,255,0.03)] backdrop-blur-md border border-[rgba(255,255,255,0.12)] 
                 rounded-xl p-4 shadow-[0_0_15px_rgba(255,179,0,0.10)] 
                 hover:shadow-[0_0_25px_rgba(255,179,0,0.2)] transition-all cursor-pointer
                 hover:border-amber-500/30"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="relative">
          <img src={image} alt={name} className="w-16 h-16 rounded-full object-cover border-2 border-amber-500/30" />
          <span className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-black ${statusColors[status]}`}></span>
        </div>
        <div>
          <h3 className="font-bold text-white">{name}</h3>
          <p className="text-sm text-gray-400">{role}</p>
        </div>
      </div>
      <div className="border-t border-white/10 pt-3">
        <p className="text-sm text-gray-300 mb-1">
          Hours Today: <span className="font-semibold text-amber-400">{hoursToday}h</span>
        </p>
        {currentTask && <p className="text-xs text-gray-500">Task: {currentTask}</p>}
      </div>
    </div>
  );
}
