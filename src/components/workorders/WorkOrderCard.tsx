import React from 'react';

interface WorkOrderCardProps {
  id: string;
  title: string;
  location: string;
  status: 'pending' | 'in-progress' | 'completed';
  assignee: string;
  assigneeImage: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high';
  onClick: () => void;
}

const WorkOrderCard: React.FC<WorkOrderCardProps> = ({
  title, location, status, assignee, assigneeImage, dueDate, priority, onClick
}) => {
  const statusColors = {
    pending: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
    'in-progress': 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    completed: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
  };

const priorityColors = {
    low: 'border-l-gray-600',
    medium: 'border-l-orange-400',
    high: 'border-l-red-500'
  };

  return (
    <div 
      onClick={onClick}
      className={`bg-wz_glass backdrop-blur-xl border border-wz_border rounded-xl shadow-glow p-5 hover:shadow-glow-strong transition-all cursor-pointer border-l-4 ${priorityColors[priority]} hover:border-orange-400/50 hover:bg-white/5`}
    >
      <div className="flex justify-between items-start mb-3">
        <h3 className="font-bold text-white text-lg">{title}</h3>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${statusColors[status]}`}>
          {status.replace('-', ' ')}
        </span>
      </div>
      <p className="text-gray-400 text-sm mb-3">{location}</p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src={assigneeImage} alt={assignee} className="w-8 h-8 rounded-full object-cover border-2 border-orange-500/30" />
          <span className="text-sm text-gray-300">{assignee}</span>
        </div>
        <span className="text-xs text-gray-500">Due: {dueDate}</span>
      </div>
    </div>
  );
};

export default WorkOrderCard;
