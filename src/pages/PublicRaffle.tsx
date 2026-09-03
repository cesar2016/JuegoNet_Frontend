import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader, Target, Eye, LogIn, Gift } from 'lucide-react';
import api from '../lib/api';
import { getEcho } from '../lib/echo';
import SuperCountdown from '../components/SuperCountdown';
import BoardGrid from '../components/BoardGrid';
import Modal from '../components/Modal';

interface Raffle { id: number; name: string; start_time: string; end_time: string; ticket_price: string; max_number?: number; prizes?: { description: string }[]; }
interface Ticket { id: number; number: number; status: string; user_id: number | null; user: { name: string; avatar: string | null } | null; }

export default function PublicRaffle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [raffle, setRaffle] = useState<Raffle | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPrizes, setShowPrizes] = useState(false);

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

  const handleSelectNumber = () => {
    // Alerta que debe iniciar sesión
    if (window.confirm('Debes iniciar sesión para elegir un número. ¿Ir a iniciar sesión?')) {
      navigate(`/?redirect=/dashboard?raffle=${id}`);
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
        <button 
          onClick={() => navigate(`/?redirect=/dashboard?raffle=${id}`)}
          className="bg-white text-green-700 px-4 py-2 rounded-lg font-bold shadow hover:bg-gray-100 flex items-center gap-2"
        >
          <LogIn size={18} /> Iniciar Sesión para Jugar
        </button>
      </div>

      <div className="mb-6"><SuperCountdown startTime={raffle.start_time} endTime={raffle.end_time} title={raffle.name} /></div>

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
          readOnly={false} // Se deja false para que de la alerta de iniciar sesion al tocar
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
    </div>
  );
}
