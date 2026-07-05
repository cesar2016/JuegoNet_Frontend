import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Loader } from 'lucide-react';
import api from '../lib/api';

export default function VerifyEmail() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) return;
    api.get<{ message: string }>(`/verify-email/${token}`)
      .then((res) => {
        setMessage(res.message);
        setStatus('success');
      })
      .catch((err) => {
        const data = err?.data as { message?: string } | undefined;
        setMessage(data?.message || 'Error al verificar el email.');
        setStatus('error');
      });
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-green-700 via-green-600 to-emerald-700">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md text-center">
        {status === 'loading' && (
          <>
            <Loader size={40} className="animate-spin text-green-600 mx-auto mb-4" />
            <p className="text-gray-600">Verificando tu email...</p>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-green-600 mb-2">¡Email verificado!</h2>
            <p className="text-gray-600 mb-6">{message}</p>
            <button onClick={() => navigate('/')} className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition">Iniciar sesión</button>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle size={48} className="text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-red-600 mb-2">Error de verificación</h2>
            <p className="text-gray-600 mb-6">{message}</p>
            <button onClick={() => navigate('/')} className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition">Volver al inicio</button>
          </>
        )}
      </div>
    </div>
  );
}
