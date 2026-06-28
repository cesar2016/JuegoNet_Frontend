import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

let echoInstance: Echo<'reverb'> | null = null;

declare global {
  interface Window {
    Pusher: typeof Pusher;
  }
}

export function getEcho(): Echo<'reverb'> {
  if (!echoInstance) {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8383/api';
    const backendBase = apiUrl.replace(/\/api\/?$/, '');
    const token = localStorage.getItem('token');

    window.Pusher = Pusher;

    echoInstance = new Echo({
      broadcaster: 'reverb',
      key: import.meta.env.VITE_REVERB_APP_KEY ?? 'dummy-key',
      wsHost: import.meta.env.VITE_REVERB_HOST ?? '127.0.0.1',
      wsPort: Number(import.meta.env.VITE_REVERB_PORT ?? 8080),
      wssPort: Number(import.meta.env.VITE_REVERB_PORT ?? 443),
      forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? 'https') === 'https',
      enabledTransports: ['ws', 'wss'],
      authEndpoint: `${backendBase}/broadcasting/auth`,
      auth: {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      },
    });
  }
  return echoInstance;
}

export function destroyEcho() {
  if (echoInstance) {
    echoInstance.disconnect();
    echoInstance = null;
  }
}
