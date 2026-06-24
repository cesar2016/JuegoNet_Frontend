import Tooltip from './Tooltip';

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
}

export default function BoardGrid({ tickets, currentUserId, onSelectNumber, loading, readOnly = false }: BoardGridProps) {
  const isOtherUser = (ticket: Ticket) => ticket.user_id && ticket.user_id !== currentUserId;

    const getTicketStyle = (ticket: Ticket) => {
    if (isOtherUser(ticket)) {
      return 'bg-[oklch(0.62_0.03_17.62)] text-white cursor-not-allowed border-[oklch(0.66_0.17_21.5)]';
    }
    if (ticket.status === 'sold') {
      return 'bg-red-500 text-white cursor-not-allowed border-red-600';
    }
    if (ticket.status === 'pending_admin') {
      return 'bg-orange-400 text-white cursor-not-allowed border-orange-500 opacity-70';
    }
    if (ticket.status === 'confirmed') {
      return 'bg-yellow-300 text-gray-800 cursor-not-allowed border-yellow-400 opacity-80';
    }
    if (ticket.status === 'in_cart') {
      return 'bg-red-500 text-white border-red-600';
    }
    return readOnly
      ? 'bg-white text-black cursor-not-allowed border-gray-200'
      : 'bg-white hover:bg-purple-100 text-gray-800 cursor-pointer border-gray-300 hover:border-purple-500 hover:shadow-md';
  };

  return (
    <div className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-9 lg:grid-cols-11 gap-2">
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
            <span className="text-2xl sm:text-3xl md:text-4xl leading-none tabular-nums">{String(ticket.number).padStart(2, '0')}</span>
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
  );
}
