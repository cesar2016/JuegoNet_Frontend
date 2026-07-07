import { useState, useEffect, useRef } from 'react';
import Tooltip from './Tooltip';
import { Timer } from 'lucide-react';

interface SuperCountdownProps {
  startTime: string;
  endTime: string;
  title?: string;
}

export default function SuperCountdown({ startTime, endTime, title }: SuperCountdownProps) {
  const [remaining, setRemaining] = useState('');
  const expiredRef = useRef(new Date(endTime).getTime() <= Date.now());

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const end = new Date(endTime);
      const diff = end.getTime() - now.getTime();
      if (diff <= 0) {
        setRemaining('Sorteo finalizado');
        if (!expiredRef.current) {
          expiredRef.current = true;
          window.location.reload();
        }
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      const dd = days > 0 ? `${days}d ` : '';
      setRemaining(`${dd}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [endTime]);

  const formatFull = (iso: string) =>
    new Date(iso).toLocaleString('es-AR', { dateStyle: 'long', timeStyle: 'short' });

  return (
    <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl p-4 text-white shadow-lg">
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <Tooltip text="Tiempo restante para que finalice la compra de números">
          <div>
            <p className="text-sm opacity-80 inline-flex items-center gap-1"><Timer size={16} /> Tiempo restante del sorteo</p>
            <p className="text-2xl sm:text-3xl font-bold font-mono tracking-wider">{remaining}</p>
          </div>
        </Tooltip>

        {title && (
          <div className="sm:flex-1 text-center w-full sm:w-auto">
            <p className="text-lg sm:text-2xl font-bold">{title}</p>
          </div>
        )}

        <Tooltip text={`Inicio: ${formatFull(startTime)} | Fin: ${formatFull(endTime)}`}>
          <div className="flex gap-4 text-right">
            <div>
              <p className="text-xs opacity-80">Inicio</p>
              <p className="font-semibold text-sm">{new Date(startTime).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
            <div>
              <p className="text-xs opacity-80">Fin</p>
              <p className="font-semibold text-sm">{new Date(endTime).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          </div>
        </Tooltip>
      </div>
    </div>
  );
}
