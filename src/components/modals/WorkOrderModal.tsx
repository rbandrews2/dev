import React from 'react';

interface WorkOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  workOrder: any;
}

const WorkOrderModal: React.FC<WorkOrderModalProps> = ({ isOpen, onClose, workOrder }) => {
  if (!isOpen || !workOrder) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-2xl font-bold text-gray-900">{workOrder.title}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-gray-600">Location</label>
            <p className="text-gray-900">{workOrder.location}</p>
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-600">Status</label>
            <p className="text-gray-900 capitalize">{workOrder.status.replace('-', ' ')}</p>
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-600">Assigned To</label>
            <p className="text-gray-900">{workOrder.assignee}</p>
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-600">Due Date</label>
            <p className="text-gray-900">{workOrder.dueDate}</p>
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-600">Priority</label>
            <p className="text-gray-900 capitalize">{workOrder.priority}</p>
          </div>
        </div>
        <div className="mt-6 flex gap-3">
          <button className="flex-1 bg-orange-500 text-white py-2 px-4 rounded-lg hover:bg-orange-600 transition-colors">
            Update Status
          </button>
          <button onClick={onClose} className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default WorkOrderModal;
