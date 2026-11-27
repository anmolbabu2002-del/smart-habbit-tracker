// Two small tiles at the start of the icon grid: Search (any of ~1,500 icons, in your colour)
// and Photo (your own picture). Icons you've made come right after them.
import { useEffect, useRef, useState } from 'react';
import { MagnifyingGlass, Camera, X } from '@phosphor-icons/react';
import { HabitIcon } from './HabitIcon';
import { searchIcons, saveCustom, photoToIcon, parseCustom } from '../lib/customIcons';
import { useApp } from '../lib/store';
import { play } from '../lib/sound';
import { toast } from '../lib/celebrate';
import { COLORS, type Color } from '../lib/types';
import { uid } from '../lib/store';

export function CustomIconTiles({ current, onPick }: { current: string; onPick: (icon: string) => void }) {
  const s = useApp();
  const [search, setSearch] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const mine = s.myIcons || [];

  const onPhoto = async (f?: File) => {
    if (!f) return;
    try {
      const { art, color } = await photoToIcon(f);
      const id = `img:${uid()}|${color}`;
      saveCustom(id, art);
      play('pop');
      onPick(id);
    } catch {
      toast('Couldn’t use that photo. Try another one.');
    }
  };

  if (search) return <IconSearch onClose={() => setSearch(false)} onPick={onPick} />;
  return (
    <>
      <button type="button" className="icon-pick tool" aria-label="Search all icons" onClick={() => { play('tap'); setSearch(true); }}>
        <MagnifyingGlass size={22} weight="bold" /><small>Search</small>
      </button>
      <button type="button" className="icon-pick tool" aria-label="Use a photo" onClick={() => { play('tap'); file.current?.click(); }}>
        <Camera size={22} weight="fill" /><small>Photo</small>
      </button>
      <input ref={file} type="file" accept="image/*" hidden onChange={e => { onPhoto(e.target.files?.[0]); e.target.value = ''; }} />
      {mine.map(id => (
        <button key={id} type="button" className={'icon-pick' + (id === current ? ' on' : '')} aria-label="Your icon" onClick={() => { play('toggle'); onPick(id); }}>
          <HabitIcon icon={id} color={parseCustom(id).color} size={26} />
        </button>
      ))}
    </>
  );
}

function IconSearch({ onClose, onPick }: { onClose: () => void; onPick: (icon: string) => void }) {
  const [q, setQ] = useState('');
  const [color, setColor] = useState<Color>('orange');
  const [results, setResults] = useState<[string, string][] | null>(null);
  useEffect(() => {
    let alive = true;
    const t = setTimeout(() => { searchIcons(q).then(r => { if (alive) setResults(r); }); }, 120);
    return () => { alive = false; clearTimeout(t); };
  }, [q]);
  const pal: Record<Color, string> = { orange: '#ff8c42', mint: '#12c79b', blue: '#1cb0f6', purple: '#a560e8', yellow: '#ffc800', red: '#ff4b4b' };

  return (
    <div className="isearch">
      <div className="isearch-bar">
        <MagnifyingGlass size={18} weight="bold" />
        <input autoFocus placeholder="Search icons: guitar, dog, water…" value={q} onChange={e => setQ(e.target.value)} />
        <button type="button" aria-label="Close search" onClick={() => { play('tap'); onClose(); }}><X size={18} weight="bold" /></button>
      </div>
      <div className="isearch-colors" role="radiogroup" aria-label="Colour">
        {COLORS.map(c => (
          <button key={c} type="button" role="radio" aria-checked={c === color} className={c === color ? 'on' : ''} style={{ background: pal[c] }}
            onClick={() => { play('toggle'); setColor(c); }} aria-label={c} />
        ))}
      </div>
      <div className="isearch-grid">
        {results === null ? <p className="isearch-note">Loading icons…</p>
          : results.length === 0 ? <p className="isearch-note">Nothing for “{q}”. Try another word.</p>
          : results.map(([name, svg]) => (
            <button key={name} type="button" className="icon-pick" aria-label={name}
              onClick={() => { const id = `ph:${name}|${color}`; saveCustom(id, svg); play('pop'); onPick(id); }}>
              <svg viewBox="-24 -24 304 304" width={26} height={26} fill={pal[color]} dangerouslySetInnerHTML={{ __html: svg }} />
            </button>
          ))}
      </div>
    </div>
  );
}
