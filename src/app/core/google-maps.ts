import { googleMapsConfig } from '../../environments/google-maps.config';

export const GOOGLE_MAP_ID = googleMapsConfig.mapId || 'DEMO_MAP_ID';
// SDK loaded on demand. Keep the untyped vendor boundary isolated here and in map adapters.
type GoogleWindow = Window & { google?: { maps: any }; __blackoutGoogleMapsReady?: () => void };
let pending: Promise<any> | undefined;

export function loadGoogleMaps(): Promise<any> {
  if (typeof window === 'undefined') return Promise.reject(new Error('O mapa precisa de um navegador.'));
  const win = window as GoogleWindow;
  if (win.google?.maps?.importLibrary) return Promise.resolve(win.google.maps);
  if (pending) return pending;
  if (!googleMapsConfig.apiKey.trim()) return Promise.reject(new Error('Configure a chave do Google Maps para carregar o mapa.'));
  pending = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const parameters = new URLSearchParams({ key: googleMapsConfig.apiKey.trim(), v: 'weekly', loading: 'async', language: 'pt-BR', region: 'BR', callback: '__blackoutGoogleMapsReady' });
    script.src = `https://maps.googleapis.com/maps/api/js?${parameters}`;
    script.async = true;
    const nonce = document.querySelector<HTMLScriptElement>('script[nonce]')?.nonce;
    if (nonce) script.nonce = nonce;
    let settled = false;
    const timer = setTimeout(() => fail(), 15000);
    const cleanup = () => { clearTimeout(timer); delete win.__blackoutGoogleMapsReady; script.onerror = null; };
    const fail = () => {
      if (settled) return;
      settled = true; cleanup(); script.remove();
      reject(new Error('Não foi possível carregar o Google Maps. Verifique a conexão e a configuração da chave.'));
    };
    script.onerror = fail;
    win.__blackoutGoogleMapsReady = () => {
      if (!win.google?.maps?.importLibrary) { fail(); return; }
      if (settled) return;
      settled = true; cleanup(); resolve(win.google.maps);
    };
    document.head.appendChild(script);
  }).catch(error => { pending = undefined; throw error; });
  return pending;
}

/** The SDK request may continue remotely; cancellation prevents applying its late result. */
export function withAbort<T>(operation: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const abort = () => { signal.removeEventListener('abort', abort); reject(new DOMException('Operação cancelada.', 'AbortError')); };
    if (signal.aborted) { operation.catch(() => undefined); abort(); return; }
    signal.addEventListener('abort', abort, { once: true });
    operation.then(value => { signal.removeEventListener('abort', abort); if (!signal.aborted) resolve(value); }, error => { signal.removeEventListener('abort', abort); reject(error); });
  });
}
