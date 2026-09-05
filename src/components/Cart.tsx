import { useState, useEffect, useRef } from 'react';
import { ShoppingCart, Clock, Trash2, Check, Hourglass, X } from 'lucide-react';

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
  
  const [isOpen, setIsOpen] = useState(false);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: window.innerWidth - 80, y: window.innerHeight - 100 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const initPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    setCartEndTime(Date.now() + remainingSeconds * 1000);
  }, [remainingSeconds]);

  useEffect(() => {
    pos.current = { x: Math.max(20, window.innerWidth - 80), y: Math.max(20, window.innerHeight - 100) };
    if (bubbleRef.current) {
      bubbleRef.current.style.transform = `translate3d(${pos.current.x}px, ${pos.current.y}px, 0)`;
    }
    const handleResize = () => {
      pos.current.x = Math.max(0, Math.min(pos.current.x, window.innerWidth - 70));
      pos.current.y = Math.max(0, Math.min(pos.current.y, window.innerHeight - 70));
      if (bubbleRef.current) {
        bubbleRef.current.style.transform = `translate3d(${pos.current.x}px, ${pos.current.y}px, 0)`;
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    isDragging.current = false;
    dragStart.current = { x: e.clientX, y: e.clientY };
    initPos.current = { ...pos.current };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) isDragging.current = true;
    
    if (isDragging.current) {
       pos.current.x = Math.max(0, Math.min(initPos.current.x + dx, window.innerWidth - 70));
       pos.current.y = Math.max(0, Math.min(initPos.current.y + dy, window.innerHeight - 70));
       if (bubbleRef.current) {
          bubbleRef.current.style.transform = `translate3d(${pos.current.x}px, ${pos.current.y}px, 0)`;
       }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const handleClick = () => {
    if (!isDragging.current) setIsOpen(true);
  };

  // Open if items get added from outside
  useEffect(() => {
    if (cart && cart.tickets.length > 0) setIsOpen(true);
    if (pendingOrder) setIsOpen(true);
  }, [cart?.tickets.length, pendingOrder?.id]);

  const itemCount = pendingOrder ? pendingOrder.tickets.length : (cart ? cart.tickets.length : 0);

  const Bubble = (
    <div
      ref={bubbleRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onClick={handleClick}
      className={`fixed top-0 left-0 z-40 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 rounded-full p-4 shadow-xl shadow-black/20 cursor-grab active:cursor-grabbing touch-none transition-colors group`}
      style={{ willChange: 'transform' }}
    >
      <ShoppingCart size={32} className="group-hover:scale-105 transition-transform" />
      {itemCount > 0 && (
         <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
           {itemCount}
         </span>
      )}
    </div>
  );

  if (!isOpen) {
    // Only show bubble if we have items or empty cart icon doesn't take much space. 
    // Usually even empty cart bubble is good for a consistent UX.
    return Bubble;
  }

  // Inside Modal Renderer
  let modalContent;
  
  if (pendingOrder) {
    const confirmedAt = new Date(pendingOrder.confirmed_at).getTime();
    const countdownEnd = confirmedAt + 15 * 60 * 1000;
    modalContent = (
      <>
        <h2 className="text-xl font-bold text-gray-800 mb-4 inline-flex items-center gap-2"><ShoppingCart className="text-green-600" size={22} /> Compra confirmada</h2>
        <div className="bg-white/80 border border-amber-200 rounded-lg p-4 mb-4 text-center">
          <p className="font-semibold text-yellow-800 inline-flex items-center gap-2"><Hourglass size={20} /> Espera... el Admin está corroborando tu pago!</p>
        </div>
        <CountdownTimer endTime={countdownEnd} warningMessage="Tiempo restante para validación del Admin" />
        <div className="space-y-2 mb-4 max-h-[40vh] overflow-y-auto pr-1">
          {pendingOrder.tickets.map((ticket) => (
            <div key={ticket.id} className="flex items-center justify-between bg-white rounded-lg px-4 py-2 shadow-sm border border-amber-50">
              <span className="font-bold text-lg text-gray-800">N° {ticket.number}</span>
              <span className="text-yellow-600 text-sm font-semibold inline-flex items-center gap-1"><Hourglass size={16} /> Pendiente</span>
            </div>
          ))}
        </div>
        <div className="border-t border-amber-200 pt-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-600 font-medium">Números: {pendingOrder.tickets.length}</span>
            <span className="text-gray-600 font-medium">Precio unidad: ${pendingOrder.raffle?.ticket_price ?? '-'}</span>
          </div>
          <div className="flex justify-between items-center text-xl font-bold">
            <span className="text-gray-800">Total</span>
            <span className="text-green-600">${parseFloat(pendingOrder.total_price).toLocaleString('es-AR')}</span>
          </div>
        </div>
      </>
    );
  } else if (!cart || cart.tickets.length === 0) {
    modalContent = (
      <>
        <h2 className="text-xl font-bold text-gray-800 mb-4 inline-flex items-center gap-2"><ShoppingCart className="text-green-600" size={22} /> Tu carrito</h2>
        <p className="text-gray-500 font-medium text-center py-12">No has seleccionado ningún número del tablero por ahora.</p>
      </>
    );
  } else {
    modalContent = (
      <>
        <h2 className="text-xl font-bold text-gray-800 mb-4 inline-flex items-center gap-2"><ShoppingCart className="text-green-600" size={22} /> Tu carrito</h2>
        <CountdownTimer endTime={cartEndTime} warningMessage="Tiempo restante para confirmar" onExpire={onExpire} />
        <div className="space-y-2 mb-4 max-h-[40vh] overflow-y-auto pr-1">
          {cart.tickets.map((ticket) => (
            <div key={ticket.id} className="flex items-center justify-between bg-white rounded-lg px-4 py-3 shadow-sm border border-amber-100">
              <span className="font-bold text-xl text-gray-800 w-16">N° {ticket.number}</span>
              <button onClick={() => onRemove(ticket.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg text-sm font-semibold inline-flex items-center gap-1 transition-colors"><Trash2 size={18} /> Quitar</button>
            </div>
          ))}
        </div>
        <div className="border-t border-amber-200 pt-4 mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-600 font-medium">Números: {cart.tickets.length}</span>
            <span className="text-gray-600 font-medium">Precio unidad: ${cart.raffle?.ticket_price ?? '-'}</span>
          </div>
          <div className="flex justify-between items-center text-2xl font-bold">
            <span className="text-gray-800">Total</span>
            <span className="text-green-600">${parseFloat(cart.total_price).toLocaleString('es-AR')}</span>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setIsOpen(false)} className="flex-1 bg-yellow-300 hover:bg-yellow-400 text-yellow-900 font-bold py-3 text-base sm:text-lg rounded-xl transition shadow-sm">
            Elegir otro
          </button>
          <button onClick={() => setShowConfirm(true)} disabled={loading} className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 text-base sm:text-lg rounded-xl transition disabled:opacity-50 shadow-md shadow-green-600/20">
            {loading ? 'Cargando...' : <span className="inline-flex items-center justify-center gap-2"><Check size={20} /> Aceptar</span>}
          </button>
        </div>

        {showConfirm && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowConfirm(false)}>
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-xl font-bold text-gray-800 mb-2">¿Confirmar compra?</h3>
              <p className="text-gray-600 mb-6 text-lg">
                Vas a comprar <strong>{cart.tickets.length} número{cart.tickets.length !== 1 ? 's' : ''}</strong> por <strong>${parseFloat(cart.total_price).toLocaleString('es-AR')}</strong>.
                Una vez confirmado, el administrador validará el pago.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setShowConfirm(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-3 rounded-xl transition">
                  Cancelar
                </button>
                <button onClick={() => { setShowConfirm(false); setIsOpen(false); onConfirm(); }} className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-green-600/30 transition">
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      {Bubble}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 sm:p-6" onClick={() => setIsOpen(false)}>
        <div className="bg-gradient-to-br from-yellow-50 via-orange-50 to-amber-100 rounded-2xl shadow-2xl p-6 w-full max-w-md mx-auto relative flex flex-col max-h-full border border-white/60" onClick={(e) => e.stopPropagation()}>
           <button onClick={() => setIsOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition p-1 hover:bg-black/5 rounded-full">
             <X size={24} />
           </button>
           {modalContent}
        </div>
      </div>
    </>
  );
}

