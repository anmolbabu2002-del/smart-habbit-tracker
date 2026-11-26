// The journal that does something: a morning plan that becomes today's tasks, an evening
// review that fills itself in with what you actually did, a brain dump you can turn into
// tasks, and Anmol AI reading your week back to you. Same storage as before.
import { useMemo, useState } from 'react';
import { Plus, MagnifyingGlass, Trash, Check, Sparkle, ArrowRight } from '@phosphor-icons/react';
import { AnimatePresence } from 'motion/react';
import { makeSlice, getState } from '../../lib/store';
import { play } from '../../lib/sound';
import { burst, praise, toast } from '../../lib/celebrate';
import { addTask, doneToday } from '../../lib/actions';
import { addDays, fmtMinutes, today, ymd } from '../../lib/dates';
import { api, haptic } from '../../lib/native';
import { HabitIcon } from '../../components/HabitIcon';
import { Mascot } from '../../components/Mascot';
import { Sheet } from '../../components/Sheet';
import { Page } from './Page';

type Template = 'morning' | 'evening' | 'dump' | 'free';
export type Entry = { title: string; content: string; tags?: string[]; paperStyle?: string; doodle?: string | null; date: number; template?: Template; fields?: Record<string, string> };
export const journal = makeSlice<Entry[]>('journalEntries', []);

const T: Record<Template, { title: string; icon: string; color: 'orange' | 'purple' | 'blue' | 'mint'; sub: string }> = {
  morning: { title: 'Morning plan', icon: 'sunrise', color: 'orange', sub: 'Top 3 for today' },
  evening: { title: 'Evening review', icon: 'moon', color: 'purple', sub: 'How did today go?' },
  dump: { title: 'Brain dump', icon: 'brain', color: 'blue', sub: 'Empty your head' },
  free: { title: 'Free write', icon: 'pencil', color: 'mint', sub: 'Anything at all' }
};
const PROMPTS = ['What made you smile today?', 'What are you avoiding, and why?', 'What would make tomorrow great?', 'What did you learn today?', 'Who helped you recently?', 'What’s been on your mind lately?'];

export const htmlToText = (html: string) => {
  const d = new DOMParser().parseFromString(html.replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|h\d|li|blockquote)>/gi, '\n'), 'text/html');
  return (d.body.textContent || '').replace(/\n{3,}/g, '\n\n').trim();
};
const esc = (t: string) => t.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!));
const para = (t: string) => t.trim().split(/\n{2,}/).map(p => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('');
const dayOf = (ms: number) => ymd(new Date(ms));
const pretty = (ms: number) => new Date(ms).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });

/** What you actually did today, for the evening review */
function todaySummary() {
  const s = getState(), d = today();
  const habits = s.habits.filter(h => doneToday(h, d));
  const tasks = s.tasks.filter(t => t.doneAt === d);
  const focus = s.focus.sessions.filter(x => x.day === d).reduce((n, x) => n + x.minutes, 0);
  return { habits: `${habits.length}/${s.habits.length}`, habitNames: habits.map(h => h.name), tasks: tasks.map(t => t.title), focus };
}

export function Journal({ onBack }: { onBack: () => void }) {
  const entries = journal.use();
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<{ entry: Entry | null; template: Template } | null>(null);
  const [reflection, setReflection] = useState<string | null>(null);
  const [thinking, setThinking] = useState(false);
  const list = useMemo(() => [...entries].sort((a, b) => b.date - a.date).filter(e => !q || (e.title + ' ' + htmlToText(e.content)).toLowerCase().includes(q.toLowerCase())), [entries, q]);
  const todays = entries.filter(e => dayOf(e.date) === today());
  const has = (t: Template) => todays.find(e => e.template === t);
  const days = new Set(entries.map(e => dayOf(e.date)));
  const strip = Array.from({ length: 14 }, (_, i) => addDays(today(), i - 13));
  let streak = 0; for (let d = days.has(today()) ? today() : addDays(today(), -1); days.has(d); d = addDays(d, -1)) streak++;

  const open = (template: Template, entry: Entry | null = null) => { play('tap'); setEditing({ entry, template }); };

  async function reflect() {
    const week = entries.filter(e => e.date > Date.now() - 7 * 86400000).sort((a, b) => a.date - b.date);
    if (!week.length) { toast('Write a few entries this week first'); return; }
    setThinking(true); setReflection('');
    const text = week.map(e => `${pretty(e.date)} — ${e.title}\n${htmlToText(e.content)}`).join('\n\n').slice(0, 6000);
    try {
      const res = await fetch(api('/.netlify/functions/ai'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
        message: `Here are my journal entries from the past 7 days:\n\n${text}\n\nRead them like a wise coach. Reply with: 3 short insights about me, 1 pattern you notice (good or bad), and 1 specific thing to try next week. Under 150 words, warm and direct, no lists longer than 3 items.`,
        context: { userName: getState().name || 'friend', currentTime: new Date().toLocaleString(), aiPersonality: 'supportive' }, history: [] }) });
      const data = await res.json();
      setReflection((data.reply || 'I couldn’t think of anything. Try again later.').replace(/\[MEMORY_APPEND:.*?\]/gi, '').trim());
      play('feat');
    } catch { setReflection('Couldn’t reach Anmol AI. Check your internet.'); play('error'); }
    finally { setThinking(false); }
  }

  return (
    <Page title="Journal" onBack={onBack} action={<button type="button" className="btn round" aria-label="New entry" onClick={() => open('free')}><Plus size={22} weight="bold" /></button>}>
      <div className="jr-today">
        {(['morning', 'evening'] as Template[]).map(t => {
          const e = has(t);
          return (
            <button key={t} type="button" className={'card jr-big' + (e ? ' done' : '')} onClick={() => open(t, e || null)}>
              <span className="jr-ico" style={{ background: `var(--${T[t].color}-soft)` }}><HabitIcon icon={T[t].icon} color={T[t].color} size={30} /></span>
              <b>{T[t].title}</b>
              <small>{e ? <><Check size={13} weight="bold" /> Done</> : T[t].sub}</small>
            </button>
          );
        })}
      </div>
      <div className="jr-small">
        {(['dump', 'free'] as Template[]).map(t => (
          <button key={t} type="button" className="card jr-chip" onClick={() => open(t)}>
            <HabitIcon icon={T[t].icon} color={T[t].color} size={22} /><b>{T[t].title}</b>
          </button>
        ))}
      </div>

      <section className="card jr-streak">
        <div className="jr-streak-head"><b>{streak ? `${streak}-day journaling streak` : 'Write today to start a streak'}</b><small>last 14 days</small></div>
        <div className="jr-dots">{strip.map(d => <i key={d} className={(days.has(d) ? 'on' : '') + (d === today() ? ' today' : '')} />)}</div>
      </section>

      <button type="button" className="card jr-ai" onClick={reflect} disabled={thinking}>
        <span className="jr-ico" style={{ background: 'var(--blue-soft)' }}><HabitIcon icon="chat" color="blue" size={28} /></span>
        <span><b>{thinking ? 'Reading your week…' : 'Reflect on my week'}</b><small>Anmol AI finds patterns in your last 7 days</small></span>
        <Sparkle size={20} weight="fill" color="var(--yellow)" />
      </button>

      {entries.length > 3 && <div className="search" style={{ marginTop: 14 }}><MagnifyingGlass size={20} weight="bold" /><input placeholder="Search your journal…" value={q} onChange={e => setQ(e.target.value)} /></div>}
      <h2 className="section-title">Entries <small>{entries.length}</small></h2>
      {list.length ? (
        <div className="stack">
          {list.map(e => {
            const t = e.template && T[e.template];
            return (
              <button key={e.date} type="button" className="card entry" onClick={() => open(e.template || 'free', e)}>
                <small>{pretty(e.date)}{t ? ` · ${t.title}` : ''}</small>
                <b>{e.title || 'Untitled'}</b>
                <span>{htmlToText(e.content).slice(0, 140)}</span>
                {e.doodle && <img src={e.doodle} alt="" />}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="empty-state"><Mascot size={84} mood="happy" className="bob" /><b>{q ? 'Nothing matches' : 'Start with a morning plan'}</b><span>{q ? 'Try another word.' : 'Two minutes in the morning, two at night.'}</span></div>
      )}

      <AnimatePresence>{editing && <Editor key="ed" entry={editing.entry} template={editing.template} onClose={() => setEditing(null)} />}</AnimatePresence>
      <Sheet open={reflection !== null} onClose={() => setReflection(null)} title="Your week">
        {thinking ? <div className="empty-state"><Mascot size={70} mood="focus" className="bob" /><b>Reading your entries…</b></div>
          : <div className="reflection" dangerouslySetInnerHTML={{ __html: esc(reflection || '').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>') }} />}
      </Sheet>
    </Page>
  );
}

function Editor({ entry, template, onClose }: { entry: Entry | null; template: Template; onClose: () => void }) {
  const f0 = entry?.fields || {};
  const [fields, setFields] = useState<Record<string, string>>(() => entry && !entry.fields ? { body: htmlToText(entry.content), title: entry.title === 'Untitled' ? '' : entry.title } : { ...f0 });
  const [makeTasks, setMakeTasks] = useState(!entry);
  const [prompt, setPrompt] = useState('');
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [confirm, setConfirm] = useState(false);
  const set = (k: string, v: string) => setFields(f => ({ ...f, [k]: v }));
  const summary = useMemo(todaySummary, []);
  const dumpLines = (fields.body || '').split('\n').map(l => l.replace(/^[-•*]\s*/, '').trim()).filter(Boolean);

  function save() {
    let title = '', html = '';
    if (template === 'morning') {
      const top = [fields.top1, fields.top2, fields.top3].filter(x => x?.trim());
      if (!top.length && !fields.grateful?.trim()) { onClose(); return; }
      title = 'Morning plan';
      html = `<p><b>Top 3 today</b></p>${top.map((t, i) => `<p>${i + 1}. ${esc(t)}</p>`).join('')}${fields.grateful ? `<p><b>Grateful for</b><br>${esc(fields.grateful)}</p>` : ''}${fields.feel ? `<p><b>I want to feel</b><br>${esc(fields.feel)}</p>` : ''}`;
      if (makeTasks && !entry) top.forEach(t => addTask({ title: t, due: today() }));
    } else if (template === 'evening') {
      if (!['win', 'block', 'lesson', 'tomorrow'].some(k => fields[k]?.trim())) { onClose(); return; }
      title = 'Evening review';
      html = `<p><b>Today</b><br>Habits ${summary.habits} · ${summary.tasks.length} tasks done · ${fmtMinutes(summary.focus)} focused</p>`
        + [['win', 'Win'], ['block', 'What got in the way'], ['lesson', 'Lesson'], ['tomorrow', 'Tomorrow’s #1']].filter(([k]) => fields[k]?.trim()).map(([k, l]) => `<p><b>${l}</b><br>${esc(fields[k])}</p>`).join('');
      if (makeTasks && !entry && fields.tomorrow?.trim()) addTask({ title: fields.tomorrow.trim(), due: addDays(today(), 1) });
    } else {
      if (!fields.body?.trim()) { onClose(); return; }
      title = fields.title?.trim() || (template === 'dump' ? 'Brain dump' : 'Untitled');
      html = para(fields.body);
    }
    const all = journal.get();
    const next: Entry = { ...(entry || {}), title, content: html, template, fields, tags: entry?.tags || [], date: entry?.date || Date.now() };
    journal.set(entry ? all.map(e => (e.date === entry.date ? next : e)) : [...all, next]);
    play('check'); haptic.success();
    if (!entry) { burst({ x: innerWidth / 2, y: 120, count: 26, power: 0.8 }); praise(innerWidth / 2, 120, 'Saved!'); }
    if (!entry && makeTasks && (template === 'morning' || (template === 'evening' && fields.tomorrow?.trim()))) toast(template === 'morning' ? 'Added to today’s tasks' : 'Added to tomorrow’s tasks', 'good');
    onClose();
  }
  function del() {
    if (!confirm) { setConfirm(true); play('tap'); return; }
    journal.set(journal.get().filter(e => e.date !== entry!.date));
    play('whoosh'); toast('Entry deleted'); onClose();
  }
  function dumpToTasks() {
    const lines = [...picked].map(i => dumpLines[i]).filter(Boolean);
    lines.forEach(l => addTask({ title: l }));
    play('combo'); toast(`${lines.length} ${lines.length === 1 ? 'task' : 'tasks'} added`, 'good');
    setPicked(new Set());
  }

  const t = T[template];
  return (
    <Page title={entry ? pretty(entry.date) : t.title} onBack={save} className="editor-page" action={<button type="button" className="btn" onClick={save}>Save</button>}>
      <div className="jr-hero" style={{ background: `var(--${t.color}-soft)` }}><HabitIcon icon={t.icon} color={t.color} size={40} /><span><b>{t.title}</b><small>{t.sub}</small></span></div>

      {template === 'morning' && <>
        <h3 className="field-label">Today’s top 3</h3>
        {[1, 2, 3].map(i => <input key={i} className="field" placeholder={['The most important thing', 'Second', 'Third'][i - 1]} value={fields[`top${i}`] || ''} onChange={e => set(`top${i}`, e.target.value)} />)}
        {!entry && <label className="jr-check"><input type="checkbox" checked={makeTasks} onChange={e => setMakeTasks(e.target.checked)} /> Add these to today’s tasks</label>}
        <h3 className="field-label">I’m grateful for</h3>
        <input className="field" placeholder="One small thing" value={fields.grateful || ''} onChange={e => set('grateful', e.target.value)} />
        <h3 className="field-label">Today I want to feel</h3>
        <input className="field" placeholder="Calm, focused, brave…" value={fields.feel || ''} onChange={e => set('feel', e.target.value)} />
      </>}

      {template === 'evening' && <>
        <div className="card jr-sum">
          <b>Your day</b>
          <span>Habits {summary.habits} · {summary.tasks.length} {summary.tasks.length === 1 ? 'task' : 'tasks'} done · {fmtMinutes(summary.focus)} focused</span>
          {summary.tasks.length > 0 && <small>Done: {summary.tasks.slice(0, 4).join(', ')}{summary.tasks.length > 4 ? '…' : ''}</small>}
        </div>
        {[['win', 'Today’s win', 'Big or tiny'], ['block', 'What got in the way?', 'Be honest, no judging'], ['lesson', 'One lesson', 'What will you do differently?'], ['tomorrow', 'Tomorrow’s #1', 'The one thing that matters most']].map(([k, l, p]) => (
          <div key={k} className="jr-field"><h3 className="field-label">{l}</h3><textarea className="field" rows={2} placeholder={p} value={fields[k] || ''} onChange={e => set(k, e.target.value)} /></div>
        ))}
        {!entry && <label className="jr-check"><input type="checkbox" checked={makeTasks} onChange={e => setMakeTasks(e.target.checked)} /> Add tomorrow’s #1 to tasks</label>}
      </>}

      {template === 'dump' && <>
        <textarea className="field plain journal-body" autoFocus={!entry} placeholder={'Everything on your mind, one thing per line…\nCall the bank\nIdea for the project\nWorried about the exam'} value={fields.body || ''} onChange={e => set('body', e.target.value)} />
        {dumpLines.length > 0 && (
          <div className="card jr-dump">
            <b>Turn lines into tasks</b>
            {dumpLines.map((l, i) => (
              <label key={i} className="jr-check"><input type="checkbox" checked={picked.has(i)} onChange={e => { const n = new Set(picked); if (e.target.checked) n.add(i); else n.delete(i); setPicked(n); }} /> {l}</label>
            ))}
            <button type="button" className="btn block" disabled={!picked.size} onClick={dumpToTasks}>Add {picked.size || ''} to Tasks <ArrowRight size={18} weight="bold" /></button>
          </div>
        )}
      </>}

      {template === 'free' && <>
        <input className="field big plain" placeholder="Title" value={fields.title || ''} maxLength={100} onChange={e => set('title', e.target.value)} />
        {prompt && <p className="prompt">{prompt}</p>}
        <textarea className="field plain journal-body" autoFocus={!entry} placeholder={prompt ? 'Write your answer…' : 'Write anything. It stays on your phone.'} value={fields.body || ''} onChange={e => set('body', e.target.value)} />
        <button type="button" className="chip" onClick={() => { play('pop'); setPrompt(PROMPTS[Math.floor(Math.random() * PROMPTS.length)]); }}><Sparkle size={16} weight="fill" /> Need an idea?</button>
      </>}

      {entry?.doodle && <img className="doodle" src={entry.doodle} alt="Your drawing" />}
      {entry && <button type="button" className={'chip danger' + (confirm ? ' armed' : '')} style={{ marginTop: 16 }} onClick={del}><Trash size={18} weight="bold" /> {confirm ? 'Tap again to delete' : 'Delete entry'}</button>}
    </Page>
  );
}
