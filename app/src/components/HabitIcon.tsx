// Ultradian's own illustrated icons (no emoji anywhere): chunky, rounded, with a darker lower
// shade and a white glint, drawn in the habit's colour so the whole set looks like one family.
import { artOf, isCustom, parseCustom } from '../lib/customIcons';
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
  speech: ({ c, e }) => <>
    <path d="M7 7 H35 C38.3 7 41 9.7 41 13 V27 C41 30.3 38.3 33 35 33 H19 L11 40 V33 H7 C4.8 33 3 31.2 3 29 V11 C3 8.8 4.8 7 7 7Z" fill={c} />
    <path d="M3 26 V29 C3 31.2 4.8 33 7 33 H11 V40 L19 33 H35 C38.3 33 41 30.3 41 27 V26 C40 28.5 38 30 35 30 H7 C5 30 3.5 28.5 3 26Z" fill={e} opacity=".45" />
    <path d="M10 26 L15 13 L20 26 M11.8 21.5 H18.2" stroke={W} strokeWidth="2.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M25 16 H34 M25 21.5 H31" stroke={W} strokeWidth="2.8" strokeLinecap="round" opacity=".85" />
    {twinkle(42, 40, 4.5, GOLD)}
  </>,
  mic: ({ c, e }) => <>
    <rect x="16" y="4" width="16" height="26" rx="8" fill={c} />
    <path d="M24 4 C28.4 4 32 7.6 32 12 V22 C32 26.4 28.4 30 24 30Z" fill={e} opacity=".35" />
    <path d="M19.5 11 H23 M19.5 16 H23 M19.5 21 H23" stroke={W} strokeWidth="2" strokeLinecap="round" opacity=".75" />
    <path d="M10 22 C10 30 16.3 35.5 24 35.5 C31.7 35.5 38 30 38 22" stroke={K} strokeWidth="3.2" fill="none" strokeLinecap="round" />
    <path d="M24 35.5 V42 M17 43 H31" stroke={K} strokeWidth="3.2" strokeLinecap="round" />
  </>,
  headphones: ({ c, e }) => <>
    <path d="M8 29 V24 C8 14.6 15.2 7 24 7 C32.8 7 40 14.6 40 24 V29" stroke={e} strokeWidth="4.5" fill="none" strokeLinecap="round" />
    <rect x="4" y="24" width="11" height="18" rx="5.5" fill={c} />
    <rect x="33" y="24" width="11" height="18" rx="5.5" fill={c} />
    {glint(8.5, 29, 1.6)}{glint(37.5, 29, 1.6)}
  </>,
  guitar: ({ c, e }) => <>
    <path d="M24 24 L40 8" stroke="#c98a4b" strokeWidth="4.5" strokeLinecap="round" />
    <rect x="37" y="2.5" width="8" height="8" rx="2" transform="rotate(45 41 6.5)" fill={K} />
    <circle cx="16" cy="32" r="11.5" fill={c} />
    <circle cx="24" cy="24" r="8" fill={c} />
    <path d="M6 38 C8 43 15 46 21 42 C14 43 9 41 6 38Z" fill={e} opacity=".5" />
    <circle cx="19.5" cy="28.5" r="3.6" fill={K} />
    <rect x="9.5" y="34" width="8" height="2.8" rx="1.2" transform="rotate(-45 13.5 35.4)" fill={K} />
    <path d="M13 35 L40.5 7.5" stroke={W} strokeWidth=".9" opacity=".8" />
  </>,
  piano: ({ c, e, s }) => <>
    <rect x="3" y="11" width="42" height="28" rx="5" fill={c} />
    <rect x="6" y="19" width="36" height="17" rx="2" fill={W} />
    {[11.1, 16.3, 21.4, 26.6, 31.7, 36.9].map(x => <path key={x} d={`M${x} 19 V36`} stroke={s} strokeWidth="1.4" />)}
    {[9.5, 14.7, 24.9, 30.1, 35.3].map(x => <rect key={x} x={x} y="19" width="3.2" height="10" rx="1" fill={K} />)}
    <rect x="3" y="36" width="42" height="3" rx="1.5" fill={e} opacity=".6" />
    <circle cx="10" cy="15" r="1.5" fill={W} opacity=".7" /><circle cx="15" cy="15" r="1.5" fill={W} opacity=".7" />
  </>,
  laptop: ({ c, e, s }) => <>
    <rect x="8" y="8" width="32" height="23" rx="3" fill={c} />
    <rect x="11" y="11" width="26" height="17" rx="1.5" fill={s} />
    <path d="M15 15.5 H27 M15 19.5 H32 M15 23.5 H23" stroke={c} strokeWidth="2.2" strokeLinecap="round" />
    <path d="M2 33 H46 L42.5 39 H5.5Z" fill={e} />
    <rect x="19" y="33" width="10" height="2" rx="1" fill={W} opacity=".6" />
  </>,
  calculator: ({ c, e, s }) => <>
    <rect x="9" y="3" width="30" height="42" rx="6" fill={c} />
    <rect x="13" y="7" width="22" height="9" rx="2" fill={s} />
    <path d="M27 11.5 H31" stroke={c} strokeWidth="2" strokeLinecap="round" />
    {[22, 29.5, 37].map(y => [17, 24, 31].map((x, i) => <rect key={`${x}${y}`} x={x - 2.8} y={y - 2.8} width="5.6" height="5.6" rx="1.6" fill={i === 2 ? e : W} />))}
  </>,
  globe: ({ c, e }) => <>
    <circle cx="24" cy="24" r="19" fill={c} />
    <path d="M13 11 C18 9 23 12 21 17 C19 21 13 19.5 11.5 24 C9 21 8.5 14.5 13 11Z" fill={LEAF} />
    <path d="M27 24 C31.5 21.5 37.5 25 36.3 30.5 C35 36 29.5 39.5 27.2 35.8 C25 32.5 29.5 29.5 27 24Z" fill={LEAF} />
    <path d="M28 8 C32.5 8.5 37 11.5 38 15.5 C33.5 16.5 29 14 28 8Z" fill={LEAF} />
    <path d="M6 30 C9 38 16 43 24 43 C32 43 38.5 38.5 41.5 31.5 C36 37 27 39 20 37.5 C14 36 9 33.5 6 30Z" fill={e} opacity=".4" />
    {glint(15, 13, 2.4)}
  </>,
  flask: ({ c, e, s }) => <>
    <path d="M19 6 H29 V17.5 L39.5 36.5 C41.3 39.8 39 43.5 35.2 43.5 H12.8 C9 43.5 6.7 39.8 8.5 36.5 L19 17.5Z" fill={s} />
    <path d="M13.5 28 H34.5 L39.5 36.5 C41.3 39.8 39 43.5 35.2 43.5 H12.8 C9 43.5 6.7 39.8 8.5 36.5Z" fill={c} />
    <path d="M19 6 H29 V17.5 L39.5 36.5 C41.3 39.8 39 43.5 35.2 43.5 H12.8 C9 43.5 6.7 39.8 8.5 36.5 L19 17.5Z" fill="none" stroke={e} strokeWidth="2.2" strokeLinejoin="round" />
    <rect x="16.5" y="3" width="15" height="4.5" rx="2.2" fill={e} />
    <circle cx="20" cy="35" r="2.2" fill={W} opacity=".85" /><circle cx="27" cy="38.5" r="1.6" fill={W} opacity=".85" /><circle cx="30" cy="32" r="1.2" fill={W} opacity=".85" />
  </>,
  chess: ({ c, e }) => <>
    <path d="M15 37 C15 31 18 28.5 20 26 C17 25.5 14 24 13.5 21 C13 17 16 12 20.5 9.5 L19 4.5 L24.5 8 C31 8 35 13.5 35 20.5 C35 27 32 31 32 37Z" fill={c} />
    <path d="M28 9.5 C32.5 11.5 35 15.5 35 20.5 C35 27 32 31 32 37 H26 C27.5 30 30.5 25 30.5 19 C30.5 15 29.5 12 28 9.5Z" fill={e} opacity=".4" />
    <circle cx="22" cy="15" r="2" fill={W} />
    <rect x="11" y="36" width="26" height="7" rx="3" fill={e} />
  </>,
  puzzle: ({ c, e }) => <>
    <path d="M7 14 H17.5 C16.5 11 17.5 7.5 21.5 7.5 C25.5 7.5 26.5 11 25.5 14 H35 V23.5 C38 22.5 41.5 23.5 41.5 27.5 C41.5 31.5 38 32.5 35 31.5 V41 H25.5 C26.5 38 25.5 34.5 21.5 34.5 C17.5 34.5 16.5 38 17.5 41 H7Z" fill={c} />
    <path d="M7 36 V41 H17.5 C16.5 38 17.5 34.5 21.5 34.5 C25.5 34.5 26.5 38 25.5 41 H35 V36Z" fill={e} opacity=".45" />
    {glint(12, 19)}
  </>,
  camera: ({ c, e }) => <>
    <path d="M5 16 C5 13.8 6.8 12 9 12 H15 L18 7 H30 L33 12 H39 C41.2 12 43 13.8 43 16 V36 C43 38.2 41.2 40 39 40 H9 C6.8 40 5 38.2 5 36Z" fill={c} />
    <path d="M5 33 V36 C5 38.2 6.8 40 9 40 H39 C41.2 40 43 38.2 43 36 V33Z" fill={e} opacity=".45" />
    <circle cx="24" cy="25.5" r="10" fill={W} />
    <circle cx="24" cy="25.5" r="7" fill={K} />
    <circle cx="21.5" cy="23" r="2" fill={W} opacity=".85" />
    <rect x="34" y="16" width="5" height="3" rx="1.2" fill={W} opacity=".75" />
  </>,
  shower: ({ c, s }) => <>
    <path d="M10 44 V13 C10 8.5 13.5 5 18 5 H21 C25.5 5 29 8.5 29 13 V14" stroke={K} strokeWidth="3.2" fill="none" strokeLinecap="round" />
    <path d="M20 14 H38 C38 19.5 34 23 29 23 C24 23 20 19.5 20 14Z" fill={c} />
    {[[23, 29], [29, 31], [35, 28], [26, 38], [32, 39], [38, 36]].map(([x, y]) => <ellipse key={`${x}${y}`} cx={x} cy={y} rx="1.7" ry="2.8" fill={s} />)}
  </>,
  alarm: ({ c, e }) => <>
    <path d="M5 14 C4 8.5 8.5 4.5 14 5.5 L7.5 15.5Z" fill={e} />
    <path d="M43 14 C44 8.5 39.5 4.5 34 5.5 L40.5 15.5Z" fill={e} />
    <path d="M14 39 L10.5 43.5 M34 39 L37.5 43.5" stroke={e} strokeWidth="3.2" strokeLinecap="round" />
    <circle cx="24" cy="26" r="16" fill={c} />
    <circle cx="24" cy="26" r="12" fill={W} />
    <path d="M24 18.5 V26 L29.5 29.5" stroke={K} strokeWidth="2.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </>,
  footsteps: ({ c, e }) => <>
    <ellipse cx="15" cy="32" rx="6" ry="9" transform="rotate(-10 15 32)" fill={c} />
    {[[9.5, 20.5, 2.2], [13, 18.3, 2], [16.6, 18.4, 1.8], [19.8, 20, 1.6]].map(([x, y, r]) => <circle key={`a${x}`} cx={x} cy={y} r={r} fill={c} />)}
    <ellipse cx="33" cy="20" rx="6" ry="9" transform="rotate(10 33 20)" fill={e} />
    {[[27.5, 8.5, 2.2], [31, 6.3, 2], [34.6, 6.4, 1.8], [37.8, 8, 1.6]].map(([x, y, r]) => <circle key={`b${x}`} cx={x} cy={y} r={r} fill={e} />)}
  </>,
  mountain: ({ c, e }) => <>
    <circle cx="38" cy="10" r="4.5" fill={GOLD} />
    <path d="M2 41 L18 14 L26 27 L32 18 L46 41Z" fill={c} />
    <path d="M18 14 L30 34 L26 41 H34 L46 41 L32 18 L28 24Z" fill={e} opacity=".35" />
    <path d="M18 14 L23.5 23 L20.5 21.5 L17.5 24.5 L14.5 20.5Z" fill={W} />
    <path d="M32 18 L35.8 24.5 L33 23.5 L31 25.5 L29.3 22.3Z" fill={W} />
  </>,
  kettlebell: ({ c, e }) => <>
    <path d="M15.5 19 C13.5 18 12.5 15.5 12.5 13 C12.5 7.5 17.8 4.5 24 4.5 C30.2 4.5 35.5 7.5 35.5 13 C35.5 15.5 34.5 18 32.5 19" stroke={K} strokeWidth="4" fill="none" strokeLinecap="round" />
    <circle cx="24" cy="30" r="14" fill={c} />
    <path d="M10.5 33 C12 39 17.5 44 24 44 C30.5 44 36 39 37.5 33 C34 38 29.5 40.5 24 40.5 C18.5 40.5 14 38 10.5 33Z" fill={e} opacity=".45" />
    <rect x="13" y="41" width="22" height="4" rx="2" fill={e} />
    {glint(18, 24, 2.4)}
  </>,
  bat: ({ c }) => <>
    <g transform="rotate(38 24 24)">
      <rect x="19" y="15" width="10" height="30" rx="4" fill="#e8c38a" />
      <rect x="24" y="15" width="5" height="30" rx="2.5" fill="#c99a5b" opacity=".5" />
      <rect x="21.5" y="2" width="5" height="14" rx="2" fill={c} />
    </g>
    <circle cx="38" cy="38" r="6" fill={NO} />
    <path d="M34 34.5 C36 37 36 39.5 34 41.5" stroke={W} strokeWidth="1.2" fill="none" opacity=".8" />
  </>,
  racket: ({ c, e, s }) => <>
    <path d="M27 27 L41 41" stroke={e} strokeWidth="5.5" strokeLinecap="round" />
    <ellipse cx="19" cy="19" rx="12" ry="14" transform="rotate(-45 19 19)" fill={s} opacity=".6" />
    <path d="M9 19 H29 M10.5 13 H27.5 M10.5 25 H27.5 M19 9 V29 M13 10.5 V27.5 M25 10.5 V27.5" stroke={c} strokeWidth="1" opacity=".6" />
    <ellipse cx="19" cy="19" rx="12" ry="14" transform="rotate(-45 19 19)" fill="none" stroke={c} strokeWidth="3.5" />
  </>,
  salad: ({ c, e }) => <>
    <circle cx="15" cy="21" r="6.5" fill={LEAF} /><circle cx="24" cy="17.5" r="7.5" fill={LEAF2} /><circle cx="33" cy="21" r="6.5" fill={LEAF} />
    <circle cx="20" cy="21" r="3" fill={NO} /><circle cx="29" cy="21.5" r="2.7" fill={GOLD} />
    <path d="M5 25 H43 C43 35 35 43 24 43 C13 43 5 35 5 25Z" fill={c} />
    <path d="M7 31 C9.5 38 16 43 24 43 C32 43 38.5 38 41 31 C36 36 30.5 38.5 24 38.5 C17.5 38.5 12 36 7 31Z" fill={e} opacity=".45" />
    <rect x="3" y="23" width="42" height="4" rx="2" fill={e} />
  </>,
  tea: ({ c, e }) => <>
    <path d="M14 13 C12 10 16 9 14 5 M21 13 C19 10 23 9 21 5" fill="none" stroke={e} strokeWidth="2.2" strokeLinecap="round" opacity=".5" />
    <path d="M34 22 H37 C40 22 42 24.2 42 27 C42 29.8 40 32 37 32 H33" stroke={c} strokeWidth="3.6" fill="none" />
    <path d="M7 17 H35 V30 C35 37.2 29.2 42 21 42 C12.8 42 7 37.2 7 30Z" fill={c} />
    <path d="M7 30 C7 37.2 12.8 42 21 42 C29.2 42 35 37.2 35 30 V28 C33 34 28 37.5 21 37.5 C14 37.5 9 34 7 28Z" fill={e} opacity=".45" />
    <path d="M28 17 V11" stroke={K} strokeWidth="1.4" /><rect x="25" y="7" width="6" height="5" rx="1" fill={GOLD} />
    <ellipse cx="21" cy="44" rx="16" ry="2.5" fill={e} opacity=".5" />
  </>,
  nocaffeine: ({ c, e }) => <>
    <path d="M34 20 H37 C40 20 42 22.2 42 25 C42 27.8 40 30 37 30 H33" stroke={c} strokeWidth="3.6" fill="none" />
    <path d="M7 15 H35 V28 C35 35.2 29.2 40 21 40 C12.8 40 7 35.2 7 28Z" fill={c} />
    <ellipse cx="21" cy="16" rx="13" ry="2.5" fill={e} />
    {slash}
  </>,
  nocig: ({ c }) => <>
    <path d="M36 22 C34 18 38 16 36 11 M41 22 C39 18 43 16 41 11" fill="none" stroke="#9aa0ad" strokeWidth="2" strokeLinecap="round" />
    <rect x="4" y="26" width="34" height="8" rx="2" fill={W} stroke={c} strokeWidth="1.6" />
    <rect x="4" y="26" width="10" height="8" rx="2" fill={GOLD} />
    <rect x="37" y="26" width="6" height="8" rx="2" fill={NO} />
    {slash}
  </>,
  noalcohol: ({ c, e }) => <>
    <path d="M14 5 H34 C34 16 30.5 23 24 23 C17.5 23 14 16 14 5Z" fill={c} />
    <path d="M14.4 11 H33.6 C33 18 29.5 23 24 23 C18.5 23 15 18 14.4 11Z" fill={e} opacity=".5" />
    <path d="M24 23 V37" stroke={K} strokeWidth="3" />
    <path d="M15 39 H33" stroke={K} strokeWidth="3.6" strokeLinecap="round" />
    {slash}
  </>,
  nojunk: () => <>
    <path d="M8 22 C8 13 15 8 24 8 C33 8 40 13 40 22Z" fill={GOLD} />
    <circle cx="18" cy="14" r="1.1" fill={W} /><circle cx="25" cy="12" r="1.1" fill={W} /><circle cx="31" cy="15" r="1.1" fill={W} />
    <path d="M7 23 H41 L38.5 27 L35 24.5 L31.5 27 L28 24.5 L24.5 27 L21 24.5 L17.5 27 L14 24.5 L10.5 27Z" fill={LEAF} />
    <rect x="7" y="26" width="34" height="6.5" rx="3.2" fill="#8b5a2b" />
    <path d="M8 33.5 H40 V35 C40 38 38 40 35 40 H13 C10 40 8 38 8 35Z" fill={GOLD} />
    {slash}
  </>,
  smile: ({ c, e }) => <>
    <circle cx="24" cy="24" r="19" fill={c} />
    <path d="M6 30 C9 38 16 43 24 43 C32 43 39 38 42 30 C37 36 31 39 24 39 C17 39 11 36 6 30Z" fill={e} opacity=".4" />
    <ellipse cx="17.5" cy="20" rx="2.6" ry="3.6" fill={K} /><ellipse cx="30.5" cy="20" rx="2.6" ry="3.6" fill={K} />
    <path d="M15 27.5 C18 33.5 30 33.5 33 27.5" stroke={K} strokeWidth="3" fill="none" strokeLinecap="round" />
    <ellipse cx="12.5" cy="27" rx="3" ry="2" fill="#ff9fb3" opacity=".8" /><ellipse cx="35.5" cy="27" rx="3" ry="2" fill="#ff9fb3" opacity=".8" />
    {glint(14, 12)}
  </>,
  home: ({ c, e }) => <>
    <path d="M7 22 L24 8 L41 22 V39 C41 40.7 39.7 42 38 42 H10 C8.3 42 7 40.7 7 39Z" fill={c} />
    <path d="M3.5 23 L24 6 L44.5 23" stroke={e} strokeWidth="4.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="19" y="28" width="10" height="14" rx="2" fill={W} />
    <path d="M24 22.5 C22 20 18.5 21 18.5 23.5 C18.5 25.5 21 27 24 28.5 C27 27 29.5 25.5 29.5 23.5 C29.5 21 26 20 24 22.5Z" fill={W} transform="translate(0 -6) scale(1)" />
  </>,
  calendar: ({ c, e, s }) => <>
    <rect x="5" y="10" width="38" height="33" rx="6" fill={e} />
    <rect x="5" y="8" width="38" height="33" rx="6" fill={W} />
    <path d="M5 14 C5 10.7 7.7 8 11 8 H37 C40.3 8 43 10.7 43 14 V18 H5Z" fill={c} />
    <rect x="13" y="4" width="4.5" height="9" rx="2.2" fill={K} /><rect x="30.5" y="4" width="4.5" height="9" rx="2.2" fill={K} />
    {[[12, 24], [20, 24], [28, 24], [36, 24], [12, 32], [20, 32]].map(([x, y]) => <rect key={`${x}${y}`} x={x - 2.8} y={y - 2.6} width="5.6" height="5.2" rx="1.5" fill={s} />)}
    <rect x="25.2" y="29.4" width="5.6" height="5.2" rx="1.5" fill={c} />
    <path d="M34 31 L36 33.5 L40 28.5" stroke={LEAF} strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </>,
  piggy: ({ c, e }) => <>
    <circle cx="24" cy="8.5" r="4.5" fill={GOLD} />
    <path d="M17 18 L20 11 L25 17Z" fill={e} />
    <rect x="13" y="34" width="5.5" height="9" rx="2.5" fill={e} /><rect x="28" y="34" width="5.5" height="9" rx="2.5" fill={e} />
    <ellipse cx="23" cy="28" rx="16" ry="12" fill={c} />
    <path d="M7 27 C4 26 3.5 23 5.5 22" stroke={c} strokeWidth="2.2" fill="none" strokeLinecap="round" />
    <ellipse cx="38.5" cy="27" rx="4.5" ry="5" fill={e} />
    <circle cx="37.5" cy="26" r="1" fill={K} opacity=".6" /><circle cx="40" cy="26" r="1" fill={K} opacity=".6" />
    <circle cx="31" cy="23" r="1.7" fill={K} />
    <rect x="18" y="18" width="10" height="2.6" rx="1.3" fill={K} opacity=".55" />
  </>,
  leaf: ({ c, e }) => <>
    <path d="M9 39 C7 22 18 8 41 6 C42 28 31 41 9 39Z" fill={c} />
    <path d="M9 39 C20 39.5 31 34 37 20 C33 30 22 36 9 39Z" fill={e} opacity=".4" />
    <path d="M9 39 C17 31 25 23 35 13" stroke={W} strokeWidth="2.4" fill="none" strokeLinecap="round" opacity=".7" />
    <path d="M9 39 L5 43" stroke={e} strokeWidth="3" strokeLinecap="round" />
  </>,
  sunrise: ({ c, e }) => <>
    {[180, 225, 270, 315, 360].map(a => { const r = (a * Math.PI) / 180; return <path key={a} d={`M${24 + Math.cos(r) * 15} ${31 + Math.sin(r) * 15} L${24 + Math.cos(r) * 20} ${31 + Math.sin(r) * 20}`} stroke={c} strokeWidth="3.6" strokeLinecap="round" />; })}
    <path d="M12 31 A12 12 0 0 1 36 31Z" fill={c} />
    <path d="M4 32 H44" stroke={e} strokeWidth="3.6" strokeLinecap="round" />
    <path d="M12 38.5 H36" stroke={e} strokeWidth="3" strokeLinecap="round" opacity=".6" />
    <path d="M24 13 V6 M20.5 9 L24 5.5 L27.5 9" stroke={e} strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0" />
  </>,
  trophy: ({ c, e }) => <>
    <path d="M14 10 H8 C8 17.5 11 21 16 21" stroke={c} strokeWidth="3.2" fill="none" />
    <path d="M34 10 H40 C40 17.5 37 21 32 21" stroke={c} strokeWidth="3.2" fill="none" />
    <path d="M13 5 H35 V15 C35 22.7 30.1 28 24 28 C17.9 28 13 22.7 13 15Z" fill={c} />
    <path d="M30 5 H35 V15 C35 22.7 30.1 28 24 28 C28 25 30 20 30 15Z" fill={e} opacity=".4" />
    <rect x="21.5" y="27" width="5" height="8" fill={e} />
    <rect x="14" y="34" width="20" height="8" rx="2.5" fill={e} />
    {twinkle(24, 15, 5, W)}
  </>,
  notebook: ({ c, e }) => <>
    <rect x="9" y="4" width="31" height="40" rx="5" fill={c} />
    <path d="M9 9 C9 6.2 11.2 4 14 4 H16 V44 H14 C11.2 44 9 41.8 9 39Z" fill={e} />
    <rect x="21" y="12" width="14" height="8" rx="2" fill={W} />
    <path d="M30 4 V17 L33 14 L36 17 V4Z" fill={NO} />
    <path d="M21 27 H34 M21 32 H30" stroke={W} strokeWidth="2.4" strokeLinecap="round" opacity=".6" />
  </>,
  brain: ({ c, e }) => <>
    <path d="M24 8 C20 5 13 6 12 11.5 C7 12.5 5 18 7 22 C4 25.5 5 31.5 9.5 33.5 C9.5 38.5 14.5 42 19 40 C21 43 24 42 24 39Z" fill={c} />
    <path d="M24 8 C28 5 35 6 36 11.5 C41 12.5 43 18 41 22 C44 25.5 43 31.5 38.5 33.5 C38.5 38.5 33.5 42 29 40 C27 43 24 42 24 39Z" fill={e} />
    <path d="M24 9 V39" stroke={W} strokeWidth="2" opacity=".7" />
    <path d="M13 18 C16 18 17 21 15.5 23.5 M11 28 C14 27 17 29 16.5 32 M33 16 C30.5 17 30.5 20.5 32.5 22 M36 27 C33 27 31 30 32.5 33" stroke={W} strokeWidth="2" fill="none" strokeLinecap="round" opacity=".7" />
  </>,
  chat: ({ c, e }) => <>
    <path d="M8 9 H34 C37.3 9 40 11.7 40 15 V28 C40 31.3 37.3 34 34 34 H20 L12 41 V34 H8 C4.7 34 3 31.3 3 28 V15 C3 11.7 4.7 9 8 9Z" fill={c} />
    <path d="M3 26 V28 C3 31.3 4.7 34 8 34 H12 V41 L20 34 H34 C37.3 34 40 31.3 40 28 V26 C40 29 37 31 34 31 H8 C5 31 3 29 3 26Z" fill={e} opacity=".45" />
    <circle cx="13" cy="21.5" r="2.8" fill={W} /><circle cx="21.5" cy="21.5" r="2.8" fill={W} /><circle cx="30" cy="21.5" r="2.8" fill={W} />
    {twinkle(41, 9, 5.5, GOLD)}
  </>,
  gear: ({ c, e }) => <>
    <g transform="translate(24 25)">
      {Array.from({ length: 8 }, (_, i) => <rect key={i} x="-4.5" y="-20" width="9" height="10" rx="2.5" fill={e} transform={`rotate(${i * 45})`} />)}
    </g>
    <g transform="translate(24 23.5)">
      {Array.from({ length: 8 }, (_, i) => <rect key={i} x="-4.5" y="-20" width="9" height="10" rx="2.5" fill={c} transform={`rotate(${i * 45})`} />)}
      <circle r="14" fill={c} />
      <circle r="6" fill={W} />
    </g>
    {glint(16, 15)}
  </>,
  flag: ({ c, e }) => <>
    <path d="M11 6 V43" stroke={K} strokeWidth="3.6" strokeLinecap="round" />
    <path d="M12 8 C20 4 26 12 40 8 V26 C26 30 20 22 12 26Z" fill={c} />
    <path d="M12 20 C20 16 26 24 40 20 V26 C26 30 20 22 12 26Z" fill={e} opacity=".45" />
    {glint(17, 13)}
  </>
};

export const ICON_IDS = Object.keys(ICONS);
/** UI-only drawings, not offered for habits */
export const UI_ICONS = ['flag', 'chat', 'gear'];
export const HABIT_ICONS = ICON_IDS.filter(i => !UI_ICONS.includes(i));

/** Each icon's natural colour, so habits never need a colour picker */
const ICON_COLOR: Record<string, Color> = {
  dumbbell: 'orange', kettlebell: 'orange', lotus: 'mint', shoe: 'blue', footsteps: 'blue', bike: 'purple', ring: 'blue', ball: 'orange',
  bat: 'blue', racket: 'mint', mountain: 'mint', book: 'blue', notebook: 'purple', cap: 'purple', pencil: 'yellow', speech: 'blue', mic: 'red',
  headphones: 'purple', guitar: 'orange', piano: 'purple', note: 'red', laptop: 'blue', code: 'purple', calculator: 'orange', globe: 'blue',
  flask: 'mint', chess: 'purple', puzzle: 'yellow', brain: 'red', bulb: 'yellow', camera: 'purple', palette: 'red', pan: 'orange', apple: 'red',
  salad: 'mint', plant: 'orange', leaf: 'mint', glass: 'blue', tea: 'mint', nocaffeine: 'orange', nosugar: 'red', nojunk: 'red', nocig: 'red',
  noalcohol: 'purple', nophone: 'red', sparkle: 'mint', bed: 'blue', broom: 'purple', home: 'orange', shower: 'blue', tooth: 'blue', bottle: 'mint',
  moon: 'purple', sun: 'yellow', sunrise: 'orange', alarm: 'red', candle: 'orange', coin: 'yellow', piggy: 'red', phone: 'mint', pill: 'purple',
  heart: 'red', smile: 'yellow', target: 'red', trophy: 'yellow', calendar: 'blue', clock: 'blue', checklist: 'yellow', paw: 'orange', star: 'yellow'
};
export const colorFor = (icon: string): Color => (isCustom(icon) ? parseCustom(icon).color : ICON_COLOR[icon] || 'orange');

export function HabitIcon({ icon, color = 'orange', size = 32 }: { icon: string; color?: Color; size?: number }) {
  if (isCustom(icon)) {
    const art = artOf(icon), { kind } = parseCustom(icon);
    if (kind === 'img' && art) return <img src={art} width={size} height={size} alt="" className="hicon photo" style={{ borderRadius: size * 0.28 }} />;
    if (kind === 'ph' && art) {
      const pal = PALETTES[color] || PALETTES.orange;
      return <svg width={size} height={size} viewBox="-24 -24 304 304" aria-hidden="true" className="hicon" fill={pal.c} style={{ filter: `drop-shadow(0 ${Math.max(1, size / 22)}px 0 ${pal.e})` }} dangerouslySetInnerHTML={{ __html: art }} />;
    }
  }
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
  [/\b(code|coding|program|leetcode|dsa|develop)/i, 'code'],
  [/(sugar|sweet|candy|chocolate|dessert)/i, 'nosugar'],
  [/(junk|fast ?food|burger|pizza|fries|fried)/i, 'nojunk'],
  [/(smok|cigar|vape|tobacco)/i, 'nocig'],
  [/(alcohol|beer|wine|drunk|liquor|whisk)/i, 'noalcohol'],
  [/(coffee|caffeine|energy drink)/i, 'nocaffeine'],
  [/(phone|social|screen|instagram|youtube|reels|scroll|tiktok|snap)/i, 'nophone'],
  [/(english|speak|speech|talk|conversation|pronunc|accent|public speaking|debate)/i, 'speech'],
  [/(sing|vocal|karaoke|record)/i, 'mic'],
  [/(podcast|audiobook|listen)/i, 'headphones'],
  [/guitar|ukulele/i, 'guitar'],
  [/(piano|keyboard|synth)/i, 'piano'],
  [/(language|spanish|french|german|japanese|korean|duolingo|vocab|travel|geograph)/i, 'globe'],
  [/(math|calculus|algebra|account)/i, 'calculator'],
  [/(science|chemistry|physics|biology|lab)/i, 'flask'],
  [/chess/i, 'chess'],
  [/(puzzle|sudoku|crossword|rubik)/i, 'puzzle'],
  [/(photo|camera|vlog)/i, 'camera'],
  [/(work|email|office|design|freelanc|client|project|laptop)/i, 'laptop'],
  [/(shower|bath)/i, 'shower'],
  [/(wake|alarm|early)/i, 'alarm'],
  [/(morning routine|sunrise|morning)/i, 'sunrise'],
  [/(sleep|bed ?time|bed by|nap)/i, 'moon'],
  [/(steps|10k|10,000)/i, 'footsteps'],
  [/(hike|hiking|trek|climb)/i, 'mountain'],
  [/kettlebell/i, 'kettlebell'],
  [/cricket/i, 'bat'],
  [/(badminton|tennis|squash|pickleball)/i, 'racket'],
  [/(salad|vegetable|veggie|greens)/i, 'salad'],
  [/(tea\b|green tea|herbal)/i, 'tea'],
  [/(vegan|nature|outdoor|garden)/i, 'leaf'],
  [/(journal|diary)/i, 'notebook'],
  [/(pray|namaz|puja|worship|god|church|mantra)/i, 'candle'],
  [/(save money|saving|piggy)/i, 'piggy'],
  [/(money|budget|invest|spend|expense)/i, 'coin'],
  [/\b(call|phone mom|phone dad)/i, 'phone'],
  [/(family|parents|home|house)/i, 'home'],
  [/(vitamin|medicine|pill|tablet|supplement)/i, 'pill'],
  [/(gratitude|grateful|thank|smile|happy|compliment)/i, 'smile'],
  [/(kind|love|forgive)/i, 'heart'],
  [/(plan|schedule|review|calendar)/i, 'calendar'],
  [/(goal|win|achieve)/i, 'trophy'],
  [/(on time|punctual|routine)/i, 'clock'],
  [/(think|brain|memor|focus|learn)/i, 'brain'],
  [/(idea|create|build|invent|startup)/i, 'bulb']
];

export function iconFor(name: string, category: string | null | undefined = classify(name).category) {
  const n = name || '';
  const word = BY_WORD.find(([re]) => re.test(n));
  // Specific words win over the broad photo categories (e.g. "practice English" is speaking, not study)
  if (word && (!category || !['reading', 'workout', 'gym', 'running', 'walking', 'cooking', 'teeth', 'yoga', 'meditate', 'swimming', 'cycling', 'plants', 'water', 'makebed', 'dishes', 'art'].includes(category))) return word[1];
  if (category && BY_CATEGORY[category]) return BY_CATEGORY[category];
  return word ? word[1] : 'star';
}
