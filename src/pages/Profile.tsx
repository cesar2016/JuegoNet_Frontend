import { useState, useEffect, type FormEvent, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, type User } from '../lib/AuthContext';
import api from '../lib/api';
import Tooltip from '../components/Tooltip';
import { User as UserIcon, Save, ArrowLeft, Camera } from 'lucide-react';

export default function Profile() {
  const { user, loading: authLoading, updateUser } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/'); return; }
    setName(user.name);
    setEmail(user.email);
    setWhatsapp(user.whatsapp || '');
    setAvatarUrl(user.avatar || '');
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const data: Record<string, string> = { name, email, whatsapp };
      if (avatarFile) {
        const formData = new FormData();
        formData.append('avatar', avatarFile);
        const uploadResult = await api.upload<{ url: string }>('/upload-avatar', formData);
        data.avatar = uploadResult.url;
      } else if (avatarUrl) {
        data.avatar = avatarUrl;
      }
      const result = await api.post<{ user: User }>('/profile/update', data);
      if (result.user) updateUser(result.user);
      setSuccess('Perfil actualizado correctamente.');
      setAvatarFile(null);
    } catch (err: unknown) {
      const apiErr = err as { data?: { message?: string; errors?: Record<string, string[]> } };
      if (apiErr.data?.errors) setError(Object.values(apiErr.data.errors).flat().join('. '));
      else setError(apiErr.data?.message || 'Error al actualizar perfil');
    }
    setLoading(false);
  };

  const handleAvatarChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setAvatarUrl(URL.createObjectURL(file));
    }
  };

  const initial = user?.name?.charAt(0).toUpperCase() ?? '?';

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-700 via-green-600 to-emerald-700">
      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-8 inline-flex items-center gap-3"><UserIcon className="text-green-600" size={28} /> Modificar perfil</h1>

          {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4">{error}</div>}
          {success && <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg mb-4">{success}</div>}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex flex-col items-center mb-6">
              <div className="relative mb-4">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="w-24 h-24 rounded-full object-cover border-4 border-green-200" />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-green-300 flex items-center justify-center text-green-800 font-bold text-3xl border-4 border-green-200">{initial}</div>
                )}
                <Tooltip text="Subir foto de perfil">
                  <label className="absolute bottom-0 right-0 bg-green-600 text-white rounded-full p-2 cursor-pointer hover:bg-green-700 transition shadow-lg">
                    <Camera size={18} />
                    <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                  </label>
                </Tooltip>
              </div>
              <p className="text-sm text-gray-500">O ingresa URL de avatar</p>
              <input type="url" value={avatarUrl} onChange={(e) => { setAvatarUrl(e.target.value); setAvatarFile(null); }}
                className="mt-2 w-full max-w-xs px-4 py-2 rounded-lg border border-gray-300 focus:border-green-500 outline-none text-sm" placeholder="https://ejemplo.com/avatar.jpg" />
            </div>

            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">Nombre completo</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-green-500 outline-none transition" required />
            </div>

            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-green-500 outline-none transition" required />
            </div>

            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">WhatsApp</label>
              <input type="text" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-green-500 outline-none transition" placeholder="+5491122334455" />
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <button type="submit" disabled={loading}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition disabled:opacity-50">
                  {loading ? 'Guardando...' : <span className="inline-flex items-center gap-2"><Save size={18} /> Guardar cambios</span>}
                </button>
              <Tooltip text="Volver sin guardar">
                <button type="button" onClick={() => navigate(-1)}
                  className="w-full sm:w-auto px-6 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-3 rounded-lg transition">
<span className="inline-flex items-center gap-2"><ArrowLeft size={18} /> Volver</span>
                </button>
              </Tooltip>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
