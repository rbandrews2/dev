'use client';

interface TrainingModuleCardProps {
  title: string;
  description: string;
  duration: string;
  progress: number;
  status: 'not-started' | 'in-progress' | 'completed';
  onClick?: () => void;
}

export default function TrainingModuleCard({
  title, description, duration, progress, status, onClick
}: TrainingModuleCardProps) {
  const statusColors = {
    'not-started': 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    'in-progress': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    completed: 'bg-green-500/20 text-green-400 border-green-500/30'
  };

  return (
    <div 
      onClick={onClick}
      className="bg-[rgba(255,255,255,0.03)] backdrop-blur-md border border-[rgba(255,255,255,0.12)] 
                 rounded-xl p-5 shadow-[0_0_15px_rgba(255,179,0,0.10)] 
                 hover:shadow-[0_0_25px_rgba(255,179,0,0.2)] transition-all cursor-pointer
                 hover:border-amber-500/30"
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
          <div className="bg-amber-500 h-2 rounded-full transition-all" style={{width: `${progress}%`}}></div>
        </div>
      </div>
      <p className="text-xs text-gray-500">Duration: {duration}</p>
    </div>
  );
}
