import { useEffect, useMemo, useState } from 'react';
import { Plus, MagnifyingGlass, Lightbulb, Trash } from '@phosphor-icons/react';
import { AnimatePresence } from 'motion/react';
import { makeSlice } from '../../lib/store';
import { play } from '../../lib/sound';
import { burst, praise, toast } from '../../lib/celebrate';
import { haptic } from '../../lib/native';
import { Mascot } from '../../components/Mascot';
import { Page } from './Page';

// Same storage as the old app: content is HTML, so entries written there keep their formatting
export type Entry = { title: string; content: string; tags?: string[]; paperStyle?: string; doodle?: string | null; date: number };
export const journal = makeSlice<Entry[]>('journalEntries', []);

const PROMPTS = ['What made you smile today?', 'What’s one thing you’d do differently today?', 'What are you grateful for right now?', 'What’s been on your mind lately?',
  'Describe a small win from today.', 'What would make tomorrow great?', 'What drained your energy today, and what gave you energy?', 'Write a note to yourself one year from now.',
  'What did you learn today?', 'Who helped you recently, and how?', 'What are you avoiding, and why?', 'What does a perfect ordinary day look like for you?'];

export const htmlToText = (html: string) => {
  const d = new DOMParser().parseFromString(html.replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|h\d|li|blockquote)>/gi, '\n'), 'text/html');
  return (d.body.textContent || '').replace(/\n{3,}/g, '\n\n').trim();
};
const textToHtml = (t: string) => t.trim().split(/\n{2,}/).map(p => `<p>${p.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!)).replace(/\n/g, '<br>')}</p>`).join('');
const day = (ms: number) => new Date(ms).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: new Date(ms).getFullYear() === new Date().getFullYear() ? undefined : 'numeric' });

export function Journal({ onBack }: { onBack: () => void }) {
  const entries = journal.use();
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<Entry | null | undefined>(undefined);
  const list = useMemo(() => [...entries].sort((a, b) => b.date - a.date).filter(e => !q || (e.title + ' ' + htmlToText(e.content)).toLowerCase().includes(q.toLowerCase())), [entries, q]);

  return (
    <Page title="Journal" onBack={onBack} action={<button type="button" className="btn round" aria-label="New entry" onClick={() => { play('tap'); setEditing(null); }}><Plus size={24} weight="bold" /></button>}>
      {entries.length > 3 && (
        <div className="search"><MagnifyingGlass size={22} weight="bold" /><input placeholder="Search your journal…" value={q} onChange={e => setQ(e.target.value)} /></div>
      )}
      {list.length ? (
        <div className="stack journal-list">
          {list.map(e => (
            <button key={e.date} type="button" className="card entry" onClick={() => { play('tap'); setEditing(e); }}>
              <small>{day(e.date)}</small>
              <b>{e.title || 'Untitled'}</b>
              <span>{htmlToText(e.content).slice(0, 160)}</span>
              {e.doodle && <img src={e.doodle} alt="" />}
            </button>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <Mascot size={96} mood="happy" className="bob" />
          <b>{q ? 'Nothing matches' : 'Your journal is empty'}</b>
          <span>{q ? 'Try another word.' : 'A few lines a day clears the head. Tap + to write.'}</span>
        </div>
      )}
      <AnimatePresence>{editing !== undefined && <Editor key="ed" entry={editing} onClose={() => setEditing(undefined)} />}</AnimatePresence>
    </Page>
  );
}

function Editor({ entry, onClose }: { entry: Entry | null; onClose: () => void }) {
  const [title, setTitle] = useState(entry?.title === 'Untitled' ? '' : entry?.title || '');
  const [body, setBody] = useState(entry ? htmlToText(entry.content) : '');
  const [prompt, setPrompt] = useState('');
  const [confirm, setConfirm] = useState(false);
  useEffect(() => { if (!entry) setPrompt(''); }, [entry]);

  const save = () => {
    if (!body.trim() && !entry?.doodle) { onClose(); return; }
    const all = journal.get();
    const next: Entry = { ...(entry || {}), title: title.trim() || 'Untitled', content: body.trim() === (entry ? htmlToText(entry.content) : '') && entry ? entry.content : textToHtml(body), tags: entry?.tags || [], date: entry?.date || Date.now() };
    journal.set(entry ? all.map(e => (e.date === entry.date ? next : e)) : [...all, next]);
    play('check');
    haptic.success();
    if (!entry) { burst({ x: innerWidth / 2, y: 120, count: 24, power: 0.8 }); praise(innerWidth / 2, 120, 'Saved!'); }
    onClose();
  };
  const del = () => {
    if (!confirm) { setConfirm(true); play('tap'); return; }
    journal.set(journal.get().filter(e => e.date !== entry!.date));
    play('whoosh');
    toast('Entry deleted');
    onClose();
  };

  return (
    <Page title={entry ? day(entry.date) : 'New entry'} onBack={save} className="editor-page"
      action={<button type="button" className="btn" onClick={save}>Save</button>}>
      <input className="field big plain" placeholder="Title" value={title} maxLength={100} onChange={e => setTitle(e.target.value)} />
      {prompt && <p className="prompt">{prompt}</p>}
      <textarea className="field plain journal-body" autoFocus={!entry} placeholder={prompt ? 'Write your answer…' : 'Write anything. It stays on your phone.'} value={body} onChange={e => setBody(e.target.value)} />
      {entry?.doodle && <img className="doodle" src={entry.doodle} alt="Your drawing" />}
      <div className="editor-actions">
        <button type="button" className="chip" onClick={() => { play('pop'); setPrompt(PROMPTS[Math.floor(Math.random() * PROMPTS.length)]); }}><Lightbulb size={18} weight="fill" /> Need an idea?</button>
        {entry && <button type="button" className={'chip danger' + (confirm ? ' armed' : '')} onClick={del}><Trash size={18} weight="bold" /> {confirm ? 'Tap again to delete' : 'Delete'}</button>}
      </div>
    </Page>
  );
}
