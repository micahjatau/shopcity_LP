'use client';

export type ConnectivityState =
  | 'online'
  | 'connection-unstable'
  | 'offline'
  | 'synchronizing'
  | 'sync-failed';

type Listener = (state: ConnectivityState) => void;

const listeners = new Set<Listener>();
let state: ConnectivityState = 'online';

function emit(next: ConnectivityState) {
  state = next;
  listeners.forEach((listener) => listener(state));
}

export function getConnectivityState() {
  return state;
}

export function setConnectivityState(next: ConnectivityState) {
  emit(next);
}

export function subscribeConnectivityState(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function initializeConnectivityTracking() {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  emit(navigator.onLine ? 'online' : 'offline');

  const onOnline = () => emit('online');
  const onOffline = () => emit('offline');

  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);

  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
  };
}
