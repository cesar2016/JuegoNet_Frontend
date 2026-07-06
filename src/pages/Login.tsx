import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import api from '../lib/api';
import { LockOpen, Mail } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showResend, setShowResend] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSent, setResendSent] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setShowResend(false);
    setResendSent(false);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: unknown) {
      const apiErr = err as { data?: { message?: string; status?: string } };
      if (apiErr.data?.status === 'pending_verification') {
        setShowResend(true);
      } else {
        setError(apiErr.data?.message || 'Error al iniciar sesión');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendLoading(true);
    try {
      await api.post('/resend-verification', { email });
      setResendSent(true);
    } catch {
      setError('Error al reenviar el email. Intentá de nuevo.');
    }
    setResendLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-green-700 via-green-600 to-emerald-700">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="JuegaNet" className="h-16 mx-auto mb-2" />
          <p className="text-gray-500 mt-2">Inicia sesión para continuar</p>
        </div>
        {error && !showResend && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4">{error}</div>}
        {resendSent && <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg mb-4">Email de verificación reenviado. Revisá tu bandeja de entrada.</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">Email</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition" placeholder="tu@email.com" required />
          </div>
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">Contraseña</label>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition" placeholder="••••••••" required />
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition disabled:opacity-50">
            {loading ? 'Iniciando sesión...' : <span className="inline-flex items-center gap-2"><LockOpen size={18} /> Ingresar</span>}
          </button>
        </form>

        {showResend && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => { setShowResend(false); setResendSent(false); }}>
            <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md relative" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => { setShowResend(false); setResendSent(false); }}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
              <div className="text-center mb-6">
                <Mail size={48} className="mx-auto text-green-600 mb-2" />
                <h2 className="text-xl font-bold text-gray-800">Verificá tu email</h2>
              </div>
              <p className="text-gray-600 text-center mb-6">
                Debés verificar tu email antes de iniciar sesión. Revisá tu bandeja de entrada.
              </p>
              {!resendSent ? (
                <button type="button" onClick={handleResend} disabled={resendLoading}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition inline-flex items-center justify-center gap-2 disabled:opacity-50">
                  {resendLoading ? 'Reenviando...' : <><Mail size={18} /> Reenviar email de verificación</>}
                </button>
              ) : (
                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg text-center">
                  Email de verificación reenviado. Revisá tu bandeja de entrada.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
