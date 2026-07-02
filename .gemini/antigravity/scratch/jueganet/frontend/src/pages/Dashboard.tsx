import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import api from '../lib/api';
import { getEcho } from '../lib/echo';
import SuperCountdown from '../components/SuperCountdown';
import BoardGrid from '../components/BoardGrid';
import Cart from '../components/Cart';
import Modal from '../components/Modal';
import confetti from 'canvas-confetti';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Target, Eye, Loader, Trophy, Search, PartyPopper, Gift } from 'lucide-react';

interface Raffle { id: number; name: string; start_time: string; end_time: string; ticket_price: string; prizes_count?: number; prizes?: { description: string }[]; max_number?: number; drawn_at?: string | null; }
interface TicketUser { name: string; avatar: string | null; }
interface Ticket { id: number; number: number; status: string; user_id: number | null; user: TicketUser | null; }
interface CartData { id: number; total_price: string; tickets: { id: number; number: number }[]; raffle: { ticket_price: string }; }
interface PendingOrderData { id: number; total_price: string; confirmed_at: string; tickets: { id: number; number: number }[]; raffle: { ticket_price: string }; }
interface Winner { position: number; number: number; prize: string | null; user: { id: number; name: string; email: string; avatar: string | null } | null; }

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const showResults = searchParams.get('results') === '';
  const raffleParam = searchParams.get('raffle');
  const [selectedRaffle, setSelectedRaffle] = useState<Raffle | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [cart, setCart] = useState<CartData | null>(null);
  const [pendingOrder, setPendingOrder] = useState<PendingOrderData | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [finishedRaffles, setFinishedRaffles] = useState<Raffle[]>([]);
  const [selectedFinished, setSelectedFinished] = useState<Raffle | null>(null);
  const [winners, setWinners] = useState<Winner[]>([]);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [showPrizes, setShowPrizes] = useState(false);

  // DEBUG: log tickets state changes
  useEffect(() => {
    const selected = tickets.filter(t => t.status !== 'available');
    if (selected.length > 0) console.log('[Dashboard] Tickets changed — selected count:', selected.length, 'ticket ids:', selected.map(t => `${t.number}=${t.status}`));
  }, [tickets]);
  const fmtDate = (d: Date) => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  const [dateFrom, setDateFrom] = useState(fmtDate(new Date(Date.now() - 48 * 60 * 60 * 1000)));
  const [dateTo, setDateTo] = useState(fmtDate(new Date()));

  const fetchFinished = useCallback(async () => {
    try {
      const params = new URLSearchParams({ from: dateFrom, to: dateTo });
      const finished = await api.get<Raffle[]>(`/raffles/finished?${params}`);
      setFinishedRaffles(finished);
      if (finished.length > 0) {
        handleViewResults(finished[0]);
      } else {
        setSelectedFinished(null);
        setWinners([]);
      }
    } catch { /* ignore */ }
  }, [dateFrom, dateTo]);

  const isAdmin = user?.role === 'super_admin' || user?.role === 'admin';

  useEffect(() => {
    if (!pendingOrder || !selectedRaffle || !user) return;
    console.log('[Dashboard] Subscribing to user channel:', `user.${user.id}`, 'for order:', pendingOrder.id);
    const echo = getEcho();
    echo.private(`user.${user.id}`);
    const handler = (eventName: string, e: { order_id: number; status: string }) => {
      if (eventName !== 'OrderStatusChanged' || e.order_id !== pendingOrder.id) return;
      console.log('[Dashboard] OrderStatusChanged received:', e);
      if (e.status !== 'pending_admin') {
        loadRaffle(selectedRaffle);
        if (e.status === 'sold') {
          toast.success('¡Pago confirmado por el administrador!');
        } else if (e.status === 'rejected') {
          toast.error('Pago rechazado por el administrador.');
        }
      }
    };
    echo.connector.pusher.bind_global(handler);
    return () => { echo.connector.pusher.unbind_global(handler); };
  }, [pendingOrder, selectedRaffle, user]);

  useEffect(() => {
    if (!selectedRaffle || showResults) return;
    const echo = getEcho();
    const currentRaffleId = selectedRaffle.id;

    // Ensure subscription (Echo deduplicates)
    echo.private(`raffle.${currentRaffleId}`);

    const handler = (eventName: string, data: { id: number; raffle_id: number; number: number; status: string; user_id: number | null; user: { name: string; avatar: string | null } | null }) => {
      if (eventName !== 'TicketStatusChanged' || data.raffle_id !== currentRaffleId) return;
      console.log('[Dashboard] TicketStatusChanged received:', data);
      setTickets(prev => prev.map(t =>
        t.id === data.id
          ? { ...t, status: data.status, user_id: data.user_id, user: data.user }
          : t
      ));
    };
    echo.connector.pusher.bind_global(handler);
    return () => { echo.connector.pusher.unbind_global(handler); };
  }, [selectedRaffle, showResults]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/'); return; }
    const init = async () => {
      setLoading(true);
      try {
        const list = await api.get<Raffle[]>('/raffles');
        if (showResults) {
          await fetchFinished();
        } else {
          const targetId = raffleParam ? Number(raffleParam) : null;
          const target = targetId ? list.find((r) => r.id === targetId) : list[0];
          if (target) {
            await loadRaffle(target);
          } else {
            setError('No hay sorteos activos en este momento.');
          }
        }
      } catch {
        setError('No hay sorteos activos en este momento.');
      }
      setLoading(false);
    };
    init();
  }, [user, authLoading, navigate, showResults, raffleParam]);

  const loadRaffle = async (r: Raffle) => {
    setSelectedRaffle(r);
    setLoading(true);
    setError('');
    setPendingOrder(null);
    try {
      const boardData = await api.get<{ raffle: Raffle; tickets: Ticket[] }>(`/raffles/${r.id}/board`);
      setTickets(boardData.tickets);
      if (!isAdmin) {
        const cartData = await api.get<{ cart: CartData | null; remaining_seconds: number }>(`/cart?raffle_id=${r.id}`);
        setCart(cartData.cart);
        setRemainingSeconds(cartData.remaining_seconds);
        if (!cartData.cart) {
          const myOrders = await api.get<({ status: string; raffle_id: number } & PendingOrderData)[]>('/my-orders');
          const pending = myOrders.find((o) => o.status === 'pending_admin' && o.raffle_id === r.id);
          if (pending) setPendingOrder(pending);
        }
      } else {
        setCart(null);
        setRemainingSeconds(0);
      }
    } catch {
      setTickets([]);
      setCart(null);
    }
    setLoading(false);
  };

  const handleViewResults = useCallback(async (r: Raffle) => {
    setSelectedFinished(r);
    setResultsLoading(true);
    try {
      const res = await api.get<{ raffle: Raffle; winners: Winner[] }>(`/raffles/${r.id}/results`);
      setWinners(res.winners);

      const userWon = res.winners.some((w) => w.user?.id === user?.id);
      if (userWon) {
        const duration = 3000;
        const end = Date.now() + duration;
        const frame = () => {
          confetti({
            particleCount: 3,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: ['#22c55e', '#eab308', '#ef4444', '#3b82f6'],
          });
          confetti({
            particleCount: 3,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: ['#22c55e', '#eab308', '#ef4444', '#3b82f6'],
          });
          if (Date.now() < end) requestAnimationFrame(frame);
        };
        frame();
      }
    } catch {
      setWinners([]);
    }
    setResultsLoading(false);
  }, [user?.id]);

  const handleSelectNumber = async (number: number) => {
    if (!selectedRaffle || isAdmin) return;
    console.log('[Dashboard] handleSelectNumber called with number:', number, 'current tickets count:', tickets.length);
    try {
      const res = await api.post<{ ticket: Ticket; cart: CartData; remaining_seconds: number }>(
        '/cart/add', { raffle_id: selectedRaffle.id, number }
      );
      console.log('[Dashboard] API success, ticket:', res.ticket, 'cart:', res.cart);
      setTickets(prev => {
        const updated = prev.map(t => t.number === number ? { ...t, status: 'in_cart', user_id: user!.id } : t);
        console.log('[Dashboard] setTickets in handleSelectNumber:', updated.filter(t => t.number === number));
        return updated;
      });
      setCart(res.cart);
      setRemainingSeconds(res.remaining_seconds);
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      console.error('[Dashboard] handleSelectNumber error:', err);
      if (apiErr.message?.includes('no está disponible')) {
        toast.warn('El número no está disponible por ahora', { position: 'top-center' });
      } else {
        setError(apiErr.message || 'Error al seleccionar el número');
      }
    }
  };

  const handleRemoveTicket = async (ticketId: number) => {
    try {
      const res = await api.delete<{ message: string; cart?: CartData }>(`/cart/remove/${ticketId}`);
      setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: 'available', user_id: null, user: null } : t));
      if (res.cart) {
        setCart(res.cart);
      } else {
        setCart(null);
        setRemainingSeconds(0);
      }
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setError(apiErr.message || 'Error al eliminar el número');
    }
  };

  const handleConfirm = async () => {
    try {
      const res = await api.post<{ message: string; order: PendingOrderData }>('/cart/confirm', { raffle_id: selectedRaffle?.id });
      setTickets(prev => prev.map(t => t.status === 'in_cart' && t.user_id === user!.id ? { ...t, status: 'pending_admin' } : t));
      setCart(null);
      setPendingOrder(res.order);
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setError(apiErr.message || 'Error al confirmar la compra');
    }
  };

  const handleCartExpire = useCallback(async () => {
    if (!selectedRaffle) return;
    setCart(null);
    setRemainingSeconds(0);
    setTickets(prev => prev.map(t => t.status === 'in_cart' && t.user_id === user!.id ? { ...t, status: 'available', user_id: null, user: null } : t));
    // Trigger backend to release expired tickets (ignore response — broadcasts handle the rest)
    api.get(`/raffles/${selectedRaffle.id}/board`).catch(() => {});
  }, [selectedRaffle, user]);

  if (authLoading) return <div className="min-h-screen bg-gradient-to-br from-green-700 via-green-600 to-emerald-700 flex items-center justify-center text-white text-xl">Cargando...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-700 via-green-600 to-emerald-700">
      <main className="max-w-7xl mx-auto px-4 py-6">
        <ToastContainer position="top-right" autoClose={3000} />
        {error && <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 rounded-lg mb-6">{error}</div>}

        {!showResults ? (
          <>
            {selectedRaffle && <div className="mb-6"><SuperCountdown startTime={selectedRaffle.start_time} endTime={selectedRaffle.end_time} title={selectedRaffle.name} /></div>}

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-3">
                <div className="bg-white/10 backdrop-blur-md rounded-xl p-4">
                  <h2 className="text-white text-xl font-bold mb-4">{selectedRaffle ? <span className="inline-flex items-center gap-2">{selectedRaffle.name}{selectedRaffle.prizes && selectedRaffle.prizes.length > 0 && <button onClick={() => setShowPrizes(true)} className="inline-flex items-center gap-1 text-sm font-normal text-yellow-300 hover:text-yellow-100 transition-colors underline decoration-yellow-300/40 hover:decoration-yellow-100/60"><Gift size={16} /> Ver premios</button>}</span> : <span className="inline-flex items-center gap-2"><Target size={20} /> Tablero de números</span>}{isAdmin && <span className="text-sm font-normal text-white/60 ml-2">· <Eye size={16} className="inline" /> Modo visita</span>}</h2>
                  {loading && tickets.length === 0 ? (
                    <div className="text-white/60 text-center py-12 inline-flex items-center gap-2"><Loader size={20} className="animate-spin" /> Cargando números...</div>
                  ) : (
                    <BoardGrid tickets={tickets} currentUserId={user?.id ?? null} onSelectNumber={handleSelectNumber} loading={loading} readOnly={isAdmin || !!pendingOrder} maxNumber={selectedRaffle?.max_number ?? 99} />
                  )}
                </div>
              </div>
              <div className="lg:col-span-1">
                {isAdmin ? (
                  <div className="bg-white rounded-xl shadow-lg p-6">
                    <h2 className="text-xl font-bold text-gray-800 mb-4 inline-flex items-center gap-2"><Eye size={22} /> Modo visita</h2>
                    <p className="text-gray-500 text-sm">Estás viendo el tablero como administrador. No podés comprar números.</p>
                  </div>
                ) : (
                  <Cart cart={cart} pendingOrder={pendingOrder} remainingSeconds={remainingSeconds} onRemove={handleRemoveTicket} onConfirm={handleConfirm} onExpire={handleCartExpire} loading={loading} />
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-2xl shadow-2xl p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 inline-flex items-center gap-2"><Trophy className="text-green-600" size={24} /> Resultados de sorteos</h2>

            <div className="flex flex-wrap items-center gap-3 mb-4">
              <div>
                <label className="block text-xs text-gray-500 font-semibold mb-1">Desde</label>
                <input type="datetime-local" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-gray-300 outline-none text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 font-semibold mb-1">Hasta</label>
                <input type="datetime-local" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-gray-300 outline-none text-sm" />
              </div>
              <button onClick={fetchFinished} className="mt-auto bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition inline-flex items-center gap-2">
                <Search size={16} /> Filtrar
              </button>
            </div>

            {finishedRaffles.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No hay sorteos finalizados en este período.</p>
            ) : (
              <div className="flex flex-wrap gap-2 mb-6">
                {finishedRaffles.map((r) => (
                  <button key={r.id} onClick={() => handleViewResults(r)}
                    className={`px-4 py-2 rounded-lg font-semibold text-sm transition ${selectedFinished?.id === r.id ? 'bg-green-600 text-white shadow-lg' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                    {r.name}
                  </button>
                ))}
              </div>
            )}

            {resultsLoading && <p className="text-gray-500">Cargando resultados...</p>}

            {!resultsLoading && selectedFinished && winners.length > 0 && (
              <div className="space-y-3">
                {winners.map((w) => {
                  const isMine = w.user?.id === user?.id;
                  return (
                    <div key={w.position} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="bg-yellow-400 text-yellow-900 w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg">{w.position}°</span>
                          <div>
                            <p className="text-lg sm:text-xl font-bold text-green-700">N° {w.number}</p>
                            <p className="text-sm text-green-600 font-semibold">{w.prize || `Premio ${w.position}`}</p>
                            <p className="text-xs text-gray-400">{selectedFinished.name}</p>
                          </div>
                        </div>
                        {isMine && (
                          <span className="text-lg sm:text-2xl font-black text-red-600 inline-flex items-center gap-2"><PartyPopper size={24} /> ¡Upi...! GANASTE</span>
                        )}
                        {w.user ? (
                          <div className="flex items-center gap-2">
                            <div className="text-right">
                              <p className="font-semibold text-gray-800">{w.user.name}</p>
                              <p className="text-sm text-gray-500">{w.user.email}</p>
                            </div>
                            {w.user.avatar ? (
                              <img src={w.user.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-green-300 flex items-center justify-center text-green-800 font-bold">{w.user.name.charAt(0).toUpperCase()}</div>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-red-600 font-semibold">Número no vendido</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {!resultsLoading && selectedFinished && winners.length === 0 && (
              <p className="text-gray-500 text-center py-4">No se encontraron resultados para este sorteo.</p>
            )}
          </div>
        )}

        <Modal isOpen={showPrizes} onClose={() => setShowPrizes(false)} title={<span className="inline-flex items-center gap-2"><Gift className="text-yellow-500" size={22} /> Premios del sorteo</span>}>
          <div className="space-y-4">
            {selectedRaffle?.prizes?.map((p, i) => (
              <div key={i} className="flex items-start gap-4 bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-xl p-4 shadow-sm">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center text-white font-bold text-sm shadow">
                  {i + 1}°
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-yellow-800 uppercase tracking-wide">Premio {i + 1}</p>
                  <p className="text-lg font-bold text-gray-800 mt-0.5 break-words">{p.description || `Premio ${i + 1}`}</p>
                </div>
                <Gift size={20} className="text-yellow-400 flex-shrink-0 mt-1" />
              </div>
            ))}
            {(!selectedRaffle?.prizes || selectedRaffle.prizes.length === 0) && (
              <p className="text-gray-500 text-center py-8">No se configuraron premios para este sorteo.</p>
            )}
          </div>
        </Modal>
      </main>
    </div>
  );
}
