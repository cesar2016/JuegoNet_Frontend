import Modal from './Modal';
import { Trash2 } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: React.ReactNode;
  message: string;
  loading?: boolean;
}

export default function ConfirmModal({ isOpen, onClose, onConfirm, title, message, loading = false }: ConfirmModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-4">
        <p className="text-gray-700">{message}</p>
        <div className="flex gap-3 pt-4">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-3 rounded-lg transition"
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition"
            disabled={loading}
          >
            {loading ? 'Eliminando...' : <span className="inline-flex items-center gap-2"><Trash2 size={16} /> Confirmar eliminación</span>}
          </button>
        </div>
      </div>
    </Modal>
  );
}
