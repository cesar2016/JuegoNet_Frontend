import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { Mail, ArrowLeft } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/forgot-password', { email });
      setSent(true);
    } catch (err: unknown) {
      const apiErr = err as { data?: { message?: string } };
      setError(apiErr.data?.message || 'Error al enviar el email');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-green-700 via-green-600 to-emerald-700">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="JuegaNet" className="h-16 mx-auto mb-2" />
          <p className="text-gray-500 mt-2">Restablecé tu contraseña</p>
        </div>

        {sent ? (
          <div className="text-center">
            <Mail size={48} className="mx-auto text-green-600 mb-4" />
            <p className="text-gray-700 mb-4">
              Si el email existe, recibirás un enlace para restablecer tu contraseña.
            </p>
            <Link to="/login" className="text-green-600 hover:text-green-700 font-semibold inline-flex items-center gap-1">
              <ArrowLeft size={16} /> Volver al inicio de sesión
            </Link>
          </div>
        ) : (
          <>
            {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">Email</label>
                <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition" placeholder="tu@email.com" required />
              </div>
              <button type="submit" disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition disabled:opacity-50 inline-flex items-center justify-center gap-2">
                {loading ? 'Enviando...' : <><Mail size={18} /> Enviar enlace</>}
              </button>
            </form>
            <p className="text-center mt-4">
              <Link to="/login" className="text-green-600 hover:text-green-700 text-sm font-semibold inline-flex items-center gap-1">
                <ArrowLeft size={14} /> Volver al inicio de sesión
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
