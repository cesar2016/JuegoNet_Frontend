import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import api from '../lib/api';
import { getEcho } from '../lib/echo';
import { Target, Trophy, Search, Settings, LayoutDashboard, User, LogOut, ChevronDown, Menu, X } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [raffleDropdown, setRaffleDropdown] = useState(false);
  const [raffleSearch, setRaffleSearch] = useState('');
  const [mobileMenu, setMobileMenu] = useState(false);
  const [mobileRaffle, setMobileRaffle] = useState(false);
  const [mobileRaffleSearch, setMobileRaffleSearch] = useState('');
  const [activeRaffles, setActiveRaffles] = useState<{ id: number; name: string }[]>([]);
  const [admin, setAdmin] = useState<{ name: string; avatar: string | null } | null>(null);
  const navigate = useNavigate();
  const raffleRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!raffleDropdown && !open) return;
    const handler = (e: MouseEvent) => {
      if (raffleDropdown && raffleRef.current && !raffleRef.current.contains(e.target as Node)) setRaffleDropdown(false);
      if (open && userRef.current && !userRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [raffleDropdown, open]);

  useEffect(() => {
    api.get<{ name: string; avatar: string | null }>('/site-admin').then(setAdmin).catch(() => {});

    const fetchRaffles = () => {
      api.get<{ id: number; name: string }[]>('/raffles').then(setActiveRaffles).catch(() => {});
    };

    fetchRaffles();

    if (user && (user.role === 'admin' || user.role === 'super_admin')) {
      console.log('[Navbar] Subscribing to admin channel:', `admin.${user.id}`);
      const echo = getEcho();
      echo.private(`admin.${user.id}`);
      const handler = (eventName: string, e: { type: string }) => {
        if (eventName !== 'AdminNotification') return;
        console.log('[Navbar] AdminNotification received:', e);
        if (e.type === 'raffle_list_updated') fetchRaffles();
      };
      echo.connector.pusher.bind_global(handler);
      return () => { echo.connector.pusher.unbind_global(handler); };
    } else {
      const interval = setInterval(fetchRaffles, 60000);
      return () => clearInterval(interval);
    }
  }, [user]);

  if (!user) return null;

  const initial = user.name.charAt(0).toUpperCase();
  const avatarUrl = user.avatar || null;
  const adminInitial = admin ? admin.name.charAt(0).toUpperCase() : '';
  const adminAvatar = admin?.avatar || null;
  const close = () => setOpen(false);
  const closeMobile = () => { setMobileMenu(false); setMobileRaffle(false); };

  return (
    <>
      <nav className="bg-white/10 backdrop-blur-md border-b border-white/20 z-40 relative">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to={user.role === 'super_admin' || user.role === 'admin' ? '/admin' : '/dashboard'} className="shrink-0">
            <img src="/logo.png" alt="JuegaNet" className="h-10 w-auto" />
          </Link>

          {admin && (
            <div className="flex items-center gap-2 text-white">
              {adminAvatar ? (
                <img src={adminAvatar} alt={admin.name} className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover border-2 border-white/30" />
              ) : (
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-green-300 flex items-center justify-center text-green-800 font-bold border-2 border-white/30">
                  {adminInitial}
                </div>
              )}
              <span className="hidden sm:inline text-base font-semibold">{admin.name}</span>
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">{user.role === 'admin' ? 'Super Admin' : 'Tu Admin'}</span>
            </div>
          )}

          <div className="hidden md:flex items-center gap-4">
            <div className="relative" ref={raffleRef}>
              <button onClick={() => { setOpen(false); setRaffleDropdown(!raffleDropdown); setRaffleSearch(''); }} className="flex items-center gap-1 text-white hover:bg-white/10 px-3 py-2 rounded-lg transition text-sm font-semibold">
                <Target className="text-green-200" size={18} />
                Sorteos activos
                <ChevronDown className={`transition ${raffleDropdown ? 'rotate-180' : ''}`} size={14} />
              </button>
              {raffleDropdown && (
                <div className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-2xl min-w-[220px] z-50">
                  <div className="px-3 pt-2 pb-1">
                    <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2">
                      <Search size={14} className="text-gray-400 shrink-0" />
                      <input type="text" value={raffleSearch} onChange={(e) => setRaffleSearch(e.target.value)}
                        placeholder="Buscar sorteo..." className="bg-transparent outline-none text-sm text-gray-700 w-full" autoFocus />
                    </div>
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    {(() => {
                      const items = raffleSearch
                        ? activeRaffles.filter((r) => r.name.toLowerCase().includes(raffleSearch.toLowerCase()))
                        : activeRaffles;
                      if (items.length === 0) {
                        return <p className="px-4 py-3 text-sm text-gray-400">Sin resultados</p>;
                      }
                      return items.map((r) => (
                        <button key={r.id} onClick={() => { setRaffleDropdown(false); navigate(`/dashboard?raffle=${r.id}`); }}
                          className="block w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 transition">
                          {r.name}
                        </button>
                      ));
                    })()}
                  </div>
                </div>
              )}
            </div>
            <Link to="/dashboard?results" onClick={() => setRaffleDropdown(false)}
              className="flex items-center gap-1 text-white hover:bg-white/10 px-3 py-2 rounded-lg transition text-sm font-semibold">
              <Trophy className="text-green-200" size={18} />
              Resultados
            </Link>
          </div>

          <div className="relative hidden md:block" ref={userRef}>
            <button
              onClick={() => { setRaffleDropdown(false); setOpen(!open); }}
              className="flex items-center gap-2 text-white hover:bg-white/10 px-3 py-2 rounded-lg transition shrink-0"
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-green-300 flex items-center justify-center text-green-800 font-bold text-sm">
                  {initial}
                </div>
              )}
              <span className="text-sm font-medium">{user.name}</span>
              <ChevronDown className={`transition ${open ? 'rotate-180' : ''}`} size={16} />
            </button>
            {open && (
              <div className="absolute top-full right-0 mt-2 bg-white rounded-xl shadow-2xl py-2 w-48 z-[110]">
                {(user.role === 'super_admin' || user.role === 'admin') && (
                  <Link to="/admin" onClick={close} className="block px-4 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 transition">
                    Administrar
                  </Link>
                )}
                <Link to="/dashboard" onClick={close} className="block px-4 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 transition">
                  Dashboard
                </Link>
                <Link to="/profile" onClick={close} className="block px-4 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 transition">
                  Modificar perfil
                </Link>
                <hr className="my-1 border-gray-200" />
                <button
                  onClick={() => { close(); logout(); navigate('/'); }}
                  className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition"
                >
                  <LogOut size={16} />
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>

          <button onClick={() => { setMobileMenu(!mobileMenu); setRaffleDropdown(false); setOpen(false); setMobileRaffle(false); }}
            className="md:hidden flex items-center text-white p-2 rounded-lg hover:bg-white/10 transition">
            {mobileMenu ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {mobileMenu && <div className="fixed inset-0 z-[90]" onClick={closeMobile} />}
      {mobileMenu && (
        <div className="md:hidden fixed z-[100] left-0 right-0 bg-white shadow-2xl border-t border-gray-100">
          <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-100">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-green-300 flex items-center justify-center text-green-800 font-bold">{initial}</div>
            )}
            <div className="min-w-0">
              <p className="font-semibold text-gray-800 text-sm truncate">{user.name}</p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>
          </div>

          <div className="py-1">
            <div>
              <button onClick={() => setMobileRaffle(!mobileRaffle)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 transition">
                <span className="flex items-center gap-2">
                  <Target className="text-green-600" size={18} />
                  Sorteos activos
                </span>
                <ChevronDown className={`transition ${mobileRaffle ? 'rotate-180' : ''}`} size={16} />
              </button>
              {mobileRaffle && (
                <div className="bg-gray-50 border-t border-b border-gray-100">
                  <div className="px-4 pt-3 pb-2">
                    <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 px-3 py-2">
                      <Search size={14} className="text-gray-400 shrink-0" />
                      <input type="text" value={mobileRaffleSearch} onChange={(e) => setMobileRaffleSearch(e.target.value)}
                        placeholder="Buscar sorteo..." className="bg-transparent outline-none text-sm text-gray-700 w-full" />
                    </div>
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    {(() => {
                      const items = mobileRaffleSearch
                        ? activeRaffles.filter((r) => r.name.toLowerCase().includes(mobileRaffleSearch.toLowerCase()))
                        : activeRaffles;
                      if (items.length === 0) {
                        return <p className="px-8 py-3 text-sm text-gray-400">Sin resultados</p>;
                      }
                      return items.map((r) => (
                        <button key={r.id} onClick={() => { navigate(`/dashboard?raffle=${r.id}`); closeMobile(); }}
                          className="block w-full text-left px-8 py-2.5 text-sm text-gray-600 hover:bg-green-50 hover:text-green-700 transition">
                          {r.name}
                        </button>
                      ));
                    })()}
                  </div>
                </div>
              )}
            </div>

            <Link to="/dashboard?results" onClick={closeMobile}
              className="flex items-center gap-2 px-4 py-3 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 transition">
              <Trophy className="text-green-600" size={18} />
              Resultados
            </Link>

            {(user.role === 'super_admin' || user.role === 'admin') && (
              <Link to="/admin" onClick={closeMobile}
                className="flex items-center gap-2 px-4 py-3 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 transition">
                <Settings className="text-green-600" size={18} />
                Administrar
              </Link>
            )}

            <Link to="/dashboard" onClick={closeMobile}
              className="flex items-center gap-2 px-4 py-3 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 transition">
              <LayoutDashboard className="text-green-600" size={18} />
              Dashboard
            </Link>

            <Link to="/profile" onClick={closeMobile}
              className="flex items-center gap-2 px-4 py-3 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 transition">
              <User className="text-green-600" size={18} />
              Modificar perfil
            </Link>

            <hr className="my-1 border-gray-100" />

            <button onClick={() => { closeMobile(); logout(); navigate('/'); }}
              className="flex items-center gap-2 w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition">
              <LogOut size={16} />
              Cerrar sesión
            </button>
          </div>
        </div>
      )}

      
    </>
  );
}
