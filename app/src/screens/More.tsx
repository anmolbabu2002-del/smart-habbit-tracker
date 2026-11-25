import { HabitIcon } from '../components/HabitIcon';
import { play } from '../lib/sound';
import type { Color } from '../lib/types';

export type MorePage = 'library' | 'journal' | 'chat' | 'meditate' | 'settings';
const TILES: { id: MorePage; title: string; sub: string; icon: string; color: Color; wide?: boolean }[] = [
  { id: 'library', title: 'Library', sub: 'Read and listen to books', icon: 'book', color: 'orange', wide: true },
  { id: 'chat', title: 'Anmol AI', sub: 'Your coach', icon: 'chat', color: 'blue' },
  { id: 'journal', title: 'Journal', sub: 'Clear your head', icon: 'pencil', color: 'purple' },
  { id: 'meditate', title: 'Meditate', sub: 'Breathe', icon: 'lotus', color: 'mint' },
  { id: 'settings', title: 'Settings', sub: 'Lock, backup, theme', icon: 'gear', color: 'yellow' }
];

export function More({ open }: { open: (p: MorePage) => void }) {
  return (
    <main className="screen">
      <header className="page-head"><h1>More</h1></header>
      <div className="more-grid">
        {TILES.map(t => (
          <button key={t.id} type="button" className={'card more-tile' + (t.wide ? ' wide' : '')} style={{ ['--tc' as string]: `var(--${t.color}-soft)` }} onClick={() => { play('tap'); open(t.id); }}>
            <span className="more-ico"><HabitIcon icon={t.icon} color={t.color} size={t.wide ? 60 : 50} /></span>
            <b>{t.title}</b><small>{t.sub}</small>
          </button>
        ))}
      </div>
    </main>
  );
}
