// Android back button: the newest open sheet or screen handles it first; otherwise the app
// goes to the Today tab, and from Today the phone's normal back behaviour applies.
import { native, isNative } from './native';

type Handler = () => boolean;
const stack: Handler[] = [];
export function onBack(fn: Handler) { stack.push(fn); return () => { const i = stack.lastIndexOf(fn); if (i >= 0) stack.splice(i, 1); }; }

export function handleBack(): boolean {
  for (let i = stack.length - 1; i >= 0; i--) if (stack[i]()) return true;
  return false;
}

if (isNative) {
  const cap = (window as unknown as { Capacitor?: { Plugins?: Record<string, { addListener?: (e: string, f: () => void) => void }> } }).Capacitor;
  try {
    cap?.Plugins?.App?.addListener?.('backButton', () => { if (!handleBack()) native('App', 'minimizeApp').catch(() => native('App', 'exitApp')); });
  } catch { /* App plugin missing */ }
}
