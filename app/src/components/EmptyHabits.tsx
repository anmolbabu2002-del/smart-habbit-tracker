// No habits yet: one calm illustration, one line, one button.
import { Plus } from '@phosphor-icons/react';
import { play } from '../lib/sound';

export function EmptyHabits({ onCustom }: { onCustom: () => void }) {
  return (
    <section className="empty-habits">
      <svg className="eh-art" viewBox="0 0 200 200" aria-hidden="true">
        <defs>
          <radialGradient id="eh-bg" cx="50%" cy="45%" r="55%"><stop offset="0" stopColor="#fff4ea" /><stop offset="1" stopColor="#ffe2cc" /></radialGradient>
          <linearGradient id="eh-soil" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffb27a" /><stop offset="1" stopColor="#ff8c42" /></linearGradient>
          <linearGradient id="eh-leaf" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#5fe0bd" /><stop offset="1" stopColor="#0c9e7a" /></linearGradient>
        </defs>
        <circle cx="100" cy="100" r="92" fill="url(#eh-bg)" />
        <circle cx="100" cy="100" r="92" fill="none" stroke="#ffd2b0" strokeWidth="2" strokeDasharray="3 9" strokeLinecap="round" className="eh-ring" />
        <ellipse cx="100" cy="146" rx="52" ry="10" fill="#f6c8a4" opacity=".55" />
        <path d="M56 142 C64 124 82 118 100 118 C118 118 136 124 144 142 Z" fill="url(#eh-soil)" />
        <path d="M100 120 C100 104 100 92 100 80" stroke="#0c9e7a" strokeWidth="4" strokeLinecap="round" fill="none" />
        <g className="eh-sprout">
          <path d="M100 98 C86 98 74 90 72 76 C86 75 98 82 100 98 Z" fill="url(#eh-leaf)" />
          <path d="M100 86 C112 85 124 76 126 62 C112 62 101 71 100 86 Z" fill="url(#eh-leaf)" />
        </g>
        <circle cx="148" cy="64" r="4" fill="#ffc800" className="eh-dot d1" />
        <circle cx="58" cy="58" r="3" fill="#1cb0f6" className="eh-dot d2" />
        <circle cx="154" cy="112" r="2.5" fill="#a560e8" className="eh-dot d3" />
      </svg>
      <b>No habits yet</b>
      <span>Start with one small thing you want to do every day.</span>
      <button type="button" className="btn big eh-btn" onClick={() => { play('tap'); onCustom(); }}><Plus size={20} weight="bold" /> Create habit</button>
    </section>
  );
}
