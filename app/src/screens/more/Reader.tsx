// The reader: the book flows into CSS columns, one screen per page. Long books are split into
// sections so only one is laid out at a time. Position is saved as a share of the whole book.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, TextAa, Headphones, Pause, Play, X, Minus, Plus, Stop, CaretRight, Check, SpeakerHigh, WifiHigh } from '@phosphor-icons/react';
import { load, markFinished, position, savePosition, type BookRef, type Loaded } from '../../lib/books';
import { readFrom, pauseReading, stopReading, setReadRate, readVoices, previewVoice, onReadEvents, readState, langName, type RVoice } from '../../lib/readAloud';
import { party } from '../../lib/celebrate';
import { onBack } from '../../lib/back';
import { play } from '../../lib/sound';
import { haptic } from '../../lib/native';
import { Sheet } from '../../components/Sheet';
import { Mascot } from '../../components/Mascot';

type Prefs = { theme: 'paper' | 'white' | 'sepia' | 'night'; size: number; font: 'serif' | 'sans'; rate: number; voice?: string; align: 'left' | 'justify'; spacing: number };
const THEMES = { paper: ['#f6ecd2', '#2b2318'], white: ['#fbfaf7', '#1f1f1f'], sepia: ['#ead7b5', '#5b4636'], night: ['#16181d', '#cfc8b8'] } as const;
const DEF: Prefs = { theme: 'paper', size: 18, font: 'serif', rate: 1, align: 'left', spacing: 1.6 };
const loadPrefs = (): Prefs => { try { return { ...DEF, ...JSON.parse(localStorage.getItem('readerPrefs2') || '{}') }; } catch { return DEF; } };
const esc = (s: string) => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!));
const GAP = 48;
const BLOCKS = 'p, h1, h2, h3, h4, h5, h6, li, blockquote, pre, figcaption, div';
/** Leaf text blocks in reading order (the same for rendered and parsed HTML) */
function leafBlocks(root: Element): Element[] {
  const all = Array.from(root.querySelectorAll(BLOCKS)).filter(el => !el.querySelector(BLOCKS) && (el.textContent || '').trim());
  return all.length ? all : [root];
}
/** A section's plain text and where each block starts in it */
function plainOf(html: string) {
  const root = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html').body.firstElementChild!;
  const starts: number[] = [];
  let text = '';
  for (const b of leafBlocks(root)) { if (text) text += '\n\n'; starts.push(text.length); text += (b.textContent || '').replace(/\s+/g, ' ').trim(); }
  return { text, starts };
}
type Session = { bookId: string; baseSec: number; secStarts: number[] };

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
  const [voicePick, setVoicePick] = useState(false);
  const [listening, setListening] = useState(false);   // a read-aloud session exists (playing or paused)
  const [playing, setPlaying] = useState(false);
  const [vs, setVs] = useState<RVoice[]>([]);
  const [w, setW] = useState(0);
  const flow = useRef<HTMLDivElement>(null);
  const view = useRef<HTMLDivElement>(null);
  const pendingOverall = useRef<number | null>(position(book.id));
  const pendingFrac = useRef<number | null>(null);
  const goEnd = useRef(false);
  const touch = useRef<{ x: number; y: number; t: number } | null>(null);
  const session = useRef<Session | null>(null);
  const pendingWord = useRef<[number, number] | null>(null);

  const sections = useMemo(() => (data ? sectionsOf(data) : []), [data]);
  // Refs, so read-aloud events (registered once) always see the loaded book
  const sectionsRef = useRef(sections); sectionsRef.current = sections;
  const plains = useRef(new Map<number, ReturnType<typeof plainOf>>());
  useMemo(() => plains.current.clear(), [sections]); // eslint-disable-line react-hooks/exhaustive-deps
  const plain = (i: number) => { let p = plains.current.get(i); if (!p) { p = plainOf(sectionsRef.current[i]?.html || ''); plains.current.set(i, p); } return p; };
  const total = useMemo(() => sections.reduce((n, s) => n + s.len, 0), [sections]);
  const before = (i: number) => sections.slice(0, i).reduce((n, s) => n + s.len, 0);
  const fraction = total ? (before(sec) + (pages > 1 ? page / (pages - 1) : 0) * sections[sec].len) / total : 0;
  const secRef = useRef(sec); secRef.current = sec;
  const pageRef = useRef(page); pageRef.current = page;
  const wRef = useRef(w); wRef.current = w;

  useEffect(() => { load(book).then(setData).catch(e => setError((e as Error).message)); }, [book]);
  useEffect(() => { localStorage.setItem('readerPrefs2', JSON.stringify(prefs)); }, [prefs]);
  useEffect(() => { readVoices().then(setVs); }, []);
  useEffect(() => {
    const off = onBack(() => { if (voicePick) { setVoicePick(false); return true; } if (settings) { setSettings(false); return true; } close(); return true; });
    return off;
  }); // eslint-disable-line react-hooks/exhaustive-deps

  const locate = (f: number) => {
    let t = f * total, i = 0;
    while (i < sections.length - 1 && t > sections[i].len) { t -= sections[i].len; i++; }
    return { i, within: Math.min(1, t / sections[i].len) };
  };

  // Lay out the current section in whole lines, then count its pages
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
      const lh = parseFloat(getComputedStyle(f).lineHeight) || prefs.size * prefs.spacing;
      f.style.height = `${Math.max(lh * 4, Math.floor(v.clientHeight / lh) * lh)}px`; // no half lines at the bottom
      setW(width);
      const n = Math.max(1, Math.round((f.scrollWidth + GAP) / (width + GAP)));
      setPages(n);
      if (pendingFrac.current !== null) { setPage(Math.min(n - 1, Math.round(pendingFrac.current * (n - 1)))); pendingFrac.current = null; }
      else if (goEnd.current) { setPage(n - 1); goEnd.current = false; }
      else setPage(p => Math.min(p, n - 1));
      if (pendingWord.current) { const [a, b] = pendingWord.current; pendingWord.current = null; requestAnimationFrame(() => highlight(a, b)); }
    };
    measure();
    Array.from(f.querySelectorAll('img')).forEach(im => { if (!im.complete) im.addEventListener('load', measure, { once: true }); });
    const ro = new ResizeObserver(measure);
    ro.observe(v);
    return () => ro.disconnect();
  }, [sec, sections, prefs.size, prefs.font, prefs.spacing]); // eslint-disable-line react-hooks/exhaustive-deps

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
    play('whoosh'); setChrome(false);
    return true;
  }, [page, pages, sec, sections.length]);
  const prev = () => {
    if (page > 0) setPage(p => p - 1);
    else if (sec > 0) { goEnd.current = true; setSec(s => s - 1); }
    else return;
    play('whoosh'); setChrome(false);
  };
  const jump = (f: number) => { const { i, within } = locate(f); if (i === sec) setPage(Math.round(within * (pages - 1))); else { pendingFrac.current = within; setSec(i); } };

  // ── Read aloud ──
  /** Highlight the spoken word (local offsets in the current section) and follow it to its page */
  function highlight(start: number, end: number) {
    const f = flow.current, v = view.current;
    if (!f || !v) return;
    const p = plain(secRef.current);
    let bi = 0;
    while (bi < p.starts.length - 1 && p.starts[bi + 1] <= start) bi++;
    const blocks = leafBlocks(f);
    const block = blocks[bi];
    if (!block) return;
    let local = start - p.starts[bi], len = Math.max(1, end - start);
    if (end <= start) { const rest = p.text.slice(start); const m = rest.match(/^\S+/); len = m ? m[0].length : 1; }
    // walk the block's text nodes to the character (whitespace was collapsed in the plain text)
    const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
    let node: Text | null, seen = 0, range: Range | null = null, prevSpace = true;
    const startAt = local, endAt = local + len;
    let sNode: Text | null = null, sOff = 0;
    while ((node = walker.nextNode() as Text | null)) {
      const t = node.data;
      for (let i = 0; i < t.length; i++) {
        const space = /\s/.test(t[i]);
        if (space && prevSpace) continue;
        if (seen === startAt && !sNode) { sNode = node; sOff = i; }
        seen++;
        prevSpace = space;
        if (seen === endAt && sNode) { range = document.createRange(); range.setStart(sNode, sOff); range.setEnd(node, i + 1); break; }
      }
      if (range) break;
    }
    const H = (window as unknown as { Highlight?: new (r: Range) => unknown }).Highlight;
    const reg = (CSS as unknown as { highlights?: Map<string, unknown> }).highlights;
    f.querySelectorAll('.speaking').forEach(e => e.classList.remove('speaking'));
    if (range && H && reg) reg.set('reading', new H(range)); else block.classList.add('speaking');
    // turn the page when the word is on another one
    const r = (range || block).getBoundingClientRect(), vr = v.getBoundingClientRect();
    const delta = Math.floor((r.left + 2 - vr.left) / (wRef.current + GAP));
    if (delta !== 0) setPage(pg => Math.max(0, pg + delta));
  }

  useEffect(() => {
    onReadEvents((_o, ws, we) => {
      const ses = session.current;
      if (!ses) return;
      let si = ses.secStarts.length - 1;
      while (si > 0 && ses.secStarts[si] > ws) si--;
      const secIdx = ses.baseSec + si;
      const a = ws - ses.secStarts[si], b = we - ses.secStarts[si];
      if (secIdx !== secRef.current) { pendingWord.current = [a, b]; pendingFrac.current = 0; setSec(secIdx); }
      else highlight(a, b);
    }, (isPlaying, ended) => {
      setPlaying(isPlaying);
      if (ended) { setListening(false); clearHighlight(); }
    });
    // Reading was still going (e.g. the reader was reopened): show the player
    readState().then(st => { if (st?.running && st.title === book.title) { setListening(true); setPlaying(st.playing); const saved = localStorage.getItem('readAloudSession'); if (saved) session.current = JSON.parse(saved); } });
    return () => onReadEvents(() => {}, () => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function clearHighlight() {
    (CSS as unknown as { highlights?: Map<string, unknown> }).highlights?.delete('reading');
    flow.current?.querySelectorAll('.speaking').forEach(e => e.classList.remove('speaking'));
  }

  async function listen() {
    const f = flow.current;
    if (!f) return;
    // start at the first block on this page
    const blocks = leafBlocks(f);
    const vr = view.current!.getBoundingClientRect();
    let bi = blocks.findIndex(b => { const r = b.getBoundingClientRect(); return r.right > vr.left + 4 && r.bottom > vr.top; });
    if (bi < 0) bi = 0;
    // text from this section to the end (up to ~250k characters, hours of reading)
    let text = '', secStarts: number[] = [];
    for (let i = sec; i < sections.length && text.length < 250000; i++) { if (text) text += '\n\n'; secStarts.push(text.length); text += plain(i).text; }
    const from = plain(sec).starts[bi] || 0;
    session.current = { bookId: book.id, baseSec: sec, secStarts };
    localStorage.setItem('readAloudSession', JSON.stringify(session.current));
    const voice = vs.find(v => v.id === prefs.voice) || vs.find(v => /^en/i.test(v.lang)) || null;
    setListening(true); setPlaying(true); setChrome(false);
    try { await readFrom({ text, from, title: book.title, voice, rate: prefs.rate }); }
    catch { setListening(false); setPlaying(false); }
    secStarts = [];
  }
  const togglePlay = () => { play('tap'); if (playing) { pauseReading(); setPlaying(false); } else listen(); };
  const stopListen = () => { stopReading(); setListening(false); setPlaying(false); clearHighlight(); localStorage.removeItem('readAloudSession'); };
  function close() { stopListen(); onClose(); }

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
  const voice = vs.find(v => v.id === prefs.voice);
  const voiceLabel = voice ? `${langName(voice.lang)} · ${voice.label}` : 'Best English voice';

  return (
    <motion.div className={'reader theme-' + prefs.theme} style={{ background: bg, color: fg }} initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }}>
      <header className={'rd-top' + (chrome ? '' : ' hide')}>
        <button type="button" className="rd-ic" onClick={() => { play('tap'); close(); }} aria-label="Back"><ArrowLeft size={24} weight="bold" /></button>
        <b>{book.title}</b>
        <button type="button" className="rd-ic" onClick={() => { play('tap'); setSettings(true); }} aria-label="Text settings"><TextAa size={24} weight="bold" /></button>
        <button type="button" className={'rd-ic' + (listening ? ' on' : '')} onClick={() => { if (listening) togglePlay(); else { play('tap'); listen(); } }} aria-label="Read aloud"><Headphones size={24} weight="bold" /></button>
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
          <div className={'rd-flow font-' + prefs.font + ' align-' + prefs.align} ref={flow}
            style={{ columnWidth: w ? `${w}px` : '100vw', columnGap: `${GAP}px`, fontSize: prefs.size, lineHeight: prefs.spacing, transform: `translateX(${-page * (w + GAP)}px)` }}
            dangerouslySetInnerHTML={{ __html: sections[sec]?.html || '' }} />
        </div>
      )}

      {data && (
        <footer className={'rd-bottom' + (chrome || listening ? '' : ' hide')}>
          {listening ? (
            <div className="rd-player">
              <button type="button" className="btn round" onClick={togglePlay} aria-label={playing ? 'Pause' : 'Play'}>{playing ? <Pause size={22} weight="fill" /> : <Play size={22} weight="fill" />}</button>
              <span><b>{playing ? 'Reading aloud' : 'Paused'}</b><small>{voiceLabel} · {prefs.rate}×</small></span>
              <button type="button" className="rd-ic" onClick={() => { play('tap'); setSettings(true); }} aria-label="Voice and speed"><TextAa size={22} weight="bold" /></button>
              <button type="button" className="rd-ic" onClick={() => { play('tap'); stopListen(); }} aria-label="Stop reading"><Stop size={22} weight="fill" /></button>
            </div>
          ) : (
            <>
              <input type="range" className="rd-slider" min={0} max={1000} value={Math.round(fraction * 1000)} onChange={e => jump(Number(e.target.value) / 1000)} aria-label="Position in book" />
              <small>{Math.round(fraction * 100)}% · page {page + 1} of {pages}{sections.length > 1 ? ` · part ${sec + 1}/${sections.length}` : ''}</small>
            </>
          )}
        </footer>
      )}
      {!listening && !chrome && data && <span className="rd-pct">{page + 1} / {pages}</span>}

      <Sheet open={settings} onClose={() => setSettings(false)} title="Reading">
        <div className="editor">
          <div className="rd-themes">
            {(Object.keys(THEMES) as Prefs['theme'][]).map(t => (
              <button key={t} type="button" className={'rd-theme' + (prefs.theme === t ? ' on' : '')} style={{ background: THEMES[t][0], color: THEMES[t][1] }} onClick={() => { play('toggle'); setPrefs({ ...prefs, theme: t }); }}>Aa<small>{t[0].toUpperCase() + t.slice(1)}</small></button>
            ))}
          </div>
          <div className="stepper">
            <button type="button" className="btn round ghost" onClick={() => setPrefs({ ...prefs, size: Math.max(14, prefs.size - 1) })} aria-label="Smaller"><Minus size={18} weight="bold" /></button>
            <b>{prefs.size}</b>
            <button type="button" className="btn round ghost" onClick={() => setPrefs({ ...prefs, size: Math.min(30, prefs.size + 1) })} aria-label="Bigger"><Plus size={18} weight="bold" /></button>
          </div>
          <div className="seg">
            <button type="button" className={prefs.font === 'serif' ? 'on' : ''} onClick={() => setPrefs({ ...prefs, font: 'serif' })}>Book</button>
            <button type="button" className={prefs.font === 'sans' ? 'on' : ''} onClick={() => setPrefs({ ...prefs, font: 'sans' })}>Clean</button>
            <button type="button" className={prefs.align === 'justify' ? 'on' : ''} onClick={() => setPrefs({ ...prefs, align: prefs.align === 'justify' ? 'left' : 'justify' })}>Justify</button>
          </div>
          <div className="seg">
            {[[1.45, 'Compact'], [1.6, 'Normal'], [1.8, 'Airy']].map(([v, l]) => <button key={l} type="button" className={prefs.spacing === v ? 'on' : ''} onClick={() => setPrefs({ ...prefs, spacing: v as number })}>{l}</button>)}
          </div>
          <h3 className="field-label">Read-aloud speed</h3>
          <div className="seg five">
            {[0.8, 1, 1.2, 1.5, 2].map(r => <button key={r} type="button" className={prefs.rate === r ? 'on' : ''} onClick={() => { setPrefs({ ...prefs, rate: r }); setReadRate(r); }}>{r}×</button>)}
          </div>
          <button type="button" className="rd-voice-row" onClick={() => { play('tap'); setVoicePick(true); }}>
            <SpeakerHigh size={20} weight="fill" /><span><small>Voice</small><b>{voiceLabel}</b></span><CaretRight size={18} weight="bold" />
          </button>
          {listening && <p className="fine">Voice changes apply when you press play again.</p>}
          <button type="button" className="btn block" onClick={() => setSettings(false)}><X size={18} weight="bold" /> Done</button>
        </div>
      </Sheet>
      <VoicePicker open={voicePick} voices={vs} value={prefs.voice} rate={prefs.rate} onClose={() => setVoicePick(false)} onChange={v => setPrefs({ ...prefs, voice: v })} />
    </motion.div>
  );
}

/** Pick a language, then a voice; tap ▶ to hear it first */
function VoicePicker({ open, voices, value, rate, onClose, onChange }: { open: boolean; voices: RVoice[]; value?: string; rate: number; onClose: () => void; onChange: (v?: string) => void }) {
  const langs = [...new Set(voices.map(v => v.lang))];
  const current = voices.find(v => v.id === value);
  const [lang, setLang] = useState<string>(current?.lang || langs.find(l => /^en-(IN|US)/i.test(l)) || langs[0] || 'en-US');
  const list = voices.filter(v => v.lang === lang);
  return (
    <Sheet open={open} onClose={onClose} title="Choose a voice">
      {!voices.length ? <p className="fine">No voices found. Install “Speech Services by Google” from the Play Store for more voices.</p> : <>
        <div className="chips wrap">{langs.map(l => <button key={l} type="button" className={'chip' + (l === lang ? ' on' : '')} onClick={() => { play('toggle'); setLang(l); }}>{langName(l)}</button>)}</div>
        <div className="card list voice-list">
          <button type="button" className={'voice-row' + (!value ? ' on' : '')} onClick={() => { onChange(undefined); play('toggle'); }}>
            <span><b>Best English voice</b><small>Picked for you</small></span>{!value && <Check size={20} weight="bold" />}
          </button>
          {list.map(v => (
            <div key={v.id} className={'voice-row' + (value === v.id ? ' on' : '')}>
              <button type="button" className="voice-play" onClick={() => { play('tap'); previewVoice(v, rate); }} aria-label={`Hear ${v.label}`}><Play size={16} weight="fill" /></button>
              <button type="button" className="voice-pick" onClick={() => { onChange(v.id); play('toggle'); }}>
                <span><b>{v.label}</b><small>{v.natural ? 'Natural' : 'Standard'}{v.online ? <> · <WifiHigh size={12} weight="bold" /> needs internet</> : ' · works offline'}</small></span>
                {value === v.id && <Check size={20} weight="bold" />}
              </button>
            </div>
          ))}
        </div>
      </>}
    </Sheet>
  );
}
