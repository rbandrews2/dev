import React from 'react';

interface TrainingModuleCardProps {
  title: string;
  description: string;
  duration: string;
  progress: number;
  status: 'not-started' | 'in-progress' | 'completed';
  onClick: () => void;
}

const TrainingModuleCard: React.FC<TrainingModuleCardProps> = ({
  title, description, duration, progress, status, onClick
}) => {
  const statusColors = {
    'not-started': 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    'in-progress': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    completed: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
  };

  return (
    <div 
      onClick={onClick}
      className="bg-wz_glass backdrop-blur-xl border border-wz_border rounded-xl shadow-glow p-5 hover:shadow-glow-strong transition-all cursor-pointer hover:border-orange-400/40 hover:bg-white/5"
    >
      <div className="flex justify-between items-start mb-3">
        <h3 className="font-bold text-white text-lg">{title}</h3>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${statusColors[status]}`}>
          {status.replace('-', ' ')}
        </span>
      </div>
      <p className="text-gray-400 text-sm mb-3">{description}</p>
      <div className="mb-3">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Progress</span>
          <span>{progress}%</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div className="bg-orange-500 h-2 rounded-full transition-all" style={{width: `${progress}%`}}></div>
        </div>
      </div>
      <p className="text-xs text-gray-500">Duration: {duration}</p>
    </div>
  );
};

export default TrainingModuleCard;
