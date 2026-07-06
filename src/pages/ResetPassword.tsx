import { useState, type FormEvent } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import api from '../lib/api';
import { Lock, CheckCircle } from 'lucide-react';

export default function ResetPassword() {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';

  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!token) { setError('Falta el token de recuperación.'); return; }
    setError('');
    setLoading(true);
    try {
      await api.post('/reset-password', {
        email,
        token,
        password,
        password_confirmation: passwordConfirmation,
      });
      setSuccess(true);
    } catch (err: unknown) {
      const apiErr = err as { data?: { message?: string } };
      setError(apiErr.data?.message || 'Error al restablecer la contraseña');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-green-700 via-green-600 to-emerald-700">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="JuegaNet" className="h-16 mx-auto mb-2" />
          <p className="text-gray-500 mt-2">Nueva contraseña</p>
        </div>

        {success ? (
          <div className="text-center">
            <CheckCircle size={48} className="mx-auto text-green-600 mb-4" />
            <p className="text-gray-700 mb-4">Contraseña restablecida exitosamente.</p>
            <Link to="/login" className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition inline-block">
              Iniciar sesión
            </Link>
          </div>
        ) : (
          <>
            {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">Nueva contraseña</label>
                <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition" placeholder="Mínimo 8 caracteres" required minLength={8} />
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password_confirmation">Confirmar contraseña</label>
                <input id="password_confirmation" type="password" value={passwordConfirmation} onChange={(e) => setPasswordConfirmation(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition" placeholder="Repetí la contraseña" required />
              </div>
              <button type="submit" disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition disabled:opacity-50 inline-flex items-center justify-center gap-2">
                {loading ? 'Restableciendo...' : <><Lock size={18} /> Restablecer contraseña</>}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
