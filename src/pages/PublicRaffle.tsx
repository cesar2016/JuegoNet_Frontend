import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader, Target, Eye, LogIn, Gift, X } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import api from '../lib/api';
import { getEcho } from '../lib/echo';
import SuperCountdown from '../components/SuperCountdown';
import BoardGrid from '../components/BoardGrid';
import Modal from '../components/Modal';

interface Raffle { id: number; name: string; start_time: string; end_time: string; ticket_price: string; max_number?: number; admin_id?: number | null; is_active?: boolean; drawn_at?: string | null; prizes?: { description: string }[]; }
interface Ticket { id: number; number: number; status: string; user_id: number | null; user: { name: string; avatar: string | null } | null; }

export default function PublicRaffle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [raffle, setRaffle] = useState<Raffle | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPrizes, setShowPrizes] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginCode, setLoginCodeInput] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const { loginCode: authLoginCode, logout } = useAuth();

  useEffect(() => {
    const fetchBoard = async () => {
      try {
        setLoading(true);
        const res = await api.get<{ raffle: Raffle; tickets: Ticket[] }>(`/public/raffles/${id}/board`);
        setRaffle(res.raffle);
        setTickets(res.tickets);
      } catch (err) {
        setError('No se pudo encontrar el sorteo o no está disponible.');
      } finally {
        setLoading(false);
      }
    };
    fetchBoard();
  }, [id]);

  useEffect(() => {
    if (!raffle) return;
    const echo = getEcho();
    echo.channel(`raffle.${raffle.id}`);
    
    const handler = (eventName: string, data: any) => {
      if (eventName !== 'TicketStatusChanged' || data.raffle_id !== raffle.id) return;
      setTickets(prev => prev.map(t =>
        t.id === data.id
          ? { ...t, status: data.status, user_id: data.user_id, user: data.user }
          : t
      ));
    };
    echo.connector.pusher.bind_global(handler);
    return () => { echo.connector.pusher.unbind_global(handler); };
  }, [raffle]);

  const isFinished = raffle && (raffle.is_active === false || !!raffle.drawn_at || new Date(raffle.end_time) < new Date());

  const handleSelectNumber = () => {
    if (isFinished) return;
    setShowLoginModal(true);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    try {
      const user = await authLoginCode(loginCode);
      if (user.role === 'user' && user.admin_id && raffle?.admin_id && user.admin_id !== raffle.admin_id) {
        logout();
        setLoginError('Este código pertenece a otro evento u organizador. No puedes jugar aquí.');
        return;
      }
      navigate(`/dashboard?raffle=${raffle?.id}`);
    } catch (err: unknown) {
      const apiErr = err as { data?: { message?: string } };
      setLoginError(apiErr.data?.message || 'Código inválido.');
    } finally {
      setLoginLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white text-xl">
        <Loader className="animate-spin mr-2" /> Cargando sorteo...
      </div>
    );
  }

  if (error || !raffle) {
    return (
      <div className="min-h-screen py-10 px-4">
        <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg p-6 text-center">
          <p className="text-red-500 font-semibold mb-4">{error}</p>
          <button onClick={() => navigate('/')} className="bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700">
            Ir al inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-6 px-4 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-white text-3xl font-black italic truncate">JuegaNet</h1>
      </div>

      {isFinished && (
        <div className="mb-6 bg-red-600 border border-red-400 text-white p-4 rounded-xl shadow-lg flex items-center justify-center font-bold text-lg text-center animate-pulse">
          ¡ESTE SORTEO YA FINALIZÓ!
        </div>
      )}

      <div className="mb-6">
        {isFinished ? (
          <div className="bg-black/40 backdrop-blur-md rounded-xl p-6 text-center shadow-lg border border-white/10">
            <h2 className="text-white font-bold text-2xl truncate mb-2">{raffle.name}</h2>
            <p className="text-white/80 font-semibold uppercase tracking-widest text-sm">Sorteo Cerrado</p>
          </div>
        ) : (
          <SuperCountdown startTime={raffle.start_time} endTime={raffle.end_time} title={raffle.name} />
        )}
      </div>

      <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 md:p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white text-xl font-bold inline-flex items-center gap-2">
            <Target size={20} /> Tablero de números
            <span className="text-sm font-normal text-white/80 ml-2 bg-black/20 px-2 py-1 rounded-full"><Eye size={14} className="inline mr-1" /> Modo Observador Público</span>
          </h2>
          {raffle.prizes && raffle.prizes.length > 0 && (
            <button onClick={() => setShowPrizes(true)} className="inline-flex items-center gap-1 text-sm font-bold text-yellow-300 hover:text-yellow-100 transition-colors uppercase">
              <Gift size={16} /> Ver premios
            </button>
          )}
        </div>
        
        <BoardGrid 
          tickets={tickets} 
          currentUserId={null} 
          onSelectNumber={handleSelectNumber} 
          loading={loading} 
          readOnly={!!isFinished}
          maxNumber={raffle.max_number ?? 99} 
        />
      </div>

      <Modal isOpen={showPrizes} onClose={() => setShowPrizes(false)} title={<span className="inline-flex items-center gap-2"><Gift className="text-yellow-500" size={22} /> Premios del sorteo</span>}>
          <div className="space-y-4">
            {raffle?.prizes?.map((p, i) => (
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
            {(!raffle?.prizes || raffle.prizes.length === 0) && (
              <p className="text-gray-500 text-center py-8">No se configuraron premios para este sorteo.</p>
            )}
          </div>
        </Modal>

        {showLoginModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 overflow-y-auto" onClick={() => !loginLoading && setShowLoginModal(false)}>
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm relative my-8" onClick={e => e.stopPropagation()}>
              <button onClick={() => setShowLoginModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10 transition">
                <X size={24} />
              </button>
              <h2 className="text-xl font-bold text-gray-800 mb-6 pr-8">Ingresar para Jugar</h2>
              
              {loginError && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{loginError}</div>}
              
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Código de Acceso (6 caracteres)</label>
                  <input type="text" value={loginCode} onChange={e => setLoginCodeInput(e.target.value.toUpperCase())} className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 font-mono text-center tracking-widest text-xl uppercase" placeholder="AAAAAA" maxLength={6} required autoFocus />
                </div>
                
                <button type="submit" disabled={loginLoading} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition flex justify-center items-center gap-2 disabled:opacity-50 mt-4">
                  {loginLoading ? 'Ingresando...' : <><LogIn size={20} /> Ingresar y Jugar</>}
                </button>
                <div className="text-center mt-3">
                  <span className="text-xs text-gray-500">¿Tienes un usuario con email? <button type="button" onClick={() => navigate(`/?redirect=/dashboard?raffle=${raffle?.id}`)} className="text-green-600 hover:underline">Iniciar sesión normal</button></span>
                </div>
              </form>
            </div>
          </div>
        )}

    </div>
  );
}
