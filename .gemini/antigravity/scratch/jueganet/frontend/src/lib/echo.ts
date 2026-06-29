import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

let echoInstance: Echo<'reverb'> | null = null;

declare global {
  interface Window {
    Pusher: typeof Pusher;
    Echo?: Echo<'reverb'>;
  }
}

export function getEcho(): Echo<'reverb'> {
  if (!echoInstance) {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8383/api';
    const backendBase = apiUrl.replace(/\/api\/?$/, '');
    const token = localStorage.getItem('token');

    const key = import.meta.env.VITE_REVERB_APP_KEY ?? 'dummy-key';
    const wsHost = import.meta.env.VITE_REVERB_HOST ?? '127.0.0.1';
    const wsPort = Number(import.meta.env.VITE_REVERB_PORT ?? 8080);
    const scheme = import.meta.env.VITE_REVERB_SCHEME ?? 'http';

    console.log('[Echo] Init:', { key, wsHost, wsPort, scheme, forceTLS: scheme === 'https', apiUrl, backendBase, hasToken: !!token });

    window.Pusher = Pusher;

    echoInstance = new Echo({
      broadcaster: 'reverb',
      key,
      wsHost,
      wsPort,
      wssPort: wsPort,
      forceTLS: scheme === 'https',
      enabledTransports: ['ws', 'wss'],
      authEndpoint: `${backendBase}/broadcasting/auth`,
      auth: {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      },
    });

    echoInstance.connector.pusher.connection.bind('connected', () => {
      console.log('[Echo] Connected to Reverb, socket_id:', echoInstance?.socketId());
    });
    echoInstance.connector.pusher.connection.bind('disconnected', () => {
      console.log('[Echo] Disconnected from Reverb');
    });
    echoInstance.connector.pusher.connection.bind('error', (err: unknown) => {
      console.error('[Echo] Connection error:', err);
    });
    echoInstance.connector.pusher.connection.bind('state_change', (states: { previous: string; current: string }) => {
      console.log('[Echo] State change:', states.previous, '→', states.current);
    });

    // Log ALL events on ALL channels for debugging
    echoInstance.connector.pusher.bind_global((eventName: string, data: unknown) => {
      console.log('[Echo] GLOBAL EVENT:', eventName, data);
    });

    // Log channel subscription events
    echoInstance.connector.pusher.bind('subscription_succeeded', (data: unknown) => {
      console.log('[Echo] subscription_succeeded:', data);
    });
    echoInstance.connector.pusher.bind('subscription_error', (data: unknown) => {
      console.error('[Echo] subscription_error:', data);
    });
    echoInstance.connector.pusher.bind('subscription_count', (data: unknown) => {
      console.log('[Echo] subscription_count:', data);
    });
    echoInstance.connector.pusher.bind('pusher:subscription_succeeded', (data: unknown) => {
      console.log('[Echo] pusher:subscription_succeeded:', data);
    });
    echoInstance.connector.pusher.bind('pusher:subscription_error', (data: unknown) => {
      console.error('[Echo] pusher:subscription_error:', data);
    });

    window.Echo = echoInstance;
  }
  return echoInstance;
}

export function destroyEcho() {
  if (echoInstance) {
    echoInstance.disconnect();
    echoInstance = null;
  }
}
