import { useEffect, useRef, useState } from 'react';
import { PaperPlaneRight, Plus, ClockCounterClockwise, Trash } from '@phosphor-icons/react';
import { AnimatePresence, motion } from 'motion/react';
import { blobGet, blobSet, legacyGet, getState, uid } from '../../lib/store';
import { api } from '../../lib/native';
import { play } from '../../lib/sound';
import { streakOf } from '../../lib/streak';
import { requiredHabits } from '../../lib/lock';
import { doneToday } from '../../lib/actions';
import { weekMinutes } from '../../lib/focus';
import { Sheet } from '../../components/Sheet';
import { HabitIcon } from '../../components/HabitIcon';
import { Page } from './Page';

type Msg = { role: 'user' | 'model'; text: string };
type ChatT = { id: string; title: string; messages: Msg[]; createdAt: string };
const PERSONAS = [{ id: 'savage', label: 'Savage' }, { id: 'supportive', label: 'Supportive' }, { id: 'professional', label: 'Professional' }];
const STARTERS = ['Plan my evening around my habits', 'Roast my habits today', 'Help me study smarter', 'Give me a 5-minute motivation boost'];

async function loadChats(): Promise<ChatT[]> {
  const mine = await blobGet<ChatT[]>('aiChats');
  if (mine) return mine;
  const old = await legacyGet<ChatT[]>('aiChatSessions');
  const list = Array.isArray(old) ? old : [];
  await blobSet('aiChats', list).catch(() => {});
  return list;
}

function context() {
  const s = getState();
  const req = requiredHabits(s);
  return {
    userName: s.name || 'friend',
    currentTime: new Date().toLocaleString(),
    habits: { total: req.length, completed: req.filter(h => doneToday(h)).length },
    streak: streakOf(s),
    focusMinutesThisWeek: weekMinutes(s).reduce((n, d) => n + d.minutes, 0),
    aiPersonality: localStorage.getItem('aiPersonality') || 'savage',
    globalMemory: localStorage.getItem('aiGlobalMemory') || ''
  };
}

// Light formatting: **bold**, *italic*, `code`, ```blocks```, line breaks. Escaped first.
function format(text: string) {
  const esc = text.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!));
  return esc.replace(/```(\w+)?\n?([\s\S]*?)```/g, (_, __, code) => `<pre>${code}</pre>`)
    .replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<i>$2</i>')
    .replace(/^#{1,3} (.+)$/gm, '<b>$1</b>').replace(/^[-•] (.+)$/gm, '• $1').replace(/\n/g, '<br>');
}

export function Chat({ onBack }: { onBack: () => void }) {
  const [chats, setChats] = useState<ChatT[]>([]);
  const [id, setId] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [persona, setPersona] = useState(localStorage.getItem('aiPersonality') || 'savage');
  const end = useRef<HTMLDivElement>(null);
  const chat = chats.find(c => c.id === id) || null;

  useEffect(() => { loadChats().then(setChats); }, []);
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth' }); }, [chat?.messages.length, busy]);
  const persist = (list: ChatT[]) => { setChats(list); blobSet('aiChats', list).catch(() => {}); };

  async function send(msg = text) {
    const m = msg.trim();
    if (!m || busy) return;
    setText('');
    play('pop');
    let cur = chat;
    let list = chats;
    if (!cur) { cur = { id: uid(), title: m.slice(0, 40), messages: [], createdAt: new Date().toISOString() }; list = [cur, ...list]; setId(cur.id); }
    const history = cur.messages.slice(-20);
    const withUser = { ...cur, messages: [...cur.messages, { role: 'user' as const, text: m }] };
    list = list.map(c => (c.id === withUser.id ? withUser : c));
    persist(list);
    setBusy(true);
    try {
      const res = await fetch(api('/.netlify/functions/ai'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: m, context: context(), history }) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      let reply: string = data.reply || 'Hmm, I got nothing. Try asking again!';
      const mem = [...reply.matchAll(/\[MEMORY_APPEND:\s*(.*?)\]/gi)].map(x => x[1].trim()).filter(Boolean);
      if (mem.length) {
        let all = localStorage.getItem('aiGlobalMemory') || '';
        mem.forEach(f => { if (!all.includes(f)) all += `\n- ${f}`; });
        localStorage.setItem('aiGlobalMemory', all.trim());
        reply = reply.replace(/\[MEMORY_APPEND:\s*(.*?)\]/gi, '').trim();
      }
      const done = { ...withUser, messages: [...withUser.messages, { role: 'model' as const, text: reply }] };
      persist(list.map(c => (c.id === done.id ? done : c)));
      play('tap');
    } catch {
      const failed = { ...withUser, messages: [...withUser.messages, { role: 'model' as const, text: 'I couldn’t connect. Check your internet and try again.' }] };
      persist(list.map(c => (c.id === failed.id ? failed : c)));
      play('error');
    } finally { setBusy(false); }
  }

  return (
    <Page title="Anmol AI" onBack={onBack} className="chat-page"
      action={<>
        <button type="button" className="rd-ic" onClick={() => { play('tap'); setHistoryOpen(true); }} aria-label="Past chats"><ClockCounterClockwise size={24} weight="bold" /></button>
        <button type="button" className="rd-ic" onClick={() => { play('tap'); setId(null); }} aria-label="New chat"><Plus size={24} weight="bold" /></button>
      </>}>
      <div className="msgs">
        {!chat && (
          <div className="chat-hello">
            <HabitIcon icon="chat" color="blue" size={72} />
            <b>Hey {getState().name || 'there'}! What are we crushing today?</b>
            <span>I can see your habits, streak and focus time.</span>
            <div className="chips wrap center">
              {PERSONAS.map(p => <button key={p.id} type="button" className={'chip' + (persona === p.id ? ' on' : '')} onClick={() => { play('toggle'); setPersona(p.id); localStorage.setItem('aiPersonality', p.id); }}>{p.label}</button>)}
            </div>
            <div className="starters">
              {STARTERS.map(s => <button key={s} type="button" className="card starter" onClick={() => send(s)}>{s}</button>)}
            </div>
          </div>
        )}
        {chat?.messages.map((m, i) => (
          <motion.div key={i} className={'msg ' + m.role} initial={{ opacity: 0, y: 8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}>
            {m.role === 'user' ? m.text : <span dangerouslySetInnerHTML={{ __html: format(m.text) }} />}
          </motion.div>
        ))}
        <AnimatePresence>{busy && <motion.div className="msg model typing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><i /><i /><i /></motion.div>}</AnimatePresence>
        <div ref={end} />
      </div>
      <div className="composer">
        <textarea rows={1} placeholder="Ask Anmol AI…" value={text} onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} />
        <button type="button" className="btn round" disabled={!text.trim() || busy} onClick={() => send()} aria-label="Send"><PaperPlaneRight size={22} weight="fill" /></button>
      </div>

      <Sheet open={historyOpen} onClose={() => setHistoryOpen(false)} title="Past chats">
        {chats.length ? (
          <div className="card list">
            {chats.map(c => (
              <div key={c.id} className="task">
                <button type="button" className="task-text" onClick={() => { play('tap'); setId(c.id); setHistoryOpen(false); }}><b>{c.title}</b><small>{c.messages.length} messages · {new Date(c.createdAt).toLocaleDateString()}</small></button>
                <button type="button" className="rd-ic" aria-label="Delete chat" onClick={() => { play('whoosh'); persist(chats.filter(x => x.id !== c.id)); if (id === c.id) setId(null); }}><Trash size={20} weight="bold" /></button>
              </div>
            ))}
          </div>
        ) : <p className="fine">No chats yet.</p>}
      </Sheet>
    </Page>
  );
}
