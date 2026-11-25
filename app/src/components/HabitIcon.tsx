// Ultradian's own illustrated icons (no emoji anywhere): chunky, rounded, with a darker lower
// shade and a white glint, drawn in the habit's colour so the whole set looks like one family.
import type { JSX } from 'react';
import type { Color } from '../lib/types';
import { classify } from '../lib/proofDictionary';

type Pal = { c: string; e: string; s: string };
const W = '#ffffff', K = '#2f3542', GOLD = '#ffc800', LEAF = '#12c79b', LEAF2 = '#0c9e7a', NO = '#ff4b4b';

export const PALETTES: Record<Color, Pal> = {
  orange: { c: '#ff8c42', e: '#e26b1f', s: '#ffd2b0' },
  mint: { c: '#12c79b', e: '#0c9e7a', s: '#a8ecd9' },
  blue: { c: '#1cb0f6', e: '#1899d6', s: '#b5e5fc' },
  purple: { c: '#a560e8', e: '#8547c6', s: '#dcc2f6' },
  yellow: { c: '#ffc800', e: '#e0a800', s: '#ffe98a' },
  red: { c: '#ff4b4b', e: '#d93a3a', s: '#ffc0c0' }
};

const glint = (x: number, y: number, r = 2.2) => <ellipse cx={x} cy={y} rx={r} ry={r * 1.5} transform={`rotate(35 ${x} ${y})`} fill={W} opacity={0.7} />;
const twinkle = (x: number, y: number, r: number, fill: string) =>
  <path d={`M${x} ${y - r} Q${x + r * 0.18} ${y - r * 0.18} ${x + r} ${y} Q${x + r * 0.18} ${y + r * 0.18} ${x} ${y + r} Q${x - r * 0.18} ${y + r * 0.18} ${x - r} ${y} Q${x - r * 0.18} ${y - r * 0.18} ${x} ${y - r}Z`} fill={fill} />;
const slash = <><path d="M9 39 L39 9" stroke={W} strokeWidth="9" strokeLinecap="round" /><path d="M9 39 L39 9" stroke={NO} strokeWidth="4.5" strokeLinecap="round" /></>;

const ICONS: Record<string, (p: Pal) => JSX.Element> = {
  dumbbell: ({ c, e }) => <>
    <rect x="10" y="20.5" width="28" height="7" rx="3.5" fill={e} />
    <rect x="5" y="12" width="8" height="24" rx="3.5" fill={c} />
    <rect x="12" y="15" width="6" height="18" rx="3" fill={e} />
    <rect x="35" y="12" width="8" height="24" rx="3.5" fill={c} />
    <rect x="30" y="15" width="6" height="18" rx="3" fill={e} />
    <rect x="5" y="28" width="8" height="8" rx="3.5" fill={e} opacity=".45" />
    <rect x="35" y="28" width="8" height="8" rx="3.5" fill={e} opacity=".45" />
    {glint(8.5, 17)}{glint(38.5, 17)}
  </>,
  lotus: ({ c, e, s }) => <>
    <path d="M24 35 C15 35 7 29 5 20 C13 19 20 24 24 35Z" fill={s} />
    <path d="M24 35 C33 35 41 29 43 20 C35 19 28 24 24 35Z" fill={s} />
    <path d="M24 35 C16 31 12 22 15 13 C20 16 24 25 24 35Z" fill={e} />
    <path d="M24 35 C32 31 36 22 33 13 C28 16 24 25 24 35Z" fill={e} />
    <path d="M24 8 C31 15 31 27 24 35 C17 27 17 15 24 8Z" fill={c} />
    <ellipse cx="24" cy="38.5" rx="14" ry="3.5" fill={e} opacity=".5" />
    {glint(21.5, 17)}
  </>,
  shoe: ({ c, e, s }) => <>
    <path d="M5 30 C5 23 8 18 13 16 L19 14 C21 19 26 21 31 22 L38 23.5 C42 24.5 44 27.5 44 31 V33 H5Z" fill={c} />
    <path d="M5 30 H44 V33 H5Z" fill={e} opacity=".5" />
    <rect x="4" y="32" width="41" height="7" rx="3.5" fill={W} />
    <rect x="4" y="36" width="41" height="3" rx="1.5" fill={s} />
    <path d="M20 19 L24 17.5 M23 21 L27 19.5 M26.5 22.5 L30 21" stroke={W} strokeWidth="2.2" strokeLinecap="round" />
    <path d="M1 22 H6 M2 27 H5" stroke={e} strokeWidth="2.4" strokeLinecap="round" opacity=".6" />
    {glint(12, 21)}
  </>,
  bike: ({ c, e }) => <>
    <circle cx="12" cy="31" r="8.5" fill="none" stroke={e} strokeWidth="4" />
    <circle cx="36" cy="31" r="8.5" fill="none" stroke={e} strokeWidth="4" />
    <path d="M12 31 L20 19 H31 L36 31 M20 19 L25 31 L31 19" fill="none" stroke={c} strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" />
    <path d="M16 14 H24" stroke={K} strokeWidth="4" strokeLinecap="round" />
    <path d="M29 13 H34 L31.5 19" fill="none" stroke={K} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="25" cy="31" r="3" fill={c} />
  </>,
  ring: ({ c, e }) => <>
    <circle cx="24" cy="25" r="13" fill="none" stroke={e} strokeWidth="9.5" />
    <circle cx="24" cy="24" r="13" fill="none" stroke={c} strokeWidth="9.5" />
    <circle cx="24" cy="24" r="13" fill="none" stroke={W} strokeWidth="9.6" strokeDasharray="10.2 10.2" strokeDashoffset="5" />
    {glint(15, 15)}
  </>,
  ball: ({ c, e }) => <>
    <circle cx="24" cy="24" r="17" fill={c} />
    <path d="M24 7 V41 M7 24 H41 M12 12 C18 18 18 30 12 36 M36 12 C30 18 30 30 36 36" fill="none" stroke={e} strokeWidth="2.6" />
    <path d="M10 33 A17 17 0 0 0 38 33 A20 20 0 0 1 10 33Z" fill={e} opacity=".35" />
    {glint(15, 14)}
  </>,
  book: ({ c, e, s }) => <>
    <path d="M24 15 C18 11 10 11 3 12 V39 C10 38 18 38 24 41 C30 38 38 38 45 39 V12 C38 11 30 11 24 15Z" fill={c} />
    <path d="M3 34 V39 C10 38 18 38 24 41 C30 38 38 38 45 39 V34Z" fill={e} />
    <path d="M24 14 C19 10.5 12 10 6.5 10.5 V35 C12 34.5 19 35 24 38Z" fill={W} />
    <path d="M24 14 C29 10.5 36 10 41.5 10.5 V35 C36 34.5 29 35 24 38Z" fill={s} />
    <path d="M10 17 H19 M10 22 H19 M10 27 H17 M29 17 H38 M29 22 H38" stroke={e} strokeWidth="2" strokeLinecap="round" opacity=".35" />
  </>,
  cap: ({ c, e }) => <>
    <path d="M12 23 V31 C12 36 36 36 36 31 V23 L24 28.5Z" fill={e} />
    <path d="M24 9 L45 18.5 L24 28 L3 18.5Z" fill={c} />
    <path d="M24 9 L45 18.5 L40 20.8 L24 13.5 L8 20.8 L3 18.5Z" fill={W} opacity=".25" />
    <path d="M24 18.5 L40 21 V31" fill="none" stroke={GOLD} strokeWidth="2.6" strokeLinecap="round" />
    <path d="M37.5 31 H42.5 L41.5 37 H38.5Z" fill={GOLD} />
  </>,
  pencil: ({ c, e }) => <>
    <path d="M31 9 L39 17 L17 39 L9 31Z" fill={c} />
    <path d="M35 13 L39 17 L17 39 L13 35Z" fill={e} />
    <path d="M9 31 L17 39 L6 42Z" fill="#ffd6a6" />
    <path d="M6.9 37.8 L10.2 41.1 L6 42Z" fill={K} />
    <path d="M31 9 L34.5 5.5 C36 4 38 4 39.5 5.5 L42.5 8.5 C44 10 44 12 42.5 13.5 L39 17Z" fill="#ff8fab" />
    <path d="M29.5 10.5 L37.5 18.5" stroke={W} strokeWidth="3.5" opacity=".8" />
    {glint(20, 24, 1.8)}
  </>,
  pan: ({ c, e }) => <>
    <path d="M14 9 C12 6 16 5 14 2 M21 9 C19 6 23 5 21 2" fill="none" stroke={e} strokeWidth="2.2" strokeLinecap="round" opacity=".5" />
    <rect x="31" y="25" width="15" height="5.5" rx="2.75" fill={K} />
    <circle cx="19" cy="27.5" r="14" fill={K} />
    <circle cx="19" cy="27" r="11" fill={c} />
    <path d="M13 26 C11 20 19 18 22 20 C27 19 29 25 26 28 C27 33 20 35 17 32 C12 33 10 29 13 26Z" fill={W} />
    <circle cx="19.5" cy="26" r="4" fill={GOLD} />
    {glint(18, 24.5, 1.2)}
  </>,
  apple: ({ c, e }) => <>
    <path d="M24 15 C18 11 7 13 7 24 C7 34 14 43 20 43 C22 43 23 42 24 42 C25 42 26 43 28 43 C34 43 41 34 41 24 C41 13 30 11 24 15Z" fill={c} />
    <path d="M33 16 C38 18 41 21 41 25 C41 34 34 43 28 43 C26 43 25 42 24 42 C30 38 35 28 33 16Z" fill={e} opacity=".45" />
    <path d="M24 15 C24 11 25 8 27.5 5.5" fill="none" stroke="#8b5a2b" strokeWidth="2.8" strokeLinecap="round" />
    <path d="M25.5 10.5 C28 5 34 4.5 37 6.5 C34 11 29 12.5 25.5 10.5Z" fill={LEAF} />
    {glint(14, 22, 2.6)}
  </>,
  plant: ({ c, e }) => <>
    <path d="M24 30 V14" stroke={LEAF2} strokeWidth="3" strokeLinecap="round" />
    <path d="M24 24 C17 24 11 20 10 13 C17 13 23 16 24 24Z" fill={LEAF} />
    <path d="M24 19 C30 18 36 14 37 7 C31 7 25 11 24 19Z" fill={LEAF2} />
    <path d="M14 30 H34 L31 43 H17Z" fill={c} />
    <path d="M28 30 H34 L31 43 H26Z" fill={e} opacity=".5" />
    <rect x="11" y="27" width="26" height="6" rx="2.5" fill={e} />
  </>,
  glass: ({ c, e, s }) => <>
    <path d="M11 7 H37 L33.5 40 C33.3 42 31.5 43.5 29.5 43.5 H18.5 C16.5 43.5 14.7 42 14.5 40Z" fill={s} opacity=".6" />
    <path d="M12.6 19 C16 17 19 21 23 19 C27 17 30 21 35.4 19 L33.5 40 C33.3 42 31.5 43.5 29.5 43.5 H18.5 C16.5 43.5 14.7 42 14.5 40Z" fill={c} />
    <path d="M29 20 L35.4 19 L33.5 40 C33.3 42 31.5 43.5 29.5 43.5 H27 C30 40 31 30 29 20Z" fill={e} opacity=".45" />
    <path d="M11 7 H37 L33.5 40 C33.3 42 31.5 43.5 29.5 43.5 H18.5 C16.5 43.5 14.7 42 14.5 40Z" fill="none" stroke={e} strokeWidth="2.4" strokeLinejoin="round" />
    <circle cx="20" cy="30" r="2" fill={W} opacity=".8" /><circle cx="25" cy="36" r="1.5" fill={W} opacity=".8" /><circle cx="27" cy="26" r="1.2" fill={W} opacity=".8" />
  </>,
  sparkle: ({ c, e, s }) => <>
    {twinkle(21, 25, 16, c)}
    {twinkle(21, 25, 7, s)}
    {twinkle(38, 11, 7, e)}
    {twinkle(38, 38, 5, GOLD)}
  </>,
  bed: ({ c, e }) => <>
    <rect x="4" y="12" width="6" height="30" rx="3" fill={e} />
    <rect x="7" y="27" width="37" height="9" rx="3" fill={c} />
    <rect x="12" y="20" width="12" height="8" rx="4" fill={W} />
    <path d="M22 24 C22 22 24 21 26 21 H41 C43 21 44 23 44 25 V30 H22Z" fill={e} />
    <rect x="7" y="33" width="37" height="3" rx="1.5" fill={e} opacity=".5" />
    <rect x="40" y="34" width="4" height="8" rx="2" fill={e} />
  </>,
  broom: ({ c, e }) => <>
    <path d="M35 4 L22 25" stroke="#c98a4b" strokeWidth="4" strokeLinecap="round" />
    <path d="M17 22 L29 29 L24 42 C17 42 9 37 6 33Z" fill={c} />
    <path d="M23 26 L29 29 L24 42 C21 42 18 41 15 39Z" fill={e} opacity=".45" />
    <path d="M17 22.5 L29 29.5" stroke={e} strokeWidth="5" strokeLinecap="round" />
    <path d="M12 34 L9 38 M17 36 L15 41" stroke={W} strokeWidth="1.8" strokeLinecap="round" opacity=".6" />
    {twinkle(39, 28, 5, GOLD)}{twinkle(42, 39, 3.5, GOLD)}
  </>,
  note: ({ c, e }) => <>
    <path d="M17 12 L39 7 V14 L17 19Z" fill={e} />
    <path d="M17.5 13 V35 M38.5 8 V31" stroke={c} strokeWidth="4" strokeLinecap="round" />
    <ellipse cx="12.5" cy="35.5" rx="6.5" ry="5" transform="rotate(-20 12.5 35.5)" fill={c} />
    <ellipse cx="33.5" cy="31.5" rx="6.5" ry="5" transform="rotate(-20 33.5 31.5)" fill={c} />
    {glint(10.5, 34, 1.6)}{glint(31.5, 30, 1.6)}
  </>,
  palette: ({ c, e }) => <>
    <path d="M24 6 C12 6 4 14 4 24 C4 34 12 42 22 42 C26 42 27 39 25 36 C23 33 25 30 29 30 H34 C40 30 44 26 44 20 C44 12 35 6 24 6Z" fill={c} />
    <path d="M4 26 C5 35 13 42 22 42 C26 42 27 39 25 36 C20 37 9 36 4 26Z" fill={e} opacity=".45" />
    <circle cx="14" cy="18" r="4" fill={NO} /><circle cx="23" cy="12.5" r="4" fill={GOLD} />
    <circle cx="33" cy="14" r="4" fill="#1cb0f6" /><circle cx="12.5" cy="28.5" r="4" fill={W} />
  </>,
  tooth: ({ c, s }) => <>
    <path d="M14 7 C8 7 5 13 6.5 20 C7.5 26 11 28 12 34 C13 40 15 43 17.5 43 C20.5 43 20.5 36 24 36 C27.5 36 27.5 43 30.5 43 C33 43 35 40 36 34 C37 28 40.5 26 41.5 20 C43 13 40 7 34 7 C30 7 28 9.5 24 9.5 C20 9.5 18 7 14 7Z" fill={W} stroke={c} strokeWidth="3" strokeLinejoin="round" />
    <path d="M33 11 C37 11 38.5 14 38 18" fill="none" stroke={s} strokeWidth="3" strokeLinecap="round" />
    {twinkle(15, 18, 5, c)}
  </>,
  bottle: ({ c, e }) => <>
    <rect x="17" y="4" width="14" height="6" rx="2" fill={e} />
    <rect x="19.5" y="9" width="9" height="7" fill={e} />
    <rect x="13" y="15" width="22" height="28" rx="7" fill={c} />
    <path d="M28 15 C32 15 35 18 35 22 V36 C35 40 32 43 28 43 H24 C29 40 30 25 28 15Z" fill={e} opacity=".4" />
    <rect x="17.5" y="23" width="13" height="12" rx="3" fill={W} />
    <path d="M24 25.5 C26 28 27 29.5 27 30.5 C27 32 25.7 33 24 33 C22.3 33 21 32 21 30.5 C21 29.5 22 28 24 25.5Z" fill={c} />
  </>,
  moon: ({ c, e, s }) => <>
    <path d="M30 5 C19 7 12 17 13 28 C14 38 23 44 33 43 C37 42.5 40.5 41 43 38 C32 39 23 31 22.5 21 C22 13.5 25 8.5 30 5Z" fill={c} />
    <path d="M13.3 30 C15 39 23.5 44 33 43 C37 42.5 40.5 41 43 38 C33 40 20 37 13.3 30Z" fill={e} opacity=".5" />
    {twinkle(36, 13, 5, s)}{twinkle(41, 25, 3, GOLD)}
    {glint(17, 22)}
  </>,
  sun: ({ c, e }) => <>
    {Array.from({ length: 8 }, (_, i) => {
      const a = (i * Math.PI) / 4, x1 = 24 + Math.cos(a) * 15, y1 = 24 + Math.sin(a) * 15, x2 = 24 + Math.cos(a) * 20, y2 = 24 + Math.sin(a) * 20;
      return <path key={i} d={`M${x1} ${y1} L${x2} ${y2}`} stroke={c} strokeWidth="4" strokeLinecap="round" />;
    })}
    <circle cx="24" cy="24" r="10.5" fill={c} />
    <path d="M14 27 A10.5 10.5 0 0 0 34 27 A12 12 0 0 1 14 27Z" fill={e} opacity=".45" />
    {glint(20, 19.5)}
  </>,
  nosugar: ({ c, e }) => <>
    <path d="M15 24 L5 17 L7 24 L5 31Z" fill={e} /><path d="M33 24 L43 17 L41 24 L43 31Z" fill={e} />
    <circle cx="24" cy="24" r="10" fill={c} />
    <path d="M18 17 L30 31 M15.5 22 L24 33" stroke={W} strokeWidth="2.6" strokeLinecap="round" opacity=".8" />
    {slash}
  </>,
  nophone: ({ c, e, s }) => <>
    <rect x="14" y="5" width="20" height="38" rx="5" fill={c} />
    <rect x="17" y="10" width="14" height="25" rx="2" fill={s} />
    <circle cx="24" cy="39" r="1.8" fill={e} />
    {slash}
  </>,
  candle: ({ c, e }) => <>
    <circle cx="24" cy="15" r="11" fill={GOLD} opacity=".2" />
    <path d="M24 5 C28.5 10 29.5 13.5 29.5 16 C29.5 19 27 21.5 24 21.5 C21 21.5 18.5 19 18.5 16 C18.5 13 20.5 10 24 5Z" fill={GOLD} />
    <path d="M24 12 C26 14.5 26.5 16 26.5 17.2 C26.5 18.7 25.4 19.6 24 19.6 C22.6 19.6 21.5 18.7 21.5 17.2 C21.5 16 22.3 14.5 24 12Z" fill="#ff8c42" />
    <rect x="17" y="21" width="14" height="19" rx="3" fill={c} />
    <rect x="25" y="21" width="6" height="19" rx="3" fill={e} opacity=".45" />
    <ellipse cx="24" cy="41" rx="13" ry="3.5" fill={e} />
  </>,
  coin: ({ c, e, s }) => <>
    {[38, 32, 26].map(y => <g key={y}>
      <ellipse cx="17" cy={y + 2.5} rx="12" ry="4.5" fill={e} />
      <rect x="5" y={y - 2} width="24" height="4.5" fill={e} />
      <ellipse cx="17" cy={y - 2} rx="12" ry="4.5" fill={c} />
    </g>)}
    <circle cx="32" cy="22" r="12.5" fill={e} />
    <circle cx="32" cy="20.5" r="12.5" fill={c} />
    <circle cx="32" cy="20.5" r="8.5" fill="none" stroke={e} strokeWidth="2" opacity=".6" />
    {twinkle(32, 20.5, 5.5, s)}
    {glint(25.5, 14.5, 1.8)}
  </>,
  phone: ({ c, e }) => <>
    <path d="M14 7 H20 L23.5 15.5 L19 19 C21 24.5 24 27.5 29.5 29.5 L33 25 L41 28.5 V34.5 C41 38 38.5 41 34.5 41 C20 40 8 28 7 13.5 C7 9.5 10 7 14 7Z" fill={c} />
    <path d="M7.4 18 C10 30 20 39.5 34.5 41 C38.5 41 41 38 41 34.5 C38 37 30 37 7.4 18Z" fill={e} opacity=".45" />
    <path d="M29 6 C35 7 40 12 41 18 M28.5 12 C31.5 12.8 34 15.3 34.8 18.5" fill="none" stroke={e} strokeWidth="2.6" strokeLinecap="round" />
  </>,
  pill: ({ c, s }) => <g transform="rotate(-38 24 24)">
    <rect x="6" y="17" width="36" height="14" rx="7" fill={W} stroke={c} strokeWidth="2.6" />
    <path d="M13 17 H24 V31 H13 A7 7 0 0 1 13 17Z" fill={c} />
    <rect x="26" y="20" width="12" height="3" rx="1.5" fill={s} />
  </g>,
  heart: ({ c, e }) => <>
    <path d="M24 42 C10 33 5 26 5 18 C5 12 10 7.5 15.5 7.5 C19.5 7.5 22.5 9.5 24 12.5 C25.5 9.5 28.5 7.5 32.5 7.5 C38 7.5 43 12 43 18 C43 26 38 33 24 42Z" fill={c} />
    <path d="M6 23 C9 30 15 35.5 24 42 C33 35.5 39 30 42 23 C36 31 30 35 24 37 C18 35 12 31 6 23Z" fill={e} opacity=".45" />
    {glint(14, 16, 2.8)}
  </>,
  bulb: ({ c, e }) => <>
    <path d="M24 5 C15.5 5 10 11 10 18.5 C10 24 13 27 15.5 30 C17 32 17.5 33 17.5 35 H30.5 C30.5 33 31 32 32.5 30 C35 27 38 24 38 18.5 C38 11 32.5 5 24 5Z" fill={c} />
    <path d="M31 8 C35 10.5 38 14 38 18.5 C38 24 35 27 32.5 30 C31 32 30.5 33 30.5 35 H26 C28 26 33 20 31 8Z" fill={e} opacity=".4" />
    <rect x="17.5" y="35" width="13" height="4" rx="1.5" fill={K} opacity=".75" />
    <rect x="19" y="39.5" width="10" height="3.5" rx="1.75" fill={K} opacity=".75" />
    <path d="M20 21 L24 25 L28 21 M24 25 V33" fill="none" stroke={W} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" opacity=".8" />
    {glint(17, 14, 2.4)}
  </>,
  code: ({ c, e }) => <>
    <rect x="3" y="7" width="42" height="34" rx="7" fill={c} />
    <rect x="3" y="7" width="42" height="9" rx="7" fill={e} />
    <rect x="3" y="12" width="42" height="4" fill={e} />
    <circle cx="9" cy="11.5" r="1.7" fill={W} opacity=".8" /><circle cx="14" cy="11.5" r="1.7" fill={W} opacity=".8" />
    <path d="M18 22 L12 28 L18 34 M30 22 L36 28 L30 34" fill="none" stroke={W} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M26.5 20.5 L21.5 35.5" stroke={W} strokeWidth="3" strokeLinecap="round" opacity=".7" />
  </>,
  target: ({ c, e }) => <>
    <circle cx="23" cy="26" r="17" fill={c} />
    <circle cx="23" cy="26" r="11.5" fill={W} />
    <circle cx="23" cy="26" r="6.5" fill={c} />
    <circle cx="23" cy="26" r="2.4" fill={W} />
    <path d="M23 26 L41 8" stroke={e} strokeWidth="3.2" strokeLinecap="round" />
    <path d="M36 6 L42 6 L42 12 M39 3.5 L44.5 3.5 L44.5 9" fill="none" stroke={e} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
  </>,
  clock: ({ c, e }) => <>
    <circle cx="24" cy="25.5" r="18" fill={e} />
    <circle cx="24" cy="24" r="18" fill={c} />
    <circle cx="24" cy="24" r="13.5" fill={W} />
    <path d="M24 15 V24 L30 28" fill="none" stroke={K} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="24" cy="24" r="2.2" fill={c} />
  </>,
  paw: ({ c, e }) => <>
    <path d="M24 24 C30 24 37 31 37 36 C37 41 31 41 24 39.5 C17 41 11 41 11 36 C11 31 18 24 24 24Z" fill={c} />
    <ellipse cx="12" cy="20" rx="4.5" ry="6" transform="rotate(-20 12 20)" fill={c} />
    <ellipse cx="36" cy="20" rx="4.5" ry="6" transform="rotate(20 36 20)" fill={c} />
    <ellipse cx="19.5" cy="11.5" rx="4.5" ry="6" transform="rotate(-8 19.5 11.5)" fill={c} />
    <ellipse cx="28.5" cy="11.5" rx="4.5" ry="6" transform="rotate(8 28.5 11.5)" fill={c} />
    <path d="M12 37 C16 39.5 20 39.5 24 38 C28 39.5 32 39.5 36 37 C36 40 31 41 24 39.5 C17 41 12 40 12 37Z" fill={e} opacity=".5" />
    {glint(18, 29)}
  </>,
  checklist: ({ c, e, s }) => <>
    <rect x="8" y="7" width="32" height="37" rx="6" fill={c} />
    <rect x="11.5" y="11" width="25" height="29.5" rx="3" fill={W} />
    <rect x="17" y="4" width="14" height="7" rx="3" fill={e} />
    <path d="M15 19 L17.5 21.5 L21.5 17 M15 29 L17.5 31.5 L21.5 27" fill="none" stroke={LEAF} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M25 19.5 H32 M25 29.5 H32" stroke={s} strokeWidth="2.6" strokeLinecap="round" />
  </>,
  star: ({ c, e }) => <>
    <path d="M24 5 L29.6 16.8 L42.5 18.4 L33 27.3 L35.5 40 L24 33.7 L12.5 40 L15 27.3 L5.5 18.4 L18.4 16.8Z" fill={c} stroke={c} strokeWidth="3.5" strokeLinejoin="round" />
    <path d="M7 19.5 L15 27.3 L12.5 40 L24 33.7 L35.5 40 L33 27.3 L41 19.5 L31 28 L33 36 L24 30.5 L15 36 L17 28Z" fill={e} opacity=".4" />
    {glint(19, 18)}
  </>,
  flag: ({ c, e }) => <>
    <path d="M11 6 V43" stroke={K} strokeWidth="3.6" strokeLinecap="round" />
    <path d="M12 8 C20 4 26 12 40 8 V26 C26 30 20 22 12 26Z" fill={c} />
    <path d="M12 20 C20 16 26 24 40 20 V26 C26 30 20 22 12 26Z" fill={e} opacity=".45" />
    {glint(17, 13)}
  </>
};

export const ICON_IDS = Object.keys(ICONS);

export function HabitIcon({ icon, color = 'orange', size = 32 }: { icon: string; color?: Color; size?: number }) {
  const draw = ICONS[icon] || ICONS.star;
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" className="hicon">
      {draw(PALETTES[color] || PALETTES.orange)}
    </svg>
  );
}

// ── Pick an icon from the habit's name ──
const BY_CATEGORY: Record<string, string> = {
  pushups: 'dumbbell', squats: 'dumbbell', plank: 'dumbbell', gym: 'dumbbell', workout: 'dumbbell', skipping: 'dumbbell',
  yoga: 'lotus', stretch: 'lotus', meditate: 'lotus', walkdog: 'paw', running: 'shoe', walking: 'shoe', cycling: 'bike',
  swimming: 'ring', sports: 'ball', reading: 'book', study: 'cap', writing: 'pencil', cooking: 'pan', healthyfood: 'apple',
  plants: 'plant', water: 'glass', dishes: 'sparkle', makebed: 'bed', cleaning: 'broom', music: 'note', art: 'palette',
  teeth: 'tooth', skincare: 'bottle'
};
const BY_WORD: [RegExp, string][] = [
  [/\b(code|coding|program|leetcode|dsa)/i, 'code'],
  [/(sugar|sweet|candy|chocolate|junk|soda|dessert)/i, 'nosugar'],
  [/(phone|social|screen|instagram|youtube|reels|scroll|tiktok|snap)/i, 'nophone'],
  [/(sleep|bed ?time|bed by|nap)/i, 'moon'],
  [/(wake|early|morning|sunrise)/i, 'sun'],
  [/(pray|namaz|puja|worship|god|church|mantra)/i, 'candle'],
  [/(money|budget|save|saving|invest|spend|expense)/i, 'coin'],
  [/\b(call|phone mom|phone dad)/i, 'phone'],
  [/(vitamin|medicine|pill|tablet|supplement)/i, 'pill'],
  [/(gratitude|grateful|thank|kind|love|compliment|forgive)/i, 'heart'],
  [/(plan|goal|review)/i, 'target'],
  [/(on time|punctual|routine)/i, 'clock'],
  [/(think|idea|learn|brain|focus)/i, 'bulb']
];

export function iconFor(name: string, category: string | null | undefined = classify(name).category) {
  const n = name || '';
  const word = BY_WORD.find(([re]) => re.test(n));
  if (word && (word[1] === 'code' || word[1] === 'nosugar' || word[1] === 'nophone' || !category)) return word[1];
  if (category && BY_CATEGORY[category]) return BY_CATEGORY[category];
  return word ? word[1] : 'star';
}
