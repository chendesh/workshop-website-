import { AlertTriangle } from 'lucide-react';
import Modal from './Modal';

const DeleteConfirmModal = ({ isOpen, onClose, onConfirm, title = 'Confirm Delete', message, itemName, loading = false }) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary" disabled={loading}>
            Cancel
          </button>
          <button onClick={onConfirm} className="btn-danger" disabled={loading}>
            {loading ? 'Deleting...' : 'Delete'}
          </button>
        </>
      }
    >
      <div className="flex flex-col items-center text-center py-4">
        <div className="p-4 rounded-full bg-red-500/20 mb-4">
          <AlertTriangle className="w-8 h-8 text-red-400" />
        </div>
        <p className="text-gray-300 text-base">
          {message || (
            <>
              Are you sure you want to delete{' '}
              {itemName && <span className="font-semibold text-white">&quot;{itemName}&quot;</span>}
              ? This action cannot be undone.
            </>
          )}
        </p>
      </div>
    </Modal>
  );
};

export default DeleteConfirmModal;
