// The streak flame: one drawing that changes form at each milestone (see lib/streak.ts).
// No face — it's a badge, not a second mascot.
import { useId } from 'react';
import { STAGES } from '../lib/streak';

const F1 = 'M60 10 C66 30 92 44 92 74 C92 96 78 110 60 110 C42 110 28 96 28 74 C28 50 54 34 60 10 Z';
const F3 = 'M60 6 C64 22 72 30 78 38 C80 30 82 24 82 16 C94 32 98 52 96 72 C94 96 80 110 60 110 C40 110 26 96 24 72 C22 52 26 32 38 16 C38 24 40 30 42 38 C48 30 56 22 60 6 Z';
const F5 = 'M60 2 C64 16 70 24 74 32 C77 24 79 17 79 10 C88 20 92 30 93 40 C97 36 100 31 102 25 C108 42 107 58 103 72 C99 95 82 110 60 110 C38 110 21 95 17 72 C13 58 12 42 18 25 C20 31 23 36 27 40 C28 30 32 20 41 10 C41 17 43 24 46 32 C50 24 56 16 60 2 Z';
const EMBER = 'M24 98 C22 82 38 72 60 72 C82 72 98 82 96 98 C95 106 82 111 60 111 C38 111 25 106 24 98 Z';

type Look = { shape: string; scale: number; outer: [string, string]; mid: string; core: string; glow: string };
const LOOK: Record<string, Look> = {
  ember: { shape: EMBER, scale: 1, outer: ['#9aa0ad', '#6b7180'], mid: '#ff9a5a', core: '#ffd36b', glow: '#ff9a5a' },
  spark: { shape: F1, scale: 0.74, outer: ['#ffb067', '#ff7a2e'], mid: '#ffc24d', core: '#fff1a8', glow: '#ff9a3c' },
  flame: { shape: F1, scale: 0.9, outer: ['#ffa24d', '#ff6a1f'], mid: '#ffbf3a', core: '#fff1a8', glow: '#ff8c42' },
  blaze: { shape: F3, scale: 0.94, outer: ['#ff8a4d', '#ff4a26'], mid: '#ffa51f', core: '#ffef8a', glow: '#ff6a2e' },
  wildfire: { shape: F5, scale: 0.98, outer: ['#ff6f7d', '#ff2e55'], mid: '#ff8a2e', core: '#ffe066', glow: '#ff3d5c' },
  azure: { shape: F5, scale: 0.98, outer: ['#5cc8ff', '#1478f0'], mid: '#7fe0ff', core: '#f2fdff', glow: '#1cb0f6' },
  phoenix: { shape: F5, scale: 0.86, outer: ['#d68cff', '#8a3fe0'], mid: '#ff6fb5', core: '#ffe3f4', glow: '#a560e8' },
  solar: { shape: F5, scale: 0.82, outer: ['#ffd84d', '#ff9f0a'], mid: '#ffe680', core: '#fffbe6', glow: '#ffc800' },
  nova: { shape: F5, scale: 0.8, outer: ['#b89cff', '#6a3ff0'], mid: '#7fdcff', core: '#ffffff', glow: '#a07bff' },
  eternal: { shape: F5, scale: 0.8, outer: ['#5a3fd6', '#1e1450'], mid: '#7a5cf0', core: '#cbb8ff', glow: '#7a5cf0' }
};

const scaled = (s: number) => `translate(60 110) scale(${s}) translate(-60 -110)`;

export function StreakFlame({ stage, size = 40, still = false, locked = false }: { stage: number; size?: number; still?: boolean; locked?: boolean }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const st = STAGES[Math.max(0, Math.min(STAGES.length - 1, stage))].id;
  const L = LOOK[st];
  const g = (n: string) => `${id}-${n}`;
  const fill = (n: string, col: string) => (locked ? 'var(--line-strong)' : n ? `url(#${g(n)})` : col);
  const anim = still || locked ? '' : ' live';

  return (
    <svg className={'flame' + anim} width={size} height={size} viewBox="0 0 120 120" aria-hidden="true">
      <defs>
        <linearGradient id={g('o')} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={L.outer[0]} /><stop offset="1" stopColor={L.outer[1]} /></linearGradient>
        <linearGradient id={g('wing')} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffb067" /><stop offset="1" stopColor="#ff5fa2" /></linearGradient>
        <radialGradient id={g('glow')}><stop offset="0" stopColor={L.glow} stopOpacity=".55" /><stop offset="1" stopColor={L.glow} stopOpacity="0" /></radialGradient>
        <clipPath id={g('clip')}><path d={L.shape} transform={scaled(L.scale)} /></clipPath>
      </defs>

      {!locked && st !== 'ember' && <circle cx="60" cy="72" r="56" fill={`url(#${g('glow')})`} className="f-glow" />}

      {/* extras behind the body */}
      {!locked && st === 'solar' && (
        <g className="f-spin">{Array.from({ length: 12 }, (_, i) => (
          <path key={i} d="M60 14 L64 26 L56 26 Z" fill="#ffc800" transform={`rotate(${i * 30} 60 72)`} />
        ))}</g>
      )}
      {!locked && st === 'nova' && (
        <g className="f-spin">{['#ff4b4b', '#ff8c42', '#ffc800', '#12c79b', '#1cb0f6', '#a560e8'].map((c, i) => (
          <circle key={c} cx="60" cy="70" r="50" fill="none" stroke={c} strokeWidth="6" strokeLinecap="round"
            strokeDasharray="40 274" strokeDashoffset={-i * 52.4} />
        ))}</g>
      )}
      {st === 'phoenix' && (
        <g fill={locked ? 'var(--line-strong)' : `url(#${g('wing')})`}>
          <path d="M48 86 C30 86 10 76 1 54 C11 59 19 59 26 57 C13 51 5 40 3 27 C13 36 23 40 31 41 C22 32 18 21 21 9 C31 27 44 42 54 62 Z" />
          <path d="M72 86 C90 86 110 76 119 54 C109 59 101 59 94 57 C107 51 115 40 117 27 C107 36 97 40 89 41 C98 32 102 21 99 9 C89 27 76 42 66 62 Z" />
        </g>
      )}
      {st === 'eternal' && (
        <ellipse cx="60" cy="80" rx="56" ry="13" fill="none" stroke={locked ? 'var(--line-strong)' : '#ffc800'} strokeWidth="3.5" transform="rotate(-12 60 80)" />
      )}

      {/* body: outer, middle and hot core flames */}
      <g className="f-body">
        <path d={L.shape} transform={scaled(L.scale)} fill={fill('o', L.outer[1])} />
        {st === 'ember' ? (
          <>
            {!locked && <path d="M60 50 C65 58 71 62 71 69 C71 74 66 77 60 77 C54 77 49 74 49 69 C49 62 55 58 60 50 Z" fill={L.mid} className="f-inner" />}
            <path d="M34 92 C44 86 52 90 60 86" fill="none" stroke={locked ? 'transparent' : '#ff9a5a'} strokeWidth="3" strokeLinecap="round" opacity=".7" />
          </>
        ) : !locked && (
          <>
            <g className="f-inner"><path d={L.shape} transform={scaled(L.scale * 0.68)} fill={L.mid} /></g>
            <g className="f-core"><path d={F1} transform={scaled(L.scale * 0.4)} fill={L.core} /></g>
          </>
        )}
        {!locked && st === 'eternal' && (
          <g clipPath={`url(#${g('clip')})`} fill="#fff">
            {[[44, 50, 1.6], [70, 40, 1.2], [52, 70, 1.1], [78, 64, 1.7], [40, 86, 1.2], [66, 92, 1.4], [58, 30, 1]].map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} />)}
          </g>
        )}
        {!locked && st !== 'ember' && (
          <ellipse cx="46" cy="70" rx="4" ry="9" transform={`rotate(20 46 70)`} fill="#fff" opacity=".45" />
        )}
      </g>

      {st === 'eternal' && (
        <path d="M44 22 L48 8 L55 17 L60 4 L65 17 L72 8 L76 22 Z" fill={locked ? 'var(--line-strong)' : '#ffc800'} stroke={locked ? 'none' : '#e0a800'} strokeWidth="2" strokeLinejoin="round" />
      )}

      {/* floating sparks */}
      {!locked && !still && stage >= 2 && [0, 1, 2].map(i => (
        <circle key={i} className={`f-spark s${i}`} cx={46 + i * 14} cy="40" r={2.6 - i * 0.4} fill={L.mid} />
      ))}
    </svg>
  );
}
