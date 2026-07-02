import { useEffect, useState, type FormEvent } from 'react';
import api from '../lib/api';
import Modal from './Modal';
import { Pencil } from 'lucide-react';

interface Raffle {
  id: number;
  name: string;
  start_time: string;
  end_time: string;
  ticket_price: string;
  prizes_count: number;
  prizes: { description: string }[];
  cart_expiry_minutes?: number;
}

interface EditRaffleModalProps {
  isOpen: boolean;
  onClose: () => void;
  raffle: Raffle | null;
  onSave: () => void;
}

export default function EditRaffleModal({ isOpen, onClose, raffle, onSave }: EditRaffleModalProps) {
  const [form, setForm] = useState<{ name: string; ticket_price: string; start_time: string; end_time: string; prizes_count: string; cart_expiry_minutes: string; prizes: string[] }>({
    name: '',
    ticket_price: '',
    start_time: '',
    end_time: '',
    prizes_count: '1',
    cart_expiry_minutes: '5',
    prizes: [''],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (raffle) {
      setForm({
        name: raffle.name,
        ticket_price: raffle.ticket_price,
        start_time: raffle.start_time.replace('Z', '').split('.')[0],
        end_time: raffle.end_time.replace('Z', '').split('.')[0],
        prizes_count: String(raffle.prizes_count),
        cart_expiry_minutes: String(raffle.cart_expiry_minutes ?? 5),
        prizes: raffle.prizes?.map((p: { description: string }) => p.description) ?? Array(raffle.prizes_count).fill(''),
      });
      setError('');
    }
  }, [raffle]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!raffle) return;
    setLoading(true);
    setError('');
    try {
      await api.put(`/raffles/${raffle.id}`, { ...form, prizes: form.prizes.map(p => ({ description: p })) });
      onSave();
      onClose();
    } catch (err: unknown) {
      const apiErr = err as { data?: { message?: string } };
      setError(apiErr.data?.message || 'Error al actualizar sorteo');
    }
    setLoading(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={<span className="inline-flex items-center gap-2"><Pencil className="text-green-600" size={20} /> Editar sorteo</span>}>
      <form onSubmit={handleSubmit}>
        {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4">{error}</div>}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre del sorteo</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 outline-none focus:border-green-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Precio por número</label>
            <input
              type="number"
              step="0.01"
              value={form.ticket_price}
              onChange={(e) => setForm({ ...form, ticket_price: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 outline-none focus:border-green-500"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Desde (inicio)</label>
              <input
                type="datetime-local"
                value={form.start_time}
                onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 outline-none focus:border-green-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Hasta (fin)</label>
              <input
                type="datetime-local"
                value={form.end_time}
                onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 outline-none focus:border-green-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Cantidad de premios</label>
            <select
              value={form.prizes_count}
              onChange={(e) => {
                const count = parseInt(e.target.value);
                setForm(prev => ({
                  ...prev,
                  prizes_count: e.target.value,
                  prizes: Array.from({ length: count }, (_, i) => prev.prizes[i] || ''),
                }));
              }}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 outline-none focus:border-green-500 bg-white"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <option key={n} value={n}>{n} {n === 1 ? 'premio' : 'premios'}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Array.from({ length: parseInt(form.prizes_count) }, (_, i) => (
              <div key={i}>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Describí premio {i + 1}</label>
                <input type="text" value={form.prizes[i] || ''} onChange={(e) => {
                  const next = [...form.prizes];
                  next[i] = e.target.value;
                  setForm({ ...form, prizes: next });
                }} placeholder={i === 0 ? 'Ej: 1 batidora' : i === 1 ? 'Ej: colchón 2 plazas' : `Descripción premio ${i + 1}`} className="w-full px-4 py-2 rounded-lg border border-gray-300 outline-none focus:border-green-500" />
              </div>
            ))}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Tiempo en carrito (minutos)</label>
            <input
              type="number"
              min={1}
              max={60}
              value={form.cart_expiry_minutes}
              onChange={(e) => setForm({ ...form, cart_expiry_minutes: e.target.value })}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 outline-none focus:border-green-500"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-3 rounded-lg transition"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition"
              disabled={loading}
            >
              {loading ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
