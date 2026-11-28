// Reflection: one question a night. If a habit slipped, it asks what got in the way (and what's
// behind that); if everything got done, what made today work; otherwise one question worth
// thinking about. Plus one good thing from today. Free writing stays one tap away, and old
// journal entries stay readable (same storage).
import { useMemo, useState } from 'react';
import { MagnifyingGlass, Trash, Check, ArrowsClockwise, Sun } from '@phosphor-icons/react';
import { AnimatePresence, motion } from 'motion/react';
import { getState, useApp } from '../../lib/store';
import { journal, type Entry, type Template } from '../../lib/reflect';
import { play } from '../../lib/sound';
import { burst, praise, toast } from '../../lib/celebrate';
import { doneToday } from '../../lib/actions';
import { requiredHabits } from '../../lib/lock';
import { isRequired } from '../../lib/schedule';
import { daysBetween, fmtMinutes, today, ymd } from '../../lib/dates';
import { haptic } from '../../lib/native';
import { HabitIcon } from '../../components/HabitIcon';
import { Page } from './Page';
import type { State } from '../../lib/types';


const LABEL: Record<Template, string> = { night: 'Reflection', morning: 'Morning plan', evening: 'Evening review', dump: 'Brain dump', free: 'Free write' };

/** Questions worth sitting with. One a night, never repeated within two months. */
export const QUESTIONS = [
  'What are you avoiding right now, and what is it costing you?',
  'What would the person you want to become do differently tomorrow?',
  'What did you say yes to that you should have said no to?',
  'What’s one thing you keep putting off? What’s the first tiny step?',
  'If today repeated every day for a year, where would you end up?',
  'What are you pretending not to know?',
  'Which hour of today felt most like you? Why?',
  'What drained your energy today, and was it worth it?',
  'What would you do if you weren’t afraid of looking stupid?',
  'Who do you want to be in one year? What did they do today?',
  'What story are you telling yourself that might not be true?',
  'What’s one habit that’s quietly shaping your life, for better or worse?',
  'When did you last feel proud of yourself? What made it count?',
  'What do you need more of right now? What do you need less of?',
  'What would make tomorrow a great day, honestly?',
  'What did you learn about yourself this week?',
  'Where did your time go today, and where did you want it to go?',
  'What’s a problem you’ve been treating as permanent that might not be?',
  'Who made your life better lately? Have you told them?',
  'What are you waiting for permission to do?',
  'What’s the hardest thing you did today, and why did you do it?',
  'If a friend lived your day today, what advice would you give them?',
  'What do you keep reaching for your phone to escape?',
  'What’s one thing you’d regret not starting this year?',
  'What does “enough” look like for you?',
  'What would you stop doing if no one was watching?',
  'Which of your habits would your future self thank you for?',
  'What did you do today just because you were supposed to?',
  'What’s something small that went right today?',
  'What are you more capable of than you give yourself credit for?',
  'What’s one belief about yourself you’d like to drop?',
  'What made you lose track of time recently?',
  'When did you feel most calm today? What was different?',
  'What’s the real reason you didn’t do the thing you planned?',
  'What would you tell yourself from a year ago?',
  'What are you grateful for that you usually take for granted?',
  'What’s one decision you’ve been delaying? What’s the cost of waiting?',
  'Who do you compare yourself to, and is it helping?',
  'What does a good day look like for you, from morning to night?',
  'What’s one thing you can let go of tonight?',
  'What did your phone give you today, and what did it take?',
  'What would make you proud to look back on this month?',
  'What’s one promise to yourself you’ve kept lately?',
  'What fear has been making your decisions for you?',
  'What’s the smallest version of your goal you could do tomorrow?',
  'What part of your day would you happily do again?',
  'What are you building, slowly, without noticing?',
  'What did you need today that you didn’t get? Can you give it to yourself?',
  'What would change if you trusted yourself more?',
  'What’s one thing you learned the hard way that you’re glad about now?'
];
const REASONS = ['Tired', 'No time', 'Forgot', 'Didn’t feel like it', 'Something came up'];

type Q = { key: string; text: string; kind: 'miss' | 'work' | 'deep'; habit?: string };

/** Tonight's questions, best first: a habit that slipped, a fully done day, then the deep ones */
export function tonightQuestions(s: State, entries: Entry[], now = new Date()): Q[] {
  const d = ymd(now), req = requiredHabits(s, d);
  const pending = req.filter(h => !doneToday(h, d));
  const list: Q[] = [];
  if (now.getHours() >= 17) pending.forEach(h => list.push({ key: 'miss:' + h.id, kind: 'miss', habit: h.name.trim(), text: `What got in the way of ${h.name.trim()} today?` }));
  if (req.length && !pending.length) list.push({ key: 'work', kind: 'work', text: 'What made today work?' });
  // the deep ones: a different start each day, skipping any answered in the last two months
  const recent = new Set(entries.filter(e => e.template === 'night' && Date.now() - e.date < 60 * 86400000).map(e => e.fields?.question));
  const start = (daysBetween('2026-01-01', d) * 7) % QUESTIONS.length;
  for (let i = 0; i < QUESTIONS.length; i++) {
    const t = QUESTIONS[(start + i + QUESTIONS.length) % QUESTIONS.length];
    if (!recent.has(t)) list.push({ key: 'deep:' + t, kind: 'deep', text: t });
  }
  return list;
}

export const htmlToText = (html: string) => {
  const d = new DOMParser().parseFromString(html.replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|h\d|li|blockquote)>/gi, '\n'), 'text/html');
  return (d.body.textContent || '').replace(/\n{3,}/g, '\n\n').trim();
};
const esc = (t: string) => t.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!));
const para = (t: string) => t.trim().split(/\n{2,}/).map(p => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('');
const dayOf = (ms: number) => ymd(new Date(ms));
const pretty = (ms: number) => new Date(ms).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });

/** The short line shown in the list */
const preview = (e: Entry) => {
  const f = e.fields || {};
  if (e.template !== 'night') return htmlToText(e.content).slice(0, 140);
  return [f.reason, f.answer?.trim(), f.good?.trim() && `Good thing: ${f.good.trim()}`].filter(Boolean).join(' · ').slice(0, 160);
};

/** A night reflection as readable HTML (what the list and search use) */
function nightHtml(f: Record<string, string>) {
  return [
    f.reason ? `<p><b>${esc(f.reason)}</b></p>` : '',
    f.answer?.trim() ? para(f.answer) : '',
    f.deeper?.trim() ? `<p><b>Behind it</b><br>${esc(f.deeper.trim())}</p>` : '',
    f.good?.trim() ? `<p><b>One good thing</b><br>${esc(f.good.trim())}</p>` : ''
  ].join('');
}

function saveNight(fields: Record<string, string>, entry: Entry | null) {
  const f = { ...fields };
  if (!['answer', 'reason', 'deeper', 'good'].some(k => f[k]?.trim())) return false;
  const all = journal.get();
  const next: Entry = { ...(entry || {}), title: f.question, content: nightHtml(f), template: 'night', fields: f, tags: entry?.tags || [], date: entry?.date || Date.now() };
  journal.set(entry ? all.map(e => (e.date === entry.date ? next : e)) : [...all, next]);
  return true;
}

export function Reflection({ onBack }: { onBack: () => void }) {
  const s = useApp();
  const entries = journal.use();
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<{ entry: Entry | null; template: Template } | null>(null);
  const tonight = entries.find(e => e.template === 'night' && dayOf(e.date) === today());
  const list = useMemo(() => [...entries].filter(e => e !== tonight).sort((a, b) => b.date - a.date).filter(e => !q || (e.title + ' ' + htmlToText(e.content)).toLowerCase().includes(q.toLowerCase())), [entries, q, tonight]);
  const open = (template: Template, entry: Entry | null = null) => { play('tap'); setEditing({ entry, template }); };

  return (
    <Page title="Reflection" onBack={onBack}>
      {tonight ? (
        <button type="button" className="card rf-done" onClick={() => open('night', tonight)}>
          <span className="rf-eyebrow"><Check size={14} weight="bold" /> Tonight’s reflection</span>
          <b>{tonight.fields?.question || tonight.title}</b>
          <span>{preview(tonight)}</span>
        </button>
      ) : (
        <Tonight key={today()} s={s} entries={entries} />
      )}

      <button type="button" className="card rf-free" onClick={() => open('free')}>
        <HabitIcon icon="pencil" color="mint" size={26} /><span><b>Write freely</b><small>Anything on your mind</small></span>
      </button>

      {entries.length > 3 && <div className="search" style={{ marginTop: 14 }}><MagnifyingGlass size={20} weight="bold" /><input placeholder="Search your reflections…" value={q} onChange={e => setQ(e.target.value)} /></div>}
      {list.length > 0 && <h2 className="section-title">Past reflections <small>{list.length}</small></h2>}
      {list.length ? (
        <div className="stack">
          {list.map(e => (
            <button key={e.date} type="button" className="card entry" onClick={() => open(e.template || 'free', e)}>
              <small>{pretty(e.date)}{e.template && e.template !== 'free' && e.template !== 'night' ? ` · ${LABEL[e.template]}` : ''}</small>
              <b>{e.title || 'Untitled'}</b>
              <span>{preview(e)}</span>
              {e.doodle && <img src={e.doodle} alt="" />}
            </button>
          ))}
        </div>
      ) : q ? <div className="empty-state"><b>Nothing matches</b><span>Try another word.</span></div> : null}

      <AnimatePresence>{editing && <Editor key="ed" entry={editing.entry} template={editing.template} onClose={() => setEditing(null)} />}</AnimatePresence>
    </Page>
  );
}

/** Tonight's question, answered right on the screen */
function Tonight({ s, entries }: { s: State; entries: Entry[] }) {
  const qs = useMemo(() => tonightQuestions(s, entries), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [i, setI] = useState(0);
  const [f, setF] = useState<Record<string, string>>({});
  const cur = qs[i % qs.length];
  const set = (k: string, v: string) => setF(x => ({ ...x, [k]: v }));
  const another = () => { play('pop'); setI(n => n + 1); setF(x => ({ good: x.good || '' })); };
  function save() {
    if (!saveNight({ ...f, question: cur.text, kind: cur.kind, habit: cur.habit || '' }, null)) { toast('Write a line first'); play('error'); return; }
    play('check'); haptic.success();
    burst({ x: innerWidth / 2, y: 160, count: 26, power: 0.8 }); praise(innerWidth / 2, 160, 'Saved');
  }
  return (
    <section className="card rf-card">
      <div className="rf-top">
        <span className="rf-eyebrow">Tonight’s question</span>
        <button type="button" className="rf-swap" onClick={another} aria-label="Another question"><ArrowsClockwise size={16} weight="bold" /> Another</button>
      </div>
      <AnimatePresence mode="wait">
        <motion.h2 key={cur.key} className="rf-q" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>{cur.text}</motion.h2>
      </AnimatePresence>
      {cur.kind === 'miss' && (
        <div className="rf-reasons">
          {REASONS.map(r => <button key={r} type="button" className={'rf-reason' + (f.reason === r ? ' on' : '')} onClick={() => { play('tap'); set('reason', f.reason === r ? '' : r); }}>{r}</button>)}
        </div>
      )}
      <textarea className="field rf-answer" rows={3} placeholder={cur.kind === 'miss' ? 'Say it honestly…' : 'Write your answer…'} value={f.answer || ''} onChange={e => set('answer', e.target.value)} />
      {cur.kind === 'miss' && (f.reason || f.answer?.trim()) && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
          <h3 className="field-label">And what’s behind that?</h3>
          <textarea className="field rf-answer" rows={2} placeholder="The reason under the reason" value={f.deeper || ''} onChange={e => set('deeper', e.target.value)} />
        </motion.div>
      )}
      <label className="rf-good"><Sun size={20} weight="fill" /><input placeholder="One good thing today" value={f.good || ''} maxLength={140} onChange={e => set('good', e.target.value)} /></label>
      <button type="button" className="btn block" onClick={save}>Save</button>
    </section>
  );
}

/** What you actually did that day, for old evening reviews */
function daySummary(d: string) {
  const s = getState();
  const habits = s.habits.filter(h => doneToday(h, d));
  const focus = s.focus.sessions.filter(x => x.day === d).reduce((n, x) => n + x.minutes, 0);
  const due = s.habits.filter(h => isRequired(h, d) || doneToday(h, d));
  return { habits: `${habits.length}/${due.length}`, habitNames: habits.map(h => h.name), focus };
}

function Editor({ entry, template, onClose }: { entry: Entry | null; template: Template; onClose: () => void }) {
  const f0 = entry?.fields || {};
  const [fields, setFields] = useState<Record<string, string>>(() => entry && !entry.fields ? { body: htmlToText(entry.content), title: entry.title === 'Untitled' ? '' : entry.title } : { ...f0 });
  const [confirm, setConfirm] = useState(false);
  const set = (k: string, v: string) => setFields(f => ({ ...f, [k]: v }));
  const summary = useMemo(() => daySummary(entry ? dayOf(entry.date) : today()), [entry]);

  function save() {
    if (template === 'night') { if (saveNight(fields, entry)) play('check'); onClose(); return; }
    let title = '', html = '';
    if (template === 'morning') {
      const top = [fields.top1, fields.top2, fields.top3].filter(x => x?.trim());
      if (!top.length && !fields.grateful?.trim()) { onClose(); return; }
      title = 'Morning plan';
      html = `<p><b>Top 3 today</b></p>${top.map((t, i) => `<p>${i + 1}. ${esc(t)}</p>`).join('')}${fields.grateful ? `<p><b>Grateful for</b><br>${esc(fields.grateful)}</p>` : ''}${fields.feel ? `<p><b>I want to feel</b><br>${esc(fields.feel)}</p>` : ''}`;
    } else if (template === 'evening') {
      if (!['win', 'block', 'lesson', 'tomorrow'].some(k => fields[k]?.trim())) { onClose(); return; }
      title = 'Evening review';
      html = `<p><b>Today</b><br>Habits ${summary.habits} · ${fmtMinutes(summary.focus)} focused</p>`
        + [['win', 'Win'], ['block', 'What got in the way'], ['lesson', 'Lesson'], ['tomorrow', 'Tomorrow’s #1']].filter(([k]) => fields[k]?.trim()).map(([k, l]) => `<p><b>${l}</b><br>${esc(fields[k])}</p>`).join('');
    } else {
      if (!fields.body?.trim()) { onClose(); return; }
      title = fields.title?.trim() || (template === 'dump' ? 'Brain dump' : 'Untitled');
      html = para(fields.body);
    }
    const all = journal.get();
    const next: Entry = { ...(entry || {}), title, content: html, template, fields, tags: entry?.tags || [], date: entry?.date || Date.now() };
    journal.set(entry ? all.map(e => (e.date === entry.date ? next : e)) : [...all, next]);
    play('check'); haptic.success();
    if (!entry) { burst({ x: innerWidth / 2, y: 120, count: 26, power: 0.8 }); praise(innerWidth / 2, 120, 'Saved'); }
    onClose();
  }
  function del() {
    if (!confirm) { setConfirm(true); play('tap'); return; }
    journal.set(journal.get().filter(e => e.date !== entry!.date));
    play('whoosh'); toast('Deleted'); onClose();
  }

  return (
    <Page title={entry ? pretty(entry.date) : 'Write freely'} onBack={save} className="editor-page" action={<button type="button" className="btn" onClick={save}>Save</button>}>
      {template === 'night' && <>
        <h2 className="rf-q in-editor">{fields.question}</h2>
        {fields.reason && <div className="rf-reasons"><span className="rf-reason on">{fields.reason}</span></div>}
        <textarea className="field rf-answer" rows={4} placeholder="Write your answer…" value={fields.answer || ''} onChange={e => set('answer', e.target.value)} />
        {fields.kind === 'miss' && <>
          <h3 className="field-label">And what’s behind that?</h3>
          <textarea className="field rf-answer" rows={2} value={fields.deeper || ''} onChange={e => set('deeper', e.target.value)} />
        </>}
        <label className="rf-good"><Sun size={20} weight="fill" /><input placeholder="One good thing today" value={fields.good || ''} maxLength={140} onChange={e => set('good', e.target.value)} /></label>
      </>}

      {template === 'morning' && <>
        <h3 className="field-label">Top 3</h3>
        {[1, 2, 3].map(i => <input key={i} className="field" value={fields[`top${i}`] || ''} onChange={e => set(`top${i}`, e.target.value)} />)}
        <h3 className="field-label">I’m grateful for</h3>
        <input className="field" value={fields.grateful || ''} onChange={e => set('grateful', e.target.value)} />
        <h3 className="field-label">I want to feel</h3>
        <input className="field" value={fields.feel || ''} onChange={e => set('feel', e.target.value)} />
      </>}

      {template === 'evening' && <>
        <div className="card jr-sum"><b>That day</b><span>Habits {summary.habits} · {fmtMinutes(summary.focus)} focused</span></div>
        {[['win', 'Win'], ['block', 'What got in the way?'], ['lesson', 'Lesson'], ['tomorrow', 'Tomorrow’s #1']].map(([k, l]) => (
          <div key={k} className="jr-field"><h3 className="field-label">{l}</h3><textarea className="field" rows={2} value={fields[k] || ''} onChange={e => set(k, e.target.value)} /></div>
        ))}
      </>}

      {(template === 'dump' || template === 'free') && <>
        <input className="field big plain" placeholder="Title" value={fields.title || ''} maxLength={100} onChange={e => set('title', e.target.value)} />
        <textarea className="field plain journal-body" autoFocus={!entry} placeholder="Write anything. It stays on your phone." value={fields.body || ''} onChange={e => set('body', e.target.value)} />
      </>}

      {entry?.doodle && <img className="doodle" src={entry.doodle} alt="Your drawing" />}
      {entry && <button type="button" className={'chip danger' + (confirm ? ' armed' : '')} style={{ marginTop: 16 }} onClick={del}><Trash size={18} weight="bold" /> {confirm ? 'Tap again to delete' : 'Delete'}</button>}
    </Page>
  );
}
