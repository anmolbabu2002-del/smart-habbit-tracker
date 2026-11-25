// The reader: the book flows into CSS columns, one screen per page. Long books are split into
// sections so only one is laid out at a time. Position is saved as a share of the whole book.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, TextAa, Headphones, Pause, X, Minus, Plus } from '@phosphor-icons/react';
import { load, markFinished, position, savePosition, type BookRef, type Loaded } from '../../lib/books';
import { sentences, speak, stopSpeaking, voices, type Voice } from '../../lib/speech';
import { party } from '../../lib/celebrate';
import { onBack } from '../../lib/back';
import { play } from '../../lib/sound';
import { haptic } from '../../lib/native';
import { Sheet } from '../../components/Sheet';
import { Mascot } from '../../components/Mascot';

type Prefs = { theme: 'paper' | 'white' | 'sepia' | 'night'; size: number; font: 'serif' | 'sans'; rate: number; voice?: string };
const THEMES = { paper: ['#f6ecd2', '#2b2318'], white: ['#fbfaf7', '#1f1f1f'], sepia: ['#ead7b5', '#5b4636'], night: ['#16181d', '#cfc8b8'] } as const;
const loadPrefs = (): Prefs => { try { return { theme: 'paper', size: 19, font: 'serif', rate: 1, ...JSON.parse(localStorage.getItem('readerPrefs2') || '{}') }; } catch { return { theme: 'paper', size: 19, font: 'serif', rate: 1 }; } };
const esc = (s: string) => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!));
const GAP = 48;

/** Split a book into sections of HTML, each with its share of the book's characters */
function sectionsOf(book: Loaded) {
  if (book.kind === 'html') return book.chapters.map(h => ({ html: h, len: Math.max(1, h.replace(/<[^>]+>/g, '').length) }));
  const paras = book.text.split(/\n{2,}/);
  const out: { html: string; len: number }[] = [];
  let cur: string[] = [], n = 0;
  paras.forEach(p => {
    const t = p.trim();
    if (!t) return;
    cur.push(`<p>${esc(t).replace(/\n/g, '<br>')}</p>`); n += t.length;
    if (n > 30000) { out.push({ html: cur.join(''), len: n }); cur = []; n = 0; }
  });
  if (cur.length) out.push({ html: cur.join(''), len: n });
  return out;
}

export function Reader({ book, onClose }: { book: BookRef; onClose: () => void }) {
  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState('');
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs);
  const [sec, setSec] = useState(0);
  const [page, setPage] = useState(0);
  const [pages, setPages] = useState(1);
  const [chrome, setChrome] = useState(true);
  const [settings, setSettings] = useState(false);
  const [listening, setListening] = useState(false);
  const [vs, setVs] = useState<Voice[]>([]);
  const [w, setW] = useState(0);
  const flow = useRef<HTMLDivElement>(null);
  const view = useRef<HTMLDivElement>(null);
  const pendingOverall = useRef<number | null>(position(book.id)); // share of the whole book
  const pendingFrac = useRef<number | null>(null);                  // share of the current section
  const goEnd = useRef(false);
  const speakingRef = useRef(false);
  const touch = useRef<{ x: number; y: number; t: number } | null>(null);

  const sections = useMemo(() => (data ? sectionsOf(data) : []), [data]);
  const total = useMemo(() => sections.reduce((n, s) => n + s.len, 0), [sections]);
  const before = (i: number) => sections.slice(0, i).reduce((n, s) => n + s.len, 0);
  const fraction = total ? (before(sec) + (pages > 1 ? page / (pages - 1) : 0) * sections[sec].len) / total : 0;

  useEffect(() => { load(book).then(setData).catch(e => setError((e as Error).message)); }, [book]);
  useEffect(() => { localStorage.setItem('readerPrefs2', JSON.stringify(prefs)); }, [prefs]);
  useEffect(() => {
    const off = onBack(() => { if (settings) { setSettings(false); return true; } close(); return true; });
    return off;
  }); // eslint-disable-line react-hooks/exhaustive-deps

  /** Which section a share of the whole book falls in, and where inside it */
  const locate = (f: number) => {
    let t = f * total, i = 0;
    while (i < sections.length - 1 && t > sections[i].len) { t -= sections[i].len; i++; }
    return { i, within: Math.min(1, t / sections[i].len) };
  };

  // Lay out the current section and count its pages
  useLayoutEffect(() => {
    const v = view.current, f = flow.current;
    if (!v || !f || !sections.length) return;
    if (pendingOverall.current !== null) {
      const { i, within } = locate(pendingOverall.current);
      pendingOverall.current = null;
      pendingFrac.current = within;
      if (i !== sec) { setSec(i); return; }
    }
    const measure = () => {
      const width = v.clientWidth;
      setW(width);
      const n = Math.max(1, Math.round((f.scrollWidth + GAP) / (width + GAP)));
      setPages(n);
      if (pendingFrac.current !== null) { setPage(Math.min(n - 1, Math.round(pendingFrac.current * (n - 1)))); pendingFrac.current = null; }
      else if (goEnd.current) { setPage(n - 1); goEnd.current = false; }
      else setPage(p => Math.min(p, n - 1));
    };
    measure();
    const imgs = Array.from(f.querySelectorAll('img'));
    imgs.forEach(im => { if (!im.complete) im.addEventListener('load', measure, { once: true }); });
    const ro = new ResizeObserver(measure);
    ro.observe(v);
    return () => ro.disconnect();
  }, [sec, sections, prefs.size, prefs.font]);

  // Save progress (and celebrate the last page)
  useEffect(() => {
    if (!sections.length) return;
    savePosition(book, fraction);
    if (sec === sections.length - 1 && page === pages - 1 && pages > 0 && markFinished(book)) {
      setTimeout(() => party({ kind: 'feat', icon: 'book', title: 'Book finished!', text: `You read “${book.title}” to the end. Legend.` }), 500);
    }
  }, [sec, page, pages]); // eslint-disable-line react-hooks/exhaustive-deps

  const next = useCallback(() => {
    if (page < pages - 1) setPage(p => p + 1);
    else if (sec < sections.length - 1) { setSec(s => s + 1); setPage(0); }
    else return false;
    play('whoosh');
    setChrome(false);
    return true;
  }, [page, pages, sec, sections.length]);
  const prev = () => {
    if (page > 0) setPage(p => p - 1);
    else if (sec > 0) { goEnd.current = true; setSec(s => s - 1); }
    else return;
    play('whoosh');
    setChrome(false);
  };
  const jump = (f: number) => { const { i, within } = locate(f); if (i === sec) setPage(Math.round(within * (pages - 1))); else { pendingFrac.current = within; setSec(i); } };

  // ── Read aloud: paragraph by paragraph from the first one on this page ──
  const blocks = () => Array.from(flow.current?.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, blockquote') || []) as HTMLElement[];
  const pageOf = (el: HTMLElement) => Math.floor((el.offsetLeft + 4) / (w + GAP));
  const nextRef = useRef(next);
  nextRef.current = next;
  const pageRef = useRef(page);
  pageRef.current = page;

  async function listen() {
    speakingRef.current = true;
    setListening(true);
    voices().then(setVs);
    const all = await voices();
    const voice = all.find(v => v.id === prefs.voice) || all.find(v => /^en/i.test(v.lang)) || null;
    while (speakingRef.current) {
      const list = blocks();
      const start = list.findIndex(el => pageOf(el) >= pageRef.current);
      if (start < 0) { if (!nextRef.current()) break; await new Promise(r => setTimeout(r, 400)); continue; }
      for (let i = start; i < list.length && speakingRef.current; i++) {
        const el = list[i];
        const p = pageOf(el);
        if (p > pageRef.current) { setPage(p); await new Promise(r => setTimeout(r, 300)); }
        el.classList.add('speaking');
        for (const s of sentences(el.innerText)) { if (!speakingRef.current) break; if (!(await speak(s, { voice, rate: prefs.rate }))) { if (speakingRef.current) await new Promise(r => setTimeout(r, 150)); } }
        el.classList.remove('speaking');
      }
      if (!speakingRef.current) break;
      if (!nextRef.current()) break; // end of the book
      await new Promise(r => setTimeout(r, 450));
    }
    speakingRef.current = false;
    setListening(false);
  }
  const stopListen = () => { speakingRef.current = false; stopSpeaking(); flow.current?.querySelectorAll('.speaking').forEach(e => e.classList.remove('speaking')); setListening(false); };
  function close() { stopListen(); onClose(); }
  useEffect(() => () => { speakingRef.current = false; stopSpeaking(); }, []);

  // keep the screen on
  useEffect(() => {
    let l: { release: () => Promise<void> } | null = null;
    (navigator as unknown as { wakeLock?: { request: (t: string) => Promise<{ release: () => Promise<void> }> } }).wakeLock?.request('screen').then(x => { l = x; }).catch(() => {});
    return () => { l?.release().catch(() => {}); };
  }, []);

  const [bg, fg] = THEMES[prefs.theme];
  const onTap = (x: number) => {
    const third = innerWidth / 3;
    if (x < third) prev(); else if (x > third * 2) next(); else { setChrome(c => !c); haptic.tap(); }
  };

  return (
    <motion.div className={'reader theme-' + prefs.theme} style={{ background: bg, color: fg }} initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }}>
      <header className={'rd-top' + (chrome ? '' : ' hide')}>
        <button type="button" className="rd-ic" onClick={() => { play('tap'); close(); }} aria-label="Back"><ArrowLeft size={24} weight="bold" /></button>
        <b>{book.title}</b>
        <button type="button" className="rd-ic" onClick={() => { play('tap'); setSettings(true); }} aria-label="Text settings"><TextAa size={24} weight="bold" /></button>
        <button type="button" className={'rd-ic' + (listening ? ' on' : '')} onClick={() => { play('tap'); if (listening) stopListen(); else listen(); }} aria-label="Read aloud"><Headphones size={24} weight="bold" /></button>
      </header>

      {!data && !error && <div className="rd-loading"><Mascot size={90} mood="happy" className="bob" /><b>Opening your book…</b></div>}
      {error && <div className="rd-loading"><Mascot size={90} mood="sleepy" /><b>{error}</b><button type="button" className="btn" onClick={close}>Back to library</button></div>}

      {data && (
        <div className="rd-view" ref={view}
          onPointerDown={e => { touch.current = { x: e.clientX, y: e.clientY, t: Date.now() }; }}
          onPointerUp={e => {
            const t = touch.current; touch.current = null;
            if (!t) return;
            const dx = e.clientX - t.x, dy = e.clientY - t.y;
            if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) { if (dx < 0) next(); else prev(); }
            else if (Math.abs(dx) < 10 && Math.abs(dy) < 10 && !(window.getSelection()?.toString())) onTap(e.clientX);
          }}>
          <div className={'rd-flow font-' + prefs.font} ref={flow}
            style={{ columnWidth: w ? `${w}px` : '100vw', columnGap: `${GAP}px`, fontSize: prefs.size, transform: `translateX(${-page * (w + GAP)}px)` }}
            dangerouslySetInnerHTML={{ __html: sections[sec]?.html || '' }} />
        </div>
      )}

      {data && (
        <footer className={'rd-bottom' + (chrome || listening ? '' : ' hide')}>
          {listening ? (
            <div className="rd-player">
              <button type="button" className="btn round" onClick={stopListen} aria-label="Stop reading"><Pause size={24} weight="fill" /></button>
              <span><b>Reading aloud</b><small>{vs.find(v => v.id === prefs.voice)?.name || 'Default voice'} · {prefs.rate}×</small></span>
              <button type="button" className="rd-ic" onClick={() => setSettings(true)} aria-label="Voice settings"><TextAa size={22} weight="bold" /></button>
            </div>
          ) : (
            <>
              <input type="range" className="rd-slider" min={0} max={1000} value={Math.round(fraction * 1000)} onChange={e => jump(Number(e.target.value) / 1000)} aria-label="Position in book" />
              <small>{Math.round(fraction * 100)}% · page {page + 1} of {pages}{sections.length > 1 ? ` in part ${sec + 1}/${sections.length}` : ''}</small>
            </>
          )}
        </footer>
      )}
      {!listening && !chrome && data && <span className="rd-pct">{Math.round(fraction * 100)}%</span>}

      <Sheet open={settings} onClose={() => setSettings(false)} title="Reading">
        <div className="editor">
          <h3 className="field-label">Theme</h3>
          <div className="rd-themes">
            {(Object.keys(THEMES) as Prefs['theme'][]).map(t => (
              <button key={t} type="button" className={'rd-theme' + (prefs.theme === t ? ' on' : '')} style={{ background: THEMES[t][0], color: THEMES[t][1] }} onClick={() => { play('toggle'); setPrefs({ ...prefs, theme: t }); }}>Aa<small>{t[0].toUpperCase() + t.slice(1)}</small></button>
            ))}
          </div>
          <h3 className="field-label">Text size</h3>
          <div className="stepper">
            <button type="button" className="btn round ghost" onClick={() => setPrefs({ ...prefs, size: Math.max(14, prefs.size - 1) })} aria-label="Smaller"><Minus size={20} weight="bold" /></button>
            <b>{prefs.size}</b>
            <button type="button" className="btn round ghost" onClick={() => setPrefs({ ...prefs, size: Math.min(30, prefs.size + 1) })} aria-label="Bigger"><Plus size={20} weight="bold" /></button>
          </div>
          <div className="chips wrap">
            <button type="button" className={'chip' + (prefs.font === 'serif' ? ' on' : '')} onClick={() => setPrefs({ ...prefs, font: 'serif' })}>Book serif</button>
            <button type="button" className={'chip' + (prefs.font === 'sans' ? ' on' : '')} onClick={() => setPrefs({ ...prefs, font: 'sans' })}>Clean sans</button>
          </div>
          <h3 className="field-label">Read-aloud speed</h3>
          <div className="chips wrap">
            {[0.8, 1, 1.2, 1.5, 2].map(r => <button key={r} type="button" className={'chip' + (prefs.rate === r ? ' on' : '')} onClick={() => setPrefs({ ...prefs, rate: r })}>{r}×</button>)}
          </div>
          <VoicePicker value={prefs.voice} onChange={v => setPrefs({ ...prefs, voice: v })} />
          {listening && <p className="fine">Changes apply from the next paragraph.</p>}
          <button type="button" className="btn block" onClick={() => setSettings(false)}><X size={18} weight="bold" /> Done</button>
        </div>
      </Sheet>
    </motion.div>
  );
}

function VoicePicker({ value, onChange }: { value?: string; onChange: (v?: string) => void }) {
  const [list, setList] = useState<Voice[]>([]);
  useEffect(() => { voices().then(setList); }, []);
  if (!list.length) return <p className="fine">No voices found on this device.</p>;
  return (
    <>
      <h3 className="field-label">Voice</h3>
      <select className="field" value={value || ''} onChange={e => onChange(e.target.value || undefined)}>
        <option value="">Default English voice</option>
        {list.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
      </select>
    </>
  );
}
