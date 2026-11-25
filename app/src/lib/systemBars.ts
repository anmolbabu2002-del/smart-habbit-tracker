// Android app: the page reaches under the status and navigation bars. Their sizes come from
// the UltradianSystemBars plugin (.github/android/SystemBarsPlugin.java) as CSS variables,
// and the status bar icons turn dark or light to match what's behind them.
import { isNative, native, listenNative } from './native';

type Insets = { top?: number; bottom?: number; left?: number; right?: number };
const root = document.documentElement;

function apply(d: Insets) {
  if (!d) return;
  root.style.setProperty('--safe-top', `${Number(d.top) || 0}px`);
  root.style.setProperty('--safe-bottom', `${Number(d.bottom) || 0}px`);
}

function colorAtTop() {
  let el = document.elementFromPoint(innerWidth / 2, 2) as HTMLElement | null;
  while (el) {
    const st = getComputedStyle(el);
    const m = /rgba?\(([^)]+)\)/.exec(st.backgroundColor) || /rgba?\(([^)]+)\)/.exec(st.backgroundImage);
    if (m) { const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number); if (p.length < 4 || p[3] > 0.5) return p; }
    el = el.parentElement;
  }
  const bg = getComputedStyle(document.body).backgroundColor.match(/\d+/g)?.map(Number);
  return bg || [255, 255, 255];
}

export function initSystemBars() {
  if (!isNative) return;
  native<Insets>('UltradianSystemBars', 'getInsets').then(apply).catch(() => {});
  listenNative<Insets>('UltradianSystemBars', 'insetsChange', apply);
  let last: boolean | null = null;
  const tick = () => {
    const [r, g, b] = colorAtTop();
    const dark = (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55;
    if (dark !== last) { last = dark; native('UltradianSystemBars', 'setStyle', { darkIcons: dark }).catch(() => {}); }
  };
  setInterval(tick, 400);
  tick();
  // No pinch zoom inside the app
  document.querySelector('meta[name="viewport"]')?.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover');
}
