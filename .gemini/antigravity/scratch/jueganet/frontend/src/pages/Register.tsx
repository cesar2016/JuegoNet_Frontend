import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import Tooltip from '../components/Tooltip';
import { CheckCircle, Home, UserPlus } from 'lucide-react';

export default function Register() {
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('invite_token') || undefined;
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== passwordConfirmation) { setError('Las contraseñas no coinciden.'); return; }
    setLoading(true);
    try {
      await register(name, email, password, passwordConfirmation, inviteToken);
      navigate('/dashboard');
    } catch (err: unknown) {
      const apiErr = err as { data?: { message?: string; errors?: Record<string, string[]> } };
      if (apiErr.data?.errors) setError(Object.values(apiErr.data.errors).flat().join('. '));
      else setError(apiErr.data?.message || 'Error al registrarse');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-green-700 via-green-600 to-emerald-700">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md text-center">
          <h2 className="text-2xl font-bold text-green-600 mb-4 inline-flex items-center gap-2"><CheckCircle className="text-green-500" size={24} /> ¡Registro exitoso!</h2>
          <p className="text-gray-600 mb-2">Te enviamos un email de verificación a <strong>{email}</strong>.</p>
          <p className="text-gray-500 text-sm mb-6">Revisá tu bandeja de entrada y hacé clic en el enlace para activar tu cuenta.</p>
          <button onClick={() => navigate('/')} className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition"><Home size={18} /> Volver al inicio</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-green-700 via-green-600 to-emerald-700">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="JuegaNet" className="h-16 mx-auto mb-2" />
          <p className="text-gray-500 mt-2">Crear una cuenta nueva</p>
        </div>
        {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="name">Nombre completo</label>
            <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-green-500 outline-none transition" required />
          </div>
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">Email</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-green-500 outline-none transition" required />
          </div>
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">Contraseña</label>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-green-500 outline-none transition" minLength={8} required />
          </div>
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password_confirmation">Confirmar contraseña</label>
            <input id="password_confirmation" type="password" value={passwordConfirmation} onChange={(e) => setPasswordConfirmation(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-green-500 outline-none transition" required />
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition disabled:opacity-50">
            {loading ? 'Registrando...' : <span className="inline-flex items-center gap-2"><UserPlus size={18} /> Crear cuenta</span>}
          </button>
        </form>
        <div className="text-center text-gray-500 mt-6">
          ¿Ya tienes cuenta? <Tooltip text="Ir a la página de inicio de sesión"><Link to="/" className="text-green-600 hover:text-green-800 font-semibold">Inicia sesión</Link></Tooltip>
        </div>
      </div>
    </div>
  );
}
