'use client';

interface WorkOrderCardProps {
  id: string;
  title: string;
  location: string;
  status: 'pending' | 'in-progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  assignedTo?: string;
  dueDate?: string;
  onClick?: () => void;
}

export default function WorkOrderCard({
  id, title, location, status, priority, assignedTo, dueDate, onClick
}: WorkOrderCardProps) {
  const statusColors = {
    pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    'in-progress': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    completed: 'bg-green-500/20 text-green-400 border-green-500/30'
  };

  const priorityColors = {
    low: 'text-gray-400',
    medium: 'text-amber-400',
    high: 'text-red-400'
  };

  return (
    <div
      onClick={onClick}
      className="bg-[rgba(255,255,255,0.03)] backdrop-blur-md border border-[rgba(255,255,255,0.12)] 
                 rounded-xl p-6 shadow-[0_0_15px_rgba(255,179,0,0.10)] 
                 hover:shadow-[0_0_25px_rgba(255,179,0,0.2)] transition-all cursor-pointer
                 hover:border-amber-500/30"
    >
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${statusColors[status]}`}>
          {status.replace('-', ' ')}
        </span>
      </div>
      
      <p className="text-gray-400 text-sm mb-4">{location}</p>
      
      <div className="flex justify-between items-center text-sm">
        <span className={`font-semibold ${priorityColors[priority]}`}>
          {priority.toUpperCase()} Priority
        </span>
        {assignedTo && <span className="text-gray-400">{assignedTo}</span>}
      </div>
    </div>
  );
}
