import { useEffect, useRef, useState } from 'react';
import { MagnifyingGlass, Plus, Trash, X } from '@phosphor-icons/react';
import { AnimatePresence } from 'motion/react';
import { addOwnBook, customBooks, deleteCustomBook, finished, history, position, POPULAR, BEAUTIFUL, SOURCES, searchEach, type BookRef, type Found, type Source } from '../../lib/books';
import { openExternal } from '../../lib/net';
import { play } from '../../lib/sound';
import { toast } from '../../lib/celebrate';
import { HabitIcon } from '../../components/HabitIcon';
import { Mascot } from '../../components/Mascot';
import { Page } from './Page';
import { Reader } from './Reader';

const GRADS = [['#ff8c42', '#ff5f6d'], ['#1cb0f6', '#a560e8'], ['#12c79b', '#1cb0f6'], ['#a560e8', '#ff7eb6'], ['#ffc800', '#ff8c42'], ['#2f3542', '#5a6478']];
const hash = (s: string) => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };

export function Cover({ b, size = 'm' }: { b: BookRef; size?: 's' | 'm' }) {
  const [bad, setBad] = useState(!b.coverUrl);
  const g = GRADS[hash(b.id) % GRADS.length];
  return (
    <span className={'cover ' + size} style={{ background: `linear-gradient(150deg, ${g[0]}, ${g[1]})` }}>
      {!bad && <img src={b.coverUrl} alt="" loading="lazy" onError={() => setBad(true)} />}
      {bad && <><HabitIcon icon="book" color="orange" size={size === 's' ? 26 : 34} /><b>{b.title}</b></>}
    </span>
  );
}

export function Library({ onBack }: { onBack: () => void }) {
  const [q, setQ] = useState('');
  const [src, setSrc] = useState<Source | 'all'>('all');
  const [found, setFound] = useState<Found[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<BookRef | null>(null);
  const [, refresh] = useState(0);
  const [manage, setManage] = useState(false);
  const file = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!q.trim()) { setFound(null); return; }
    let cancel = () => {};
    const t = setTimeout(() => {
      setBusy(true);
      setFound([]);
      const bySource = new Map<string, Found[]>();
      cancel = searchEach(q.trim(), src, (source, books) => {
        bySource.set(source, books);
        // interleave so every source shows near the top
        const lists = [...bySource.values()], out: Found[] = [];
        for (let k = 0; lists.some(l => k < l.length); k++) lists.forEach(l => { if (l[k]) out.push(l[k]); });
        setFound(out);
      }, failed => { setBusy(false); if (failed && !bySource.size) toast('Couldn’t reach the libraries. Are you online?'); });
    }, 450);
    return () => { clearTimeout(t); cancel(); };
  }, [q, src]);

  const reading = history().filter(h => !finished().some(f => String(f.id) === h.id)).slice(0, 8);
  const mine = customBooks();
  const done = finished();
  const openBook = (b: BookRef) => {
    if (b.format === 'web') { play('tap'); toast('This textbook opens on its website'); openExternal(b.url!); return; }
    play('pop'); setOpen(b);
  };
  const topic = (s: Source, t: string) => { play('tap'); setSrc(s); setQ(t); };
  const onFile = async (f?: File) => {
    if (!f) return;
    setBusy(true);
    try { const b = await addOwnBook(f); play('add'); toast(`Added “${b.title}”`, 'good'); refresh(x => x + 1); }
    catch (e) { play('error'); toast((e as Error).message); }
    finally { setBusy(false); if (file.current) file.current.value = ''; }
  };

  return (
    <Page title="Library" onBack={onBack}>
      <div className="search">
        <MagnifyingGlass size={22} weight="bold" />
        <input placeholder="Search free books…" value={q} onChange={e => setQ(e.target.value)} />
        {q && <button type="button" onClick={() => setQ('')} aria-label="Clear"><X size={18} weight="bold" /></button>}
      </div>
      <div className="chips src-chips">
        <button type="button" className={'chip' + (src === 'all' ? ' on' : '')} onClick={() => { play('toggle'); setSrc('all'); }}>All</button>
        {SOURCES.map(x => <button key={x.id} type="button" className={'chip' + (src === x.id ? ' on' : '')} onClick={() => { play('toggle'); setSrc(x.id); }}>{x.name}</button>)}
      </div>

      {found !== null ? (
        <>
          <h2 className="section-title">{found.length} results {busy && <small>searching…</small>}</h2>
          <div className="book-grid">
            {found.map(b => (
              <button key={b.id} type="button" className="book" onClick={() => openBook(b)}>
                <Cover b={b} /><b>{b.title}</b><small>{SOURCES.find(x => x.id === b.source)?.name}{b.author ? ` · ${b.author}` : ''}</small>
              </button>
            ))}
          </div>
          {!busy && !found.length && <div className="empty-state"><Mascot size={80} mood="sleepy" /><b>No books found</b><span>Try a title or an author, like “Dracula”.</span></div>}
        </>
      ) : (
        <>
          {reading.length > 0 && <>
            <h2 className="section-title">Continue reading</h2>
            <div className="shelf">
              {reading.map(h => {
                const b: BookRef = { id: h.id, title: h.title, url: h.url || (/^\d+$/.test(h.id) ? `https://www.gutenberg.org/cache/epub/${h.id}/pg${h.id}.txt` : undefined), coverUrl: h.coverUrl, own: h.id.startsWith('custom_'), source: h.source || (/^\d+$/.test(h.id) ? 'gutenberg' : undefined), format: h.format || 'text' };
                const f = h.fraction ?? position(h.id);
                return (
                  <button key={h.id} type="button" className="book wide card" onClick={() => openBook(b)}>
                    <Cover b={b} size="s" />
                    <span><b>{h.title}</b><div className="progress thin"><i style={{ width: `${Math.max(3, f * 100)}%` }} /></div><small>{Math.round(f * 100)}% read</small></span>
                  </button>
                );
              })}
            </div>
          </>}

          <h2 className="section-title">My books
            {mine.length > 0 && <button type="button" className="link" onClick={() => setManage(m => !m)}>{manage ? 'Done' : 'Edit'}</button>}
          </h2>
          <div className="book-grid">
            <button type="button" className="book add" onClick={() => { play('tap'); file.current?.click(); }} disabled={busy}>
              <span className="cover m add-cover"><Plus size={34} weight="bold" /></span><b>{busy ? 'Adding…' : 'Add a book'}</b><small>TXT · EPUB · PDF</small>
            </button>
            {mine.map(m => {
              const b: BookRef = { id: String(m.id), title: m.title, own: true, fileType: m.fileType };
              return (
                <div key={m.id} className="book-wrap">
                  <button type="button" className="book" onClick={() => openBook(b)}><Cover b={b} /><b>{m.title}</b><small>{m.fileType === 'pdf' ? 'PDF' : m.fileType === 'epub' ? 'EPUB' : 'Text'} · {Math.round(position(b.id) * 100)}%</small></button>
                  {manage && <button type="button" className="book-del" aria-label={`Delete ${m.title}`} onClick={async () => { await deleteCustomBook(b.id); play('whoosh'); refresh(x => x + 1); }}><Trash size={18} weight="bold" /></button>}
                </div>
              );
            })}
          </div>
          <input ref={file} type="file" accept=".txt,.md,.text,.epub,.pdf" hidden onChange={e => onFile(e.target.files?.[0])} />

          <h2 className="section-title">Modern &amp; free</h2>
          <div className="topic-row">
            {['Habits', 'Productivity', 'Psychology', 'Science', 'Business', 'Philosophy', 'Health'].map(t => <button key={t} type="button" className="card topic" onClick={() => topic('ia', t)}>{t}</button>)}
          </div>
          <h2 className="section-title">Free textbooks</h2>
          <div className="topic-row">
            {['Programming', 'Mathematics', 'Biology', 'Economics', 'Psychology', 'Writing'].map(t => <button key={t} type="button" className="card topic" onClick={() => topic('otl', t)}>{t}</button>)}
          </div>
          <h2 className="section-title">Beautifully typeset classics</h2>
          <div className="book-grid">
            {BEAUTIFUL.map(b => <button key={b.id} type="button" className="book" onClick={() => openBook(b)}><Cover b={b} /><b>{b.title}</b><small>{b.author}</small></button>)}
          </div>
          <h2 className="section-title">Popular classics</h2>
          <div className="book-grid">
            {POPULAR.map(b => (
              <button key={b.id} type="button" className="book" onClick={() => openBook(b)}><Cover b={b} /><b>{b.title}</b><small>{b.author}</small></button>
            ))}
          </div>

          {done.length > 0 && <>
            <h2 className="section-title">Finished <small>{done.length}</small></h2>
            <div className="book-grid">
              {done.slice().reverse().map(f => {
                const b: BookRef = { id: String(f.id), title: f.title, url: f.url || (/^\d+$/.test(String(f.id)) ? `https://www.gutenberg.org/cache/epub/${f.id}/pg${f.id}.txt` : undefined), coverUrl: f.coverUrl, own: String(f.id).startsWith('custom_'), source: f.source || (/^\d+$/.test(String(f.id)) ? 'gutenberg' : undefined), format: f.format || 'text' };
                return <button key={f.id} type="button" className="book done" onClick={() => openBook(b)}><Cover b={b} /><b>{f.title}</b><small>Finished {new Date(f.finishedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</small></button>;
              })}
            </div>
          </>}
        </>
      )}

      <AnimatePresence>{open && <Reader key={open.id} book={open} onClose={() => { setOpen(null); refresh(x => x + 1); }} />}</AnimatePresence>
    </Page>
  );
}

