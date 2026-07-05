import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './lib/AuthContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Admin from './pages/Admin';
import Profile from './pages/Profile';
import VerifyEmail from './pages/VerifyEmail';

function App() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-700 via-green-600 to-emerald-700 flex items-center justify-center text-white text-xl">
        Cargando...
      </div>
    );
  }

  const isAuthPage = location.pathname === '/' || location.pathname === '/register';

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-700 via-green-600 to-emerald-700">
      {!isAuthPage && user && <Navbar />}
      <Routes>
        <Route path="/" element={user ? <Navigate to={user.role === 'super_admin' || user.role === 'admin' ? '/admin' : '/dashboard'} /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <Register />} />
        <Route path="/verify-email/:token" element={<VerifyEmail />} />
        <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/" />} />
        <Route path="/admin" element={user && (user.role === 'super_admin' || user.role === 'admin') ? <Admin /> : <Navigate to="/" />} />
        <Route path="/profile" element={user ? <Profile /> : <Navigate to="/" />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  );
}

export default App;
