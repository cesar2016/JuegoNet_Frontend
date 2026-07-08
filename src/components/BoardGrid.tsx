import Tooltip from './Tooltip';
import { ShoppingCart, Clock } from 'lucide-react';

interface TicketUser {
  name: string;
  avatar: string | null;
}

interface Ticket {
  id: number;
  number: number;
  status: string;
  user_id: number | null;
  user: TicketUser | null;
}

interface BoardGridProps {
  tickets: Ticket[];
  currentUserId: number | null;
  onSelectNumber: (number: number) => void;
  loading: boolean;
  readOnly?: boolean;
  maxNumber?: number;
}

export default function BoardGrid({ tickets, currentUserId, onSelectNumber, loading, readOnly = false, maxNumber = 99 }: BoardGridProps) {
  const isOtherUser = (ticket: Ticket) => ticket.user_id && ticket.user_id !== currentUserId;

    const getTicketStyle = (ticket: Ticket) => {
    if (ticket.status === 'pending_admin' || ticket.status === 'in_cart') {
      if (ticket.user_id === currentUserId) {
        return 'bg-pink-200 text-pink-900 border-pink-400 cursor-not-allowed font-bold';
      }
      return 'bg-sky-200 text-sky-900 border-sky-400 cursor-not-allowed font-bold';
    }
    if (ticket.status === 'sold') {
      if (isOtherUser(ticket)) {
        return 'bg-transparent text-white border-white opacity-70 cursor-not-allowed';
      }
      return 'bg-red-500 text-white cursor-not-allowed border-red-600';
    }
    return readOnly
      ? 'bg-white text-black cursor-not-allowed border-gray-200'
      : 'bg-white text-gray-800 cursor-pointer border-gray-300 hover:border-yellow-500 hover:shadow-lg hover:shadow-yellow-500/40 hover:scale-110';
  };

  return (
    <div className="overflow-x-auto pb-2">
      <div className="grid grid-cols-10 gap-2 min-w-[500px]">
      {tickets.map((ticket) => {
        const button = (
          <button
            onClick={() => onSelectNumber(ticket.number)}
            disabled={readOnly || loading || ticket.status !== 'available'}
            className={`
              relative aspect-square rounded-lg border-2 font-bold
              transition-all duration-200 flex flex-col items-center justify-center
              ${getTicketStyle(ticket)}
            `}
          >
            <span className="text-2xl sm:text-3xl md:text-4xl leading-none tabular-nums">{String(ticket.number).padStart(String(maxNumber).length, '0')}</span>
            {ticket.status === 'in_cart' && (
              <div className={`absolute -bottom-2 -left-2 ${ticket.user_id === currentUserId ? 'bg-pink-300' : 'bg-sky-300'} rounded-full p-1 flex items-center justify-center`}>
                <ShoppingCart size={14} className="text-black" />
              </div>
            )}
            {ticket.status === 'pending_admin' && (
              <div className={`absolute -bottom-2 -left-2 ${ticket.user_id === currentUserId ? 'bg-pink-300' : 'bg-yellow-300'} rounded-full p-1 flex items-center justify-center`}>
                <Clock size={14} className="text-black" />
              </div>
            )}
            {ticket.user && (
              <div className="absolute -top-2 -right-2">
                {ticket.user?.avatar ? (
                  <img src={ticket.user.avatar} alt="" className="w-7 h-7 rounded-full border-2 border-white object-cover" />
                ) : (
                  <div className="w-7 h-7 rounded-full border-2 border-white bg-gray-700 text-white text-[10px] flex items-center justify-center font-bold">
                    {ticket.user?.name?.charAt(0).toUpperCase() ?? '?'}
                  </div>
                )}
              </div>
            )}
          </button>
        );

        return ticket.user
          ? <Tooltip key={ticket.number} text={ticket.user.name}>{button}</Tooltip>
          : <div key={ticket.number}>{button}</div>;
      })}
    </div>
    </div>
  );
}
