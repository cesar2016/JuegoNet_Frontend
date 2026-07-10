import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import api from '../lib/api';
import { getEcho } from '../lib/echo';
import Tooltip from '../components/Tooltip';
import Switch from '../components/Switch';
import EditRaffleModal from '../components/EditRaffleModal';
import ConfirmModal from '../components/ConfirmModal';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Settings, Users, FileText, Dice5, Search, Check, X, Clock, ArrowLeft, Trophy, PenLine, Trash2, Pencil as PencilIcon, Eye, ShoppingCart, Link2, Copy, UserPlus } from 'lucide-react';

interface AllUser { id: number; name: string; email: string; whatsapp: string | null; status: string; role: string; created_at: string; email_verified_at: string | null; admin: { id: number; name: string } | null; }
interface AdminStat { id: number; name: string; email: string; role: string; last_login_at: string | null; managed_users_count: number; active_raffles_count: number; closed_raffles_count: number; }
interface PaginatedAdminStats { data: AdminStat[]; current_page: number; last_page: number; per_page: number; total: number; from: number | null; to: number | null; }
interface PaginatedUsers { data: AllUser[]; current_page: number; last_page: number; per_page: number; total: number; from: number | null; to: number | null; }
interface OrderItem { order: { id: number; total_price: string; status: string; confirmed_at: string | null; user: { name: string; email: string }; raffle: { id: number; name: string } | null; tickets: { id: number; number: number }[]; created_at: string; }; remaining_seconds: number; }
interface PaginatedOrders { data: OrderItem[]; current_page: number; last_page: number; per_page: number; total: number; from: number | null; to: number | null; }
interface Raffle { id: number; name: string; is_active: boolean; start_time: string; end_time: string; ticket_price: string; prizes_count: number; prizes: { description: string }[]; cart_expiry_minutes?: number; max_number: number; winning_numbers: number[] | null; drawn_at: string | null; admin: { id: number; name: string } | null; can_edit?: boolean; }
interface ParticipantTicket { id: number; number: number; status: string; }
interface Participant { user: { id: number; name: string; email: string; avatar: string | null; whatsapp: string | null }; tickets: ParticipantTicket[]; }
interface Winner { position: number; number: number; prize: string | null; user: { id: number; name: string; email: string; avatar: string | null; whatsapp: string | null } | null; }

export default function Admin() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'users' | 'orders' | 'raffles'>(() => (localStorage.getItem('adminTab') as 'users' | 'orders' | 'raffles') || 'users');
  const handleTabChange = (tab: 'users' | 'orders' | 'raffles') => { setActiveTab(tab); localStorage.setItem('adminTab', tab); };
  const [allUsers, setAllUsers] = useState<AllUser[]>([]);
  const [userPage, setUserPage] = useState(1);
  const [userPerPage, setUserPerPage] = useState(10);
  const [userTotalPages, setUserTotalPages] = useState(1);
  const [userTotal, setUserTotal] = useState(0);
  const [userFrom, setUserFrom] = useState<number | null>(null);
  const [userTo, setUserTo] = useState<number | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const [userDateFrom, setUserDateFrom] = useState('');
  const [userDateTo, setUserDateTo] = useState('');
  const [allOrders, setAllOrders] = useState<OrderItem[]>([]);
  const [orderPage, setOrderPage] = useState(1);
  const [orderPerPage, setOrderPerPage] = useState(10);
  const [orderTotalPages, setOrderTotalPages] = useState(1);
  const [orderTotal, setOrderTotal] = useState(0);
  const [orderFrom, setOrderFrom] = useState<number | null>(null);
  const [orderTo, setOrderTo] = useState<number | null>(null);
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('ongoing');
  const [orderSearchInput, setOrderSearchInput] = useState('');
  const [orderViewMode, setOrderViewMode] = useState<'cart' | 'pending'>('pending');
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [raffleForm, setRaffleForm] = useState<{ name: string; ticket_price: string; start_time: string; end_time: string; prizes_count: string; cart_expiry_minutes: string; max_number: string; prizes: string[] }>({ name: '', ticket_price: '', start_time: '', end_time: '', prizes_count: '1', cart_expiry_minutes: '5', max_number: '99', prizes: [''] });
  const [selectedRaffle, setSelectedRaffle] = useState<Raffle | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [winners, setWinners] = useState<Winner[] | null>(null);
  const [winningInputs, setWinningInputs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const [editRaffle, setEditRaffle] = useState<Raffle | null>(null);
  const [deleteRaffleId, setDeleteRaffleId] = useState<number | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [orderBadgeCount, setOrderBadgeCount] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [adminStats, setAdminStats] = useState<AdminStat[]>([]);
  const [adminStatPage, setAdminStatPage] = useState(1);
  const [adminStatPerPage, setAdminStatPerPage] = useState(10);
  const [adminStatTotalPages, setAdminStatTotalPages] = useState(1);
  const [adminStatTotal, setAdminStatTotal] = useState(0);
  const [adminStatFrom, setAdminStatFrom] = useState<number | null>(null);
  const [adminStatTo, setAdminStatTo] = useState<number | null>(null);
  const [adminStatSearchInput, setAdminStatSearchInput] = useState('');
  const [adminStatSearch, setAdminStatSearch] = useState('');
  const [viewAdminStats, setViewAdminStats] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [formError, setFormError] = useState('');
  const allOrdersRef = useRef(allOrders);
  const fetchDataRef = useRef<() => void>(() => {});
  const fetchAdminStatsRef = useRef<() => void>(() => {});
  const activeTabRef = useRef(activeTab);
  const viewAdminStatsRef = useRef(viewAdminStats);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const refreshBadges = useCallback(async () => {
    try {
      const [pendingRes, cartRes] = await Promise.all([
        api.get<PaginatedOrders>('/admin/orders?status=pending_admin&per_page=1'),
        api.get<PaginatedOrders>('/admin/orders?status=in_cart&per_page=1'),
      ]);
      setOrderBadgeCount(pendingRes.total + cartRes.total);
    } catch {}
  }, []);

  useEffect(() => {
    if (!user) return;
    console.log('[Admin] Subscribing to admin channel:', `admin.${user.id}`);
    refreshBadges();
    const echo = getEcho();
    echo.private(`admin.${user.id}`);

    const handler = (eventName: string, e: { type: string; data?: { order_id?: number; total_price?: string; tickets_count?: number; status?: string; deleted?: boolean } }) => {
      if (eventName !== 'AdminNotification') return;
      console.log('[Admin] AdminNotification received:', e);
      refreshBadges();
      if (e.type === 'new_pending_order' && e.data?.status === 'pending_admin') {
        if (activeTabRef.current === 'orders') fetchDataRef.current();
      }
      if (e.type === 'admin_users_updated' && activeTabRef.current === 'users') {
        fetchDataRef.current();
      }
      if (e.type === 'raffle_list_updated') {
        if (activeTabRef.current === 'raffles') fetchDataRef.current();
        if (viewAdminStatsRef.current) fetchAdminStatsRef.current();
      }
      if (e.type === 'admin_users_updated' && viewAdminStatsRef.current) {
        fetchAdminStatsRef.current();
      }
    };
    echo.connector.pusher.bind_global(handler);
    return () => { echo.connector.pusher.unbind_global(handler); };
  }, [user, activeTab]);

  // Real-time updates for "En carrito" view
  useEffect(() => {
    if (orderViewMode !== 'cart') return;
    const echo = getEcho();

    // Subscribe to all active raffle channels to receive TicketStatusChanged
    api.get<{ id: number }[]>('/raffles').then(raffles => {
      raffles.forEach(r => echo.private(`raffle.${r.id}`));
    }).catch(() => {});

    const handler = (eventName: string, data: { id: number; raffle_id: number; number: number; status: string; user_id: number | null; order_id: number | null }) => {
      if (eventName !== 'TicketStatusChanged') return;
      console.log('[Admin] TicketStatusChanged received:', data);

      if (data.status === 'in_cart' && data.order_id) {
        if (!allOrdersRef.current.some(o => o.order.id === data.order_id)) {
          fetchDataRef.current();
          return;
        }
        setAllOrders(prev => {
          const idx = prev.findIndex(o => o.order.id === data.order_id);
          if (idx === -1) return prev;
          const order = { ...prev[idx] };
          const tix = order.order.tickets.filter(t => t.id !== data.id);
          tix.push({ id: data.id, number: data.number });
          tix.sort((a, b) => a.number - b.number);
          order.order = { ...order.order, tickets: tix };
          const updated = [...prev];
          updated[idx] = order;
          return updated;
        });
      } else {
        setAllOrders(prev => {
          const idx = prev.findIndex(o => o.order.tickets.some(t => t.id === data.id));
          if (idx === -1) return prev;
          const order = { ...prev[idx] };
          const tix = order.order.tickets.filter(t => t.id !== data.id);
          if (tix.length === 0) {
            return prev.filter((_, i) => i !== idx);
          }
          order.order = { ...order.order, tickets: tix };
          const updated = [...prev];
          updated[idx] = order;
          return updated;
        });
      }
    };
    echo.connector.pusher.bind_global(handler);
    return () => { echo.connector.pusher.unbind_global(handler); };
  }, [orderViewMode]);

  useEffect(() => {
    if (activeTab !== 'orders') return;
    fetchData();
  }, [activeTab, orderPage, orderPerPage, orderSearch, orderStatusFilter, orderViewMode]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/'); return; }
    if (user.role !== 'super_admin' && user.role !== 'admin') { navigate('/dashboard'); return; }
  }, [user, authLoading, navigate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'users') {
        const params = new URLSearchParams();
        params.set('page', String(userPage));
        params.set('per_page', String(userPerPage));
        if (userSearch) params.set('q', userSearch);
        if (userStatusFilter !== 'all') {
          if (userStatusFilter === 'unverified') {
            params.set('verified', 'false');
          } else {
            params.set('status', userStatusFilter);
          }
        }
        if (userDateFrom) params.set('created_from', userDateFrom);
        if (userDateTo) params.set('created_to', userDateTo);
        const res = await api.get<PaginatedUsers>(`/admin/users?${params.toString()}`);
        setAllUsers(res.data);
        setUserTotalPages(res.last_page);
        setUserTotal(res.total);
        setUserFrom(res.from);
        setUserTo(res.to);
      } else if (activeTab === 'orders') {
        const params = new URLSearchParams();
        params.set('page', String(orderPage));
        params.set('per_page', String(orderPerPage));
        if (orderSearch) params.set('q', orderSearch);
        if (orderStatusFilter !== 'all') params.set('status', orderStatusFilter);
        const res = await api.get<PaginatedOrders>(`/admin/orders?${params.toString()}`);
        setAllOrders(res.data);
        setOrderTotalPages(res.last_page);
        setOrderTotal(res.total);
        setOrderFrom(res.from);
        setOrderTo(res.to);
      } else if (activeTab === 'raffles') {
        const res = await api.get<Raffle[]>('/admin/raffles');
        setRaffles(res);
      }
    } catch {
      toast.error('Error al cargar datos');
    }
    setLoading(false);
  };

  const fetchAdminStats = async () => {
    const params = new URLSearchParams();
    params.set('page', String(adminStatPage));
    params.set('per_page', String(adminStatPerPage));
    if (adminStatSearch) params.set('q', adminStatSearch);
    try {
      const res = await api.get<PaginatedAdminStats>(`/admin/admin-stats?${params.toString()}`);
      setAdminStats(res.data);
      setAdminStatTotalPages(res.last_page);
      setAdminStatTotal(res.total);
      setAdminStatFrom(res.from);
      setAdminStatTo(res.to);
    } catch {
      toast.error('Error al cargar estadísticas de administradores');
    }
  };

  // Keep refs in sync with latest values
  allOrdersRef.current = allOrders;
  fetchDataRef.current = fetchData;
  fetchAdminStatsRef.current = fetchAdminStats;
  activeTabRef.current = activeTab;
  viewAdminStatsRef.current = viewAdminStats;

  useEffect(() => {
    if (activeTab === 'raffles') {
      const now = new Date();
      const end = new Date(now.getTime() + 2 * 60 * 60 * 1000);
      const fmt = (d: Date) => {
        const pad = (n: number) => n.toString().padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      };
      setRaffleForm((prev) => ({
        ...prev,
        start_time: prev.start_time || fmt(now),
        end_time: prev.end_time || fmt(end),
      }));
    }
    fetchData();
  }, [activeTab]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setUserSearch(searchInput);
      setUserPage(1);
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchInput]);

  useEffect(() => {
    if (activeTab !== 'users') return;
    fetchData();
  }, [userPage, userPerPage, userSearch, userStatusFilter, userDateFrom, userDateTo]);

  useEffect(() => {
    if (!viewAdminStats) return;
    fetchAdminStats();
  }, [adminStatPage, adminStatPerPage, adminStatSearch, viewAdminStats]);

  useEffect(() => {
    if (activeTab !== 'users') return;
    api.get<{ url: string | null }>('/admin/invite/latest').then(res => {
      if (res.url) setInviteUrl(res.url);
    }).catch(() => {});
    fetchData();
  }, [activeTab, userPage, userPerPage, userSearch, userStatusFilter, userDateFrom, userDateTo]);

  const handleUserStatusFilterChange = (value: string) => {
    setUserPage(1);
    setUserStatusFilter(value);
  };

  const handleUserPerPageChange = (value: number) => {
    setUserPage(1);
    setUserPerPage(value);
  };

  const handleGenerateInvite = async () => {
    setInviteLoading(true);
    try {
      const res = await api.post<{ url: string }>('/admin/invite');
      setInviteUrl(res.url);
      setCopied(false);
    } catch {
      toast.error('Error al generar enlace');
    }
    setInviteLoading(false);
  };

  const handleCopyInvite = () => {
    if (!inviteUrl) return;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Enlace copiado al portapapeles');
  };

  const handleOrderSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setOrderPage(1);
    setOrderSearch(orderSearchInput);
  };

  const handleOrderStatusFilterChange = (value: string) => {
    setOrderPage(1);
    setOrderStatusFilter(value);
  };

  const handleOrderPerPageChange = (value: number) => {
    setOrderPage(1);
    setOrderPerPage(value);
  };

  const handleViewParticipants = async (raffle: Raffle) => {
    setLoading(true);
    setWinners(null);
    try {
      const res = await api.get<{ raffle: Raffle; participants: Participant[] }>(`/admin/raffles/${raffle.id}/participants`);
      setSelectedRaffle(res.raffle);
      setParticipants(res.participants);
      if (res.raffle.winning_numbers) {
        try {
          const r = await api.get<{ raffle: Raffle; winners: Winner[] }>(`/raffles/${raffle.id}/results`);
          setWinners(r.winners);
        } catch { setWinners([]); }
      } else {
        setWinningInputs(Array(res.raffle.prizes_count).fill(''));
      }
    } catch {
      toast.error('Error al cargar participantes');
    }
    setLoading(false);
  };

  const handleToggleBlock = async (userId: number, currentlyBlocked: boolean) => {
    try {
      if (currentlyBlocked) {
        await api.post(`/admin/users/${userId}/unblock`);
        setAllUsers((prev) => prev.map((u) => u.id === userId ? { ...u, status: 'approved' } : u));
        refreshBadges();
        toast.success('Usuario desbloqueado.');
      } else {
        await api.post(`/admin/users/${userId}/block`);
        setAllUsers((prev) => prev.map((u) => u.id === userId ? { ...u, status: 'blocked' } : u));
        refreshBadges();
        toast.success('Usuario bloqueado.');
      }
    } catch {
      toast.error('Error al cambiar estado del usuario');
    }
  };

  const handleToggleRole = async (userId: number) => {
    try {
      const res = await api.post<{ message: string; user: AllUser }>(`/admin/users/${userId}/toggle-role`);
      setAllUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: res.user.role } : u));
      toast.success(res.message);
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      toast.error(apiErr.message || 'Error al cambiar rol');
    }
  };

  const handleApproveOrder = async (orderId: number) => {
    try {
      await api.post(`/admin/orders/${orderId}/approve`);
      toast.success('Orden aprobada correctamente.');
      fetchData();
    } catch {
      toast.error('Error al aprobar orden');
    }
  };

  const handleRejectOrder = async (orderId: number) => {
    try {
      await api.post(`/admin/orders/${orderId}/reject`);
      toast.success('Orden rechazada.');
      fetchData();
    } catch {
      toast.error('Error al rechazar orden');
    }
  };

  const handleCreateRaffle = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    try {
      await api.post('/raffles', { ...raffleForm, prizes: raffleForm.prizes.map(p => ({ description: p })) });
      toast.success('Sorteo creado correctamente.');
      setRaffleForm({ name: '', ticket_price: '', start_time: '', end_time: '', prizes_count: '1', cart_expiry_minutes: '5', max_number: '99', prizes: [''] });
      fetchData();
    } catch (err: unknown) {
      const apiErr = err as { data?: { message?: string } };
      const msg = apiErr.data?.message || 'Error al crear sorteo';
      if (msg.toLowerCase().includes('fecha') || msg.toLowerCase().includes('inicio')) {
        setFormError(msg);
      } else {
        toast.error(msg);
      }
    }
  };

  const handleDeclareResults = async () => {
    if (!selectedRaffle) return;
    const nums = winningInputs.map(Number);
    if (nums.some(isNaN) || new Set(nums).size !== nums.length) {
      const maxN = selectedRaffle?.max_number ?? 99;
      toast.error(`Todos los números deben ser distintos y válidos (00-${maxN}).`);
      return;
    }
    try {
      const res = await api.post<{ message: string; raffle: Raffle; winners: Winner[] }>(`/admin/raffles/${selectedRaffle.id}/results`, { winning_numbers: nums });
      setWinners(res.winners);
      setSelectedRaffle(res.raffle);
      toast.success(res.message);
    } catch (err: unknown) {
      const apiErr = err as { data?: { message?: string } };
      toast.error(apiErr.data?.message || 'Error al declarar resultados');
    }
  };

  const handleOpenEditRaffle = (r: Raffle) => {
    setEditRaffle(r);
  };

  const handleCloseEditRaffle = () => {
    setEditRaffle(null);
  };

  const handleConfirmDeleteRaffle = async () => {
    if (!deleteRaffleId) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/admin/raffles/${deleteRaffleId}`);
      toast.success('Sorteo eliminado.');
      setDeleteRaffleId(null);
      fetchData();
    } catch (err: unknown) {
      const apiErr = err as { data?: { message?: string } };
      toast.error(apiErr.data?.message || 'Error al eliminar sorteo');
    }
    setDeleteLoading(false);
  };

  const handleOpenDeleteRaffle = (id: number) => {
    setDeleteRaffleId(id);
  };

  return (
    <>
    <div className="min-h-screen bg-gradient-to-br from-green-700 via-green-600 to-emerald-700">
      <main className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-white mb-8 inline-flex items-center gap-3"><Settings size={28} /> Panel de Administración</h1>

        <ToastContainer position="top-right" autoClose={3000} />

        <div className="flex gap-2 mb-6">
          {(['users', 'orders', 'raffles'] as const).map((tab) => (
            <button key={tab} onClick={() => handleTabChange(tab)}
              className={`flex-1 sm:flex-none px-2 sm:px-4 py-2 rounded-lg font-semibold text-xs sm:text-sm transition truncate ${activeTab === tab ? 'bg-white text-green-700 shadow-lg' : 'bg-white/20 text-white hover:bg-white/30'}`}>
              {tab === 'users' ? <span className="inline-flex items-center gap-2"><Users size={18} /> Usuarios</span> : tab === 'orders' ? <span className="inline-flex items-center gap-2 relative"><FileText size={18} /> Órdenes{orderBadgeCount > 0 && <span className="absolute -top-2 -right-3 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">{orderBadgeCount}</span>}</span> : <span className="inline-flex items-center gap-2"><Dice5 size={18} /> Sorteos</span>}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-6">
          {activeTab === 'users' && (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-800">Usuarios</h2>
                {user?.role === 'super_admin' && (
                  <button onClick={() => { setViewAdminStats(!viewAdminStats); if (!viewAdminStats) { setAdminStatPage(1); setAdminStatSearch(''); setAdminStatSearchInput(''); } }} className={`px-4 py-2 rounded-lg text-sm font-semibold transition inline-flex items-center gap-2 ${viewAdminStats ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                    {viewAdminStats ? 'Volver a usuarios' : <><Users size={16} /> Ver admins</>}
                  </button>
                )}
              </div>

              {viewAdminStats ? (
                <>
                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    <form onSubmit={(e) => { e.preventDefault(); setAdminStatPage(1); setAdminStatSearch(adminStatSearchInput); }} className="flex-1 min-w-[200px]">
                      <input type="text" value={adminStatSearchInput} onChange={(e) => setAdminStatSearchInput(e.target.value)} placeholder="Buscar por nombre, email o rol..." className="w-full px-4 py-2 rounded-lg border border-gray-300 outline-none focus:border-green-500" />
                    </form>
                    <select value={adminStatPerPage} onChange={(e) => { setAdminStatPage(1); setAdminStatPerPage(Number(e.target.value)); }} className="px-3 py-2 rounded-lg border border-gray-300 outline-none bg-white">
                      {[5, 10, 20, 30, 50, 100].map((n) => <option key={n} value={n}>{n} por pág.</option>)}
                    </select>
                    <Tooltip text="Ejecutar búsqueda">
                      <button type="button" onClick={() => { setAdminStatPage(1); setAdminStatSearch(adminStatSearchInput); }} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold transition inline-flex items-center gap-2"><Search size={16} /> Buscar</button>
                    </Tooltip>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[700px] whitespace-nowrap">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-2 font-semibold text-gray-600">Nombre</th>
                          <th className="text-left py-3 px-2 font-semibold text-gray-600">Email</th>
                          <th className="text-center py-3 px-2 font-semibold text-gray-600">Rol</th>
                          <th className="text-center py-3 px-2 font-semibold text-gray-600">Usuarios</th>
                          <th className="text-center py-3 px-2 font-semibold text-gray-600">Sorteos activos</th>
                          <th className="text-center py-3 px-2 font-semibold text-gray-600">Sorteos cerrados</th>
                          <th className="text-right py-3 px-2 font-semibold text-gray-600">Último acceso</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adminStats.map((a) => (
                          <tr key={a.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-2 font-medium text-gray-800">{a.name}</td>
                            <td className="py-3 px-2 text-gray-500">{a.email}</td>
                            <td className="py-3 px-2 text-center">
                              <span className={`text-xs px-2 py-0.5 rounded font-semibold ${a.role === 'super_admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{a.role === 'super_admin' ? 'super_admin' : 'admin'}</span>
                            </td>
                            <td className="py-3 px-2 text-center font-semibold text-gray-800">{a.managed_users_count}</td>
                            <td className="py-3 px-2 text-center font-semibold text-green-600">{a.active_raffles_count}</td>
                            <td className="py-3 px-2 text-center font-semibold text-gray-600">{a.closed_raffles_count}</td>
                            <td className="py-3 px-2 text-right text-gray-500 text-xs">{a.last_login_at ? new Date(a.last_login_at).toLocaleString('es-AR') : 'Nunca'}</td>
                          </tr>
                        ))}
                        {adminStats.length === 0 && (
                          <tr><td colSpan={7} className="text-center py-8 text-gray-500">No hay administradores.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  {adminStatTotal > 0 && <p className="text-sm text-gray-500 mt-3">{`Mostrando ${adminStatFrom}-${adminStatTo} de ${adminStatTotal} admin(s)`}</p>}
                  {adminStatTotalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-4">
                      <button onClick={() => setAdminStatPage((p) => Math.max(1, p - 1))} disabled={adminStatPage === 1} className="px-3 py-2 rounded-lg border border-gray-300 disabled:opacity-40 hover:bg-gray-100 transition shrink-0">« Anterior</button>
                      <div className="flex items-center gap-1 overflow-x-auto">
                        {(() => {
                          const pages: (number | 'ellipsis')[] = [];
                          if (adminStatTotalPages <= 7) {
                            for (let i = 1; i <= adminStatTotalPages; i++) pages.push(i);
                          } else {
                            pages.push(1);
                            if (adminStatPage > 3) pages.push('ellipsis');
                            for (let i = Math.max(2, adminStatPage - 1); i <= Math.min(adminStatTotalPages - 1, adminStatPage + 1); i++) pages.push(i);
                            if (adminStatPage < adminStatTotalPages - 2) pages.push('ellipsis');
                            pages.push(adminStatTotalPages);
                          }
                          return pages.map((p, i) =>
                            p === 'ellipsis' ? <span key={`e${i}`} className="px-1 text-gray-400">...</span> :
                            <button key={p} onClick={() => setAdminStatPage(p)} className={`px-2.5 py-1.5 rounded-lg border text-sm font-semibold transition ${p === adminStatPage ? 'bg-green-600 text-white border-green-600' : 'border-gray-300 hover:bg-gray-100 text-gray-700'}`}>{p}</button>
                          );
                        })()}
                      </div>
                      <button onClick={() => setAdminStatPage((p) => Math.min(adminStatTotalPages, p + 1))} disabled={adminStatPage === adminStatTotalPages} className="px-3 py-2 rounded-lg border border-gray-300 disabled:opacity-40 hover:bg-gray-100 transition shrink-0">Siguiente »</button>
                    </div>
                  )}
                </>
              ) : (
              <>
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <input type="text" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Búsqueda en tiempo real por nombre, email, rol..." className="flex-1 min-w-[200px] px-4 py-2 rounded-lg border border-gray-300 outline-none focus:border-green-500" />
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm text-gray-500 w-full sm:w-auto">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 w-full sm:w-auto">
                    <span>Desde</span>
                    <input type="date" value={userDateFrom} onChange={(e) => { setUserDateFrom(e.target.value); setUserPage(1); }} className="w-full px-3 py-2 rounded-lg border border-gray-300 outline-none" />
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 w-full sm:w-auto">
                    <span>Hasta</span>
                    <input type="date" value={userDateTo} onChange={(e) => { setUserDateTo(e.target.value); setUserPage(1); }} className="w-full px-3 py-2 rounded-lg border border-gray-300 outline-none" />
                  </div>
                </div>
                <select value={userStatusFilter} onChange={(e) => handleUserStatusFilterChange(e.target.value)} className="px-3 py-2 rounded-lg border border-gray-300 outline-none bg-white">
                  <option value="all">Todos los estados</option>
                  <option value="unverified">Sin verificar</option>
                  <option value="approved">Aprobados</option>
                  <option value="blocked">Bloqueados</option>
                </select>
                <select value={userPerPage} onChange={(e) => handleUserPerPageChange(Number(e.target.value))} className="px-3 py-2 rounded-lg border border-gray-300 outline-none bg-white">
                  {[5, 10, 20, 30, 50, 100].map((n) => <option key={n} value={n}>{n} por pág.</option>)}
                </select>
                <Tooltip text="Generar enlace de registro para nuevos usuarios">
                  <button type="button" onClick={handleGenerateInvite} disabled={inviteLoading} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition inline-flex items-center gap-2"><UserPlus size={16} /> {inviteLoading ? 'Generando...' : 'Crear usuario'}</button>
                </Tooltip>
              </div>
              {inviteUrl && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-3">
                  <Link2 size={18} className="text-blue-600 shrink-0" />
                  <span className="text-sm text-blue-800 break-all flex-1">{inviteUrl}</span>
                  <Tooltip text="Copiar enlace">
                    <button type="button" onClick={handleCopyInvite} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-semibold transition inline-flex items-center gap-1 shrink-0"><Copy size={14} /> {copied ? 'Copiado' : 'Copiar'}</button>
                  </Tooltip>
                </div>
              )}

              {loading ? <p className="text-gray-500">Cargando...</p> : (
                <>
                  <p className="text-sm text-gray-500 mb-3">{userTotal === 0 ? 'Sin resultados' : `Mostrando ${userFrom}-${userTo} de ${userTotal} usuario(s)`}</p>
                  {allUsers.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No se encontraron usuarios.</p>
                  ) : (
                    <div className="space-y-3">
                      {allUsers.map((u) => {
                        const cardBg = !u.email_verified_at ? 'bg-yellow-50 border border-yellow-200' : u.status === 'blocked' ? 'bg-red-50 border border-red-200' : 'bg-gray-50';
                        return (
                          <div key={u.id} className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg p-4 ${cardBg}`}>
                            <div>
                              <p className="font-semibold text-gray-800">
                                {u.name}
                                {u.role === 'super_admin' && <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded ml-1">super_admin</span>}
                                {u.role === 'admin' && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded ml-1">admin</span>}
                                {u.role === 'user' && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded ml-1">usuario</span>}
                                {u.status === 'blocked' && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded ml-1">bloqueado</span>}
                                {!u.email_verified_at && <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded ml-1">sin verificar</span>}
                              </p>
                              <p className="text-sm text-gray-500">{u.email}{u.whatsapp ? ` · ${u.whatsapp}` : ''}</p>
                              <p className="text-xs text-gray-400">Registrado: {new Date(u.created_at).toLocaleDateString('es-AR')}{u.role === 'user' && u.admin ? ` · Admin: ${u.admin.name}` : ''}</p>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              {user?.role === 'super_admin' && u.role !== 'super_admin' && (
                                <div className="flex flex-col items-center gap-0.5">
                                  <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{u.role === 'admin' ? 'admin' : 'usuario'}</span>
                                  <Switch checked={u.role === 'admin'} onChange={() => handleToggleRole(u.id)} />
                                </div>
                              )}
                              {u.status === 'blocked' ? (
                                <>
                                  <span className="text-sm font-semibold text-red-600">Bloqueado</span>
                                  <Tooltip text="Desbloquear usuario">
                                    <button onClick={() => handleToggleBlock(u.id, true)} className="bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-semibold transition">Desbloquear</button>
                                  </Tooltip>
                                </>
                              ) : (
                                <>
                                  <span className="text-sm font-semibold text-green-700">{!u.email_verified_at ? 'Sin verificar' : 'Activo'}</span>
                                  <Tooltip text="Bloquear usuario, no podrá acceder al sistema">
                                    <div className="pt-1"><Switch checked={true} onChange={() => handleToggleBlock(u.id, false)} /></div>
                                  </Tooltip>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {userTotalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-6">
                      <button onClick={() => setUserPage((p) => Math.max(1, p - 1))} disabled={userPage === 1} className="px-3 py-2 rounded-lg border border-gray-300 disabled:opacity-40 hover:bg-gray-100 transition shrink-0">« Anterior</button>
                      <div className="flex items-center gap-1 overflow-x-auto">
                        {(() => {
                          const pages: (number | 'ellipsis')[] = [];
                          if (userTotalPages <= 7) {
                            for (let i = 1; i <= userTotalPages; i++) pages.push(i);
                          } else {
                            pages.push(1);
                            if (userPage > 3) pages.push('ellipsis');
                            for (let i = Math.max(2, userPage - 1); i <= Math.min(userTotalPages - 1, userPage + 1); i++) pages.push(i);
                            if (userPage < userTotalPages - 2) pages.push('ellipsis');
                            pages.push(userTotalPages);
                          }
                          return pages.map((p, i) =>
                            p === 'ellipsis' ? <span key={`e${i}`} className="px-1 text-gray-400">...</span> :
                            <button key={p} onClick={() => setUserPage(p)} className={`px-2.5 py-1.5 rounded-lg border text-sm font-semibold transition ${p === userPage ? 'bg-green-600 text-white border-green-600' : 'border-gray-300 hover:bg-gray-100 text-gray-700'}`}>{p}</button>
                          );
                        })()}
                      </div>
                      <button onClick={() => setUserPage((p) => Math.min(userTotalPages, p + 1))} disabled={userPage === userTotalPages} className="px-3 py-2 rounded-lg border border-gray-300 disabled:opacity-40 hover:bg-gray-100 transition shrink-0">Siguiente »</button>
                    </div>
                  )}
                </>
              )}
              </>
            )}
          </>
          )}

          {activeTab === 'orders' && (
            <>
              <div className="flex gap-2 mb-4">
                <button onClick={() => { setOrderViewMode('cart'); setOrderStatusFilter('in_cart'); }}
                  className={`flex-1 sm:flex-none px-4 py-2 rounded-lg font-semibold text-sm transition ${orderViewMode === 'cart' ? 'bg-green-600 text-white shadow-lg' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                  En carrito
                </button>
                <button onClick={() => { setOrderViewMode('pending'); setOrderStatusFilter('pending_admin'); }}
                  className={`flex-1 sm:flex-none px-4 py-2 rounded-lg font-semibold text-sm transition ${orderViewMode === 'pending' ? 'bg-green-600 text-white shadow-lg' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                  Pendientes
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-3 mb-4">
                <form onSubmit={handleOrderSearchSubmit} className="flex-1 min-w-[200px]">
                  <input type="text" value={orderSearchInput} onChange={(e) => setOrderSearchInput(e.target.value)} placeholder="Buscar por usuario, email, sorteo, monto o estado..." className="w-full px-4 py-2 rounded-lg border border-gray-300 outline-none focus:border-green-500" />
                </form>
                <select value={orderStatusFilter} onChange={(e) => handleOrderStatusFilterChange(e.target.value)} className="px-3 py-2 rounded-lg border border-gray-300 outline-none bg-white">
                  <option value="all">Todas</option>
                  <option value="ongoing">En curso</option>
                  <option value="finished">Finalizadas</option>
                  <option value="pending_admin">Pendientes</option>
                  <option value="sold">Vendidas</option>
                  <option value="rejected">Rechazadas</option>
                </select>
                <select value={orderPerPage} onChange={(e) => handleOrderPerPageChange(Number(e.target.value))} className="px-3 py-2 rounded-lg border border-gray-300 outline-none bg-white">
                  {[5, 10, 20, 30, 50, 100].map((n) => <option key={n} value={n}>{n} por pág.</option>)}
                </select>
                <Tooltip text="Ejecutar búsqueda">
                  <button type="button" onClick={() => { setOrderPage(1); setOrderSearch(orderSearchInput); }} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold transition inline-flex items-center gap-2"><Search size={16} /> Buscar</button>
                </Tooltip>
              </div>

              {loading ? <p className="text-gray-500">Cargando...</p> : (
                <>
                  <p className="text-sm text-gray-500 mb-3">{orderTotal === 0 ? 'Sin resultados' : `Mostrando ${orderFrom}-${orderTo} de ${orderTotal} orden(es)`}</p>
                  {allOrders.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No se encontraron órdenes.</p>
                  ) : (
                    <div className="space-y-3">
                      {allOrders.map((item) => {
                        const status = item.order.status;
                        const cardBg = status === 'pending_admin' || status === 'in_cart' ? 'bg-yellow-50 border border-yellow-200' : status === 'sold' ? 'bg-green-50 border border-green-200' : status === 'rejected' ? 'bg-red-50 border border-red-200' : 'bg-gray-50';
                        const statusLabel = status === 'pending_admin' ? 'Pendiente de validación' : status === 'sold' ? 'Vendida' : status === 'rejected' ? 'Rechazada' : status === 'in_cart' ? 'En carrito' : status;
                        const confirmedAt = item.order.confirmed_at ? new Date(item.order.confirmed_at).getTime() : 0;
                        const remainingSecs = Math.max(0, Math.floor((confirmedAt + 15 * 60 * 1000 - now) / 1000));
                        const m = Math.floor(remainingSecs / 60);
                        const s = remainingSecs % 60;
                        const remaining = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
                        return (
                          <div key={item.order.id} className={`rounded-lg p-4 ${cardBg}`}>
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                              <div>
                                <p className="font-semibold text-gray-800">
                                  {item.order.user.name}
                                  <span className={`text-xs px-2 py-0.5 rounded ml-1 inline-flex items-center gap-1 ${status === 'pending_admin' ? 'bg-yellow-100 text-yellow-800' : status === 'in_cart' ? 'bg-yellow-100 text-black' : status === 'sold' ? 'bg-green-100 text-green-800' : status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-gray-200 text-gray-700'}`}>{status === 'in_cart' && <ShoppingCart size={12} />}{statusLabel}</span>
                                </p>
                                <p className="text-sm text-gray-500">{item.order.user.email}{item.order.raffle ? ` · ${item.order.raffle.name}` : ''}</p>
                                <p className="text-xs text-gray-400">Creada: {new Date(item.order.created_at).toLocaleString('es-AR')}{item.order.confirmed_at ? ` · Confirmada: ${new Date(item.order.confirmed_at).toLocaleString('es-AR')}` : ''}</p>
                               </div>
                               <div className="text-right">
                                 <p className="text-xl font-bold text-green-700">${parseFloat(item.order.total_price).toLocaleString('es-AR')}</p>
                                  {status === 'pending_admin' && <p className={`text-lg font-bold font-mono ${remainingSecs < 120 ? 'text-red-600' : 'text-gray-700'} inline-flex items-center gap-2`}><Clock size={20} className={remainingSecs < 120 ? 'text-red-500' : 'text-gray-500'} /> {remaining}</p>}
                               </div>
                            </div>
                            <div className="flex flex-wrap gap-1 mb-3">
                              {item.order.tickets.map((t) => <span key={t.id} className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-semibold">N° {t.number}</span>)}
                            </div>
                            {status === 'pending_admin' && (
                              <div className="flex gap-2">
                                <button onClick={() => handleApproveOrder(item.order.id)} className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition inline-flex items-center gap-1"><Check size={16} /> Aprobar pago</button>
                                <button onClick={() => handleRejectOrder(item.order.id)} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition inline-flex items-center gap-1"><X size={16} /> Rechazar</button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {orderTotalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-6">
                      <button onClick={() => setOrderPage((p) => Math.max(1, p - 1))} disabled={orderPage === 1} className="px-3 py-2 rounded-lg border border-gray-300 disabled:opacity-40 hover:bg-gray-100 transition shrink-0">« Anterior</button>
                      <div className="flex items-center gap-1 overflow-x-auto">
                        {(() => {
                          const pages: (number | 'ellipsis')[] = [];
                          if (orderTotalPages <= 7) {
                            for (let i = 1; i <= orderTotalPages; i++) pages.push(i);
                          } else {
                            pages.push(1);
                            if (orderPage > 3) pages.push('ellipsis');
                            for (let i = Math.max(2, orderPage - 1); i <= Math.min(orderTotalPages - 1, orderPage + 1); i++) pages.push(i);
                            if (orderPage < orderTotalPages - 2) pages.push('ellipsis');
                            pages.push(orderTotalPages);
                          }
                          return pages.map((p, i) =>
                            p === 'ellipsis' ? <span key={`e${i}`} className="px-1 text-gray-400">...</span> :
                            <button key={p} onClick={() => setOrderPage(p)} className={`px-2.5 py-1.5 rounded-lg border text-sm font-semibold transition ${p === orderPage ? 'bg-green-600 text-white border-green-600' : 'border-gray-300 hover:bg-gray-100 text-gray-700'}`}>{p}</button>
                          );
                        })()}
                      </div>
                      <button onClick={() => setOrderPage((p) => Math.min(orderTotalPages, p + 1))} disabled={orderPage === orderTotalPages} className="px-3 py-2 rounded-lg border border-gray-300 disabled:opacity-40 hover:bg-gray-100 transition shrink-0">Siguiente »</button>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {activeTab === 'raffles' && (
            <>
              {selectedRaffle ? (
                <>
                  <div className="flex items-center gap-4 mb-6">
                    <button onClick={() => { setSelectedRaffle(null); setParticipants([]); setWinners(null); }} className="text-green-600 hover:text-green-800 font-semibold inline-flex items-center gap-1"><ArrowLeft size={18} /> Volver a sorteos</button>
                    <h2 className="text-xl font-bold text-gray-800">{selectedRaffle.name}</h2>
                    <span className="text-sm text-gray-500 ml-auto">{selectedRaffle.prizes_count} premio{selectedRaffle.prizes_count !== 1 ? 's' : ''}</span>
                  </div>

                  {selectedRaffle.drawn_at && (
                    <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
                      <h3 className="font-bold text-green-800 mb-3 inline-flex items-center gap-2"><Trophy size={20} /> Resultados - Sorteado el {new Date(selectedRaffle.drawn_at).toLocaleString('es-AR')}</h3>
                      {winners ? (
                        <div className="space-y-2">
                          {winners.map((w) => (
                            <div key={w.position} className="flex flex-wrap items-center justify-between gap-2 bg-white rounded-lg p-3">
                              <div className="flex items-center gap-2">
                                <span className="bg-yellow-400 text-yellow-900 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">{w.position}°</span>
                                <div>
                                  <span className="font-bold text-lg text-green-800">N° {w.number}</span>
                                  <p className="text-sm text-green-600 font-semibold">{w.prize || `Premio ${w.position}`}</p>
                                </div>
                              </div>
                              {w.user ? (
                                <div className="flex items-center gap-2">
                                  {w.user.avatar ? <img src={w.user.avatar} alt="" className="w-8 h-8 rounded-full object-cover" /> : <div className="w-8 h-8 rounded-full bg-green-300 flex items-center justify-center text-green-800 font-bold text-xs">{w.user.name.charAt(0).toUpperCase()}</div>}
                                  <div className="text-right">
                                    <p className="font-semibold text-gray-800 text-sm">{w.user.name}</p>
                                    <p className="text-xs text-gray-500">{w.user.email}</p>
                                  </div>
                                </div>
                              ) : <p className="text-sm text-red-600 font-semibold">Número no vendido</p>}
                            </div>
                          ))}
                        </div>
                      ) : <p className="text-green-700">Cargando resultados...</p>}
                    </div>
                  )}

                  {!selectedRaffle.drawn_at && (
                    <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
                      <h3 className="font-bold text-green-800 mb-3 inline-flex items-center gap-2"><Trophy size={20} /> Declarar resultados</h3>
                      <p className="text-sm text-green-600 mb-3">Ingresá los {selectedRaffle.prizes_count} números ganadores (del 00 al {selectedRaffle.max_number ?? 99}, distintos):</p>
                      <div className="flex flex-wrap gap-3 mb-4">
                        {winningInputs.map((val, i) => (
                          <div key={i}>
                            <label className="block text-xs text-green-600 font-semibold mb-1">N° {i + 1}</label>
                            <input type="number" min={0} max={selectedRaffle.max_number ?? 99} value={val} onChange={(e) => { const next = [...winningInputs]; next[i] = e.target.value; setWinningInputs(next); }} className="w-20 px-3 py-2 rounded-lg border border-green-300 outline-none text-center" placeholder="##" />
                          </div>
                        ))}
                      </div>
                      <Tooltip text="Registrar los números ganadores y determinar ganadores"><button onClick={handleDeclareResults} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg transition inline-flex items-center gap-2"><Trophy size={18} /> Declarar resultados</button></Tooltip>
                    </div>
                  )}

                  {loading ? (<p className="text-gray-500">Cargando...</p>) : participants.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No hay participantes en este sorteo.</p>
                  ) : (
                    <div className="space-y-4">
                      {participants.map((p) => (
                        <div key={p.user.id} className="bg-gray-50 rounded-lg p-4">
                          <div className="flex items-center gap-3 mb-3">
                            {p.user.avatar ? (
                              <img src={p.user.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-green-300 flex items-center justify-center text-green-800 font-bold">{p.user.name.charAt(0).toUpperCase()}</div>
                            )}
                            <div>
                              <p className="font-semibold text-gray-800">{p.user.name}</p>
                              <p className="text-sm text-gray-500">{p.user.email}</p>
                            </div>
                            <div className="ml-auto text-right">
                              <p className="text-sm text-gray-500">{p.tickets.length} números</p>
                              <p className="text-xs text-gray-400">{p.user.whatsapp || 'Sin WhatsApp'}</p>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {(() => {
                              const posMap = new Map<number, number>();
                              winners?.forEach((w) => posMap.set(w.number, w.position));
                              return p.tickets.map((t) => {
                                 const pos = posMap.get(t.number);
                                 const isWinner = pos !== undefined;
                                 const statusTip = t.status === 'sold' ? 'Vendido' : t.status === 'pending_admin' ? 'Esperando validación' : 'En carrito';
                                 return (
                                   <Tooltip key={t.id} text={`N° ${t.number} - ${statusTip}${isWinner ? ` 🏆 Puesto N°${pos}` : ''}`}>
                                     <span className={`relative inline-block px-2 py-1 rounded text-xs font-semibold ${isWinner ? 'bg-yellow-300 text-yellow-900 ring-2 ring-yellow-500' : t.status === 'sold' ? 'bg-green-100 text-green-800' : t.status === 'pending_admin' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                                      N° {t.number}
                                      {isWinner && <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-sky-400 text-white flex items-center justify-center text-[10px] font-bold leading-none shadow">{pos}</span>}
                                    </span>
                                  </Tooltip>
                                );
                              });
                            })()}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <h2 className="text-xl font-bold text-gray-800 mb-4 inline-flex items-center gap-2"><Dice5 className="text-green-600" size={22} /> Gestionar sorteos</h2>
                  {user?.role !== 'super_admin' && (() => {
                    const activeCount = raffles.filter((r) => r.is_active).length;
                    return (
                      <div className={`rounded-lg p-3 mb-4 text-sm font-semibold ${activeCount >= 5 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        Sorteos activos: {activeCount} / 5{activeCount >= 5 ? ' — Límite alcanzado, no se pueden activar más.' : ''}
                      </div>
                    );
                  })()}
                  {user?.role !== 'super_admin' && <form onSubmit={handleCreateRaffle} className="bg-gray-50 rounded-lg p-4 mb-6">
                    <h3 className="font-semibold text-gray-700 mb-3 inline-flex items-center gap-2"><PenLine className="text-green-600" size={20} /> Crear nuevo sorteo</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1 font-semibold">Nombre del sorteo</label>
                        <input type="text" value={raffleForm.name} onChange={(e) => setRaffleForm({ ...raffleForm, name: e.target.value })} placeholder="Ej: Sorteo del mes" className="w-full px-4 py-2 rounded-lg border border-gray-300 outline-none" required />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1 font-semibold">Precio por número</label>
                        <input type="number" step="0.01" value={raffleForm.ticket_price} onChange={(e) => setRaffleForm({ ...raffleForm, ticket_price: e.target.value })} placeholder="Ej: 500.00" className="w-full px-4 py-2 rounded-lg border border-gray-300 outline-none" required />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1 font-semibold">Exp. carrito (min)</label>
                        <input type="number" min="1" max="120" value={raffleForm.cart_expiry_minutes} onChange={(e) => setRaffleForm({ ...raffleForm, cart_expiry_minutes: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-gray-300 outline-none" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1 font-semibold">Desde (inicio)</label>
                        <input type="datetime-local" value={raffleForm.start_time} onChange={(e) => { setRaffleForm({ ...raffleForm, start_time: e.target.value }); setFormError(''); }} className={`w-full px-4 py-2 rounded-lg border outline-none ${formError ? 'border-red-500 bg-red-50' : 'border-gray-300'}`} required />
                        {formError && <p className="text-xs text-red-600 mt-1">{formError}</p>}
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1 font-semibold">Hasta (fin)</label>
                        <input type="datetime-local" value={raffleForm.end_time} onChange={(e) => setRaffleForm({ ...raffleForm, end_time: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-gray-300 outline-none" required />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1 font-semibold">Cant. de premios</label>
                        <select value={raffleForm.prizes_count} onChange={(e) => {
                          const count = parseInt(e.target.value);
                          setRaffleForm(prev => ({
                            ...prev,
                            prizes_count: e.target.value,
                            prizes: Array.from({ length: count }, (_, i) => prev.prizes[i] || ''),
                          }));
                        }} className="w-full px-4 py-2 rounded-lg border border-gray-300 outline-none bg-white">
                          {[1,2,3,4,5,6,7,8,9,10].map((n) => <option key={n} value={n}>{n} {n === 1 ? 'premio' : 'premios'}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1 font-semibold">Números (0 a ...)</label>
                        <input type="number" min="99" max="500" value={raffleForm.max_number} onChange={(e) => setRaffleForm({ ...raffleForm, max_number: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-gray-300 outline-none" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                      {Array.from({ length: parseInt(raffleForm.prizes_count) }, (_, i) => (
                        <div key={i}>
                          <label className="block text-xs text-gray-500 mb-1 font-semibold">Describí premio {i + 1}</label>
                          <input type="text" value={raffleForm.prizes[i] || ''} onChange={(e) => {
                            const next = [...raffleForm.prizes];
                            next[i] = e.target.value;
                            setRaffleForm({ ...raffleForm, prizes: next });
                          }} placeholder={i === 0 ? 'Ej: 1 batidora' : i === 1 ? 'Ej: colchón 2 plazas' : `Descripción premio ${i + 1}`} className="w-full px-4 py-2 rounded-lg border border-gray-300 outline-none" />
                        </div>
                      ))}
                    </div>
                    <Tooltip text="Crear un nuevo sorteo con los datos ingresados"><button type="submit" className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg transition inline-flex items-center gap-2"><PenLine size={18} /> Crear sorteo</button></Tooltip>
                  </form>}

                  {loading ? <p className="text-gray-500">Cargando...</p> : (
                    <div className="space-y-3">
                      {raffles.map((r) => (
                        <div key={r.id} className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 bg-gray-50 rounded-lg p-4">
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-800 break-words">{r.name}</p>
                            <p className="text-sm text-gray-500 break-words">Estado: {r.is_active ? 'Activo' : 'Inactivo'} | Precio: ${r.ticket_price} | Números: 00-{r.max_number ?? 99} | Premios: {r.prizes_count} | Exp. carrito: {r.cart_expiry_minutes ?? 5} min | Inicio: {new Date(r.start_time).toLocaleString('es-AR')} | Fin: {new Date(r.end_time).toLocaleString('es-AR')}{r.admin ? ` | Admin: ${r.admin.name}` : ''} {r.drawn_at ? <span className="inline-flex items-center gap-1">| <Check className="text-green-600" size={14} /> Sorteado</span> : ''}</p>
                            {r.prizes && r.prizes.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {r.prizes.map((p: { description: string }, i: number) => (
                                  <span key={i} className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs font-semibold">{i + 1}°: {p.description}</span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Tooltip text="Ver participantes"><button onClick={() => handleViewParticipants(r)} className="bg-green-500 hover:bg-green-600 text-white p-2 rounded-lg transition inline-flex items-center justify-center"><Eye size={16} /></button></Tooltip>
                            {r.can_edit && user?.role !== 'super_admin' && (
                              <>
                                <Tooltip text="Editar sorteo (solo si no empezó y no tiene apuestas)"><button onClick={() => handleOpenEditRaffle(r)} className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition inline-flex items-center gap-1"><PencilIcon size={16} /> Editar</button></Tooltip>
                                <Tooltip text="Eliminar sorteo (solo si no empezó y no tiene apuestas)"><button onClick={() => handleOpenDeleteRaffle(r.id)} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition inline-flex items-center gap-1"><Trash2 size={16} /> Eliminar</button></Tooltip>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        <EditRaffleModal
        isOpen={!!editRaffle}
        onClose={handleCloseEditRaffle}
        raffle={editRaffle}
        onSave={() => { handleCloseEditRaffle(); fetchData(); }}
      />
      <ConfirmModal
        isOpen={!!deleteRaffleId}
        onClose={() => setDeleteRaffleId(null)}
        onConfirm={handleConfirmDeleteRaffle}
        title={<span className="inline-flex items-center gap-2"><Trash2 className="text-red-500" size={20} /> Eliminar sorteo</span>}
        message="¿Estás seguro de que querés eliminar este sorteo? Esta acción no se puede deshacer y se borrarán todos sus datos (tickets, órdenes, resultados)."
        loading={deleteLoading}
      />
    </div>
      </main>
    </div>
  </>
  );
}
