import { useState, useEffect, useRef } from 'react';
import { ShoppingCart, Clock, Trash2, Check, Hourglass } from 'lucide-react';

interface CartTicket {
  id: number;
  number: number;
}

interface CartData {
  id: number;
  total_price: string;
  tickets: CartTicket[];
  raffle: { ticket_price: string };
}

interface PendingOrderData {
  id: number;
  total_price: string;
  confirmed_at: string;
  tickets: { id: number; number: number }[];
  raffle: { ticket_price: string };
}

interface CartProps {
  cart: CartData | null;
  pendingOrder: PendingOrderData | null;
  remainingSeconds: number;
  onRemove: (ticketId: number) => void;
  onConfirm: () => void;
  onExpire: () => void;
  loading: boolean;
}

function CountdownTimer({ endTime, warningMessage, onExpire }: { endTime: number; warningMessage: string; onExpire?: () => void }) {
  const calcRemaining = () => Math.max(0, Math.floor((endTime - Date.now()) / 1000));
  const [timeLeft, setTimeLeft] = useState(calcRemaining);
  const expiredRef = useRef(calcRemaining() <= 0);

  useEffect(() => {
    expiredRef.current = false;
    const remaining = calcRemaining();
    setTimeLeft(remaining);
    if (remaining <= 0) {
      return;
    }
    const id = setInterval(() => {
      const diff = calcRemaining();
      setTimeLeft(diff);
      if (diff <= 0 && !expiredRef.current) {
        expiredRef.current = true;
        onExpire?.();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [endTime, onExpire]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-green-50 rounded-lg p-3 mb-4 text-center">
      <p className="text-sm text-green-600 font-semibold inline-flex items-center gap-1"><Clock className="text-green-500" size={16} /> {warningMessage}</p>
      <p className={`text-2xl font-bold font-mono ${timeLeft < 120 ? 'text-red-600 animate-pulse' : 'text-green-700'}`}>
        {formatTime(timeLeft)}
      </p>
    </div>
  );
}

export default function Cart({ cart, pendingOrder, remainingSeconds, onRemove, onConfirm, onExpire, loading }: CartProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [cartEndTime, setCartEndTime] = useState(() => Date.now() + remainingSeconds * 1000);

  useEffect(() => {
    setCartEndTime(Date.now() + remainingSeconds * 1000);
  }, [remainingSeconds]);

  if (pendingOrder) {
    const confirmedAt = new Date(pendingOrder.confirmed_at).getTime();
    const countdownEnd = confirmedAt + 15 * 60 * 1000;

    return (
      <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-yellow-300">
        <h2 className="text-xl font-bold text-gray-800 mb-4 inline-flex items-center gap-2"><ShoppingCart className="text-green-600" size={22} /> Compra confirmada</h2>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4 text-center">
          <p className="font-semibold text-yellow-800 inline-flex items-center gap-2"><Hourglass size={20} /> Espera... el Admin está corroborando tu pago!</p>
        </div>
        <CountdownTimer endTime={countdownEnd} warningMessage="Tiempo restante para validación del Admin" />
        <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
          {pendingOrder.tickets.map((ticket) => (
            <div key={ticket.id} className="flex items-center justify-between bg-yellow-50 rounded-lg px-4 py-2">
              <span className="font-bold text-lg text-gray-800">N° {ticket.number}</span>
              <span className="text-yellow-700 text-sm font-semibold inline-flex items-center gap-1"><Hourglass size={16} /> Pendiente</span>
            </div>
          ))}
        </div>
        <div className="border-t border-gray-200 pt-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-600">Números: {pendingOrder.tickets.length}</span>
            <span className="text-gray-600">Precio unidad: ${pendingOrder.raffle?.ticket_price ?? '-'}</span>
          </div>
          <div className="flex justify-between items-center text-xl font-bold">
            <span className="text-gray-800">Total</span>
            <span className="text-green-700">${parseFloat(pendingOrder.total_price).toLocaleString('es-AR')}</span>
          </div>
        </div>
      </div>
    );
  }

  if (!cart || cart.tickets.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4 inline-flex items-center gap-2"><ShoppingCart className="text-green-600" size={22} /> Tu carrito</h2>
        <p className="text-gray-500 text-center py-8">Selecciona números del tablero</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4 inline-flex items-center gap-2"><ShoppingCart className="text-green-600" size={22} /> Tu carrito</h2>
      <CountdownTimer endTime={cartEndTime} warningMessage="Tiempo restante para confirmar" onExpire={onExpire} />
      <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
        {cart.tickets.map((ticket) => (
          <div key={ticket.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2">
            <span className="font-bold text-lg text-gray-800">N° {ticket.number}</span>
            <button onClick={() => onRemove(ticket.id)} className="text-red-500 hover:text-red-700 text-sm font-semibold inline-flex items-center gap-1"><Trash2 size={16} /> Quitar</button>
          </div>
        ))}
      </div>
      <div className="border-t border-gray-200 pt-4 mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-600">Números: {cart.tickets.length}</span>
            <span className="text-gray-600">Precio unidad: ${cart.raffle?.ticket_price ?? '-'}</span>
        </div>
        <div className="flex justify-between items-center text-xl font-bold">
          <span className="text-gray-800">Total</span>
          <span className="text-green-700">${parseFloat(cart.total_price).toLocaleString('es-AR')}</span>
        </div>
      </div>
      <button onClick={() => setShowConfirm(true)} disabled={loading} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition disabled:opacity-50">
        {loading ? 'Confirmando...' : <span className="inline-flex items-center gap-2"><Check size={18} /> Confirmar Compra</span>}
      </button>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowConfirm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-gray-800 mb-2">¿Confirmar compra?</h3>
            <p className="text-gray-600 mb-4">
              Vas a comprar <strong>{cart.tickets.length} número{cart.tickets.length !== 1 ? 's' : ''}</strong> por <strong>${parseFloat(cart.total_price).toLocaleString('es-AR')}</strong>.
              Una vez confirmado, el administrador validará el pago.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirm(false)} className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 rounded-lg transition">
                Cancelar
              </button>
              <button onClick={() => { setShowConfirm(false); onConfirm(); }} className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded-lg transition">
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
