// "Your why": one line in the user's own words. Quiet on Today, and shown again at the moments
// they're about to give in (locked apps, quitting focus, turning the lock off).
import { useState } from 'react';
import { PencilSimple } from '@phosphor-icons/react';
import { Sheet } from './Sheet';
import { useApp, update } from '../lib/store';
import { WHY_DEFAULT, whyText } from '../lib/why';
import { syncLock } from '../lib/lock';
import { play } from '../lib/sound';

/** The line on Today: tap to edit */
export function WhyLine() {
  const s = useApp();
  const [open, setOpen] = useState(false);
  const own = !!(s.why || '').trim();
  return (
    <>
      <button type="button" className={'why' + (own ? ' own' : '')} onClick={() => { play('tap'); setOpen(true); }}
        aria-label={own ? 'Edit your why' : 'Write your why'}>
        <h1><q>{own ? s.why : WHY_DEFAULT}</q>{own && <PencilSimple className="why-pen" size={15} weight="bold" />}</h1>
        {!own && <span className="why-cta"><PencilSimple size={13} weight="bold" /> Write your why</span>}
      </button>
      <WhyEditor open={open} onClose={() => setOpen(false)} />
    </>
  );
}

export function WhyEditor({ open, onClose }: { open: boolean; onClose: () => void }) {
  const s = useApp();
  const [text, setText] = useState(s.why || '');
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) { setWasOpen(open); if (open) setText(s.why || ''); }
  const save = (value: string) => {
    play('pop');
    update(d => { d.why = value.trim().replace(/\s+/g, ' ').slice(0, 120); });
    syncLock();
    onClose();
  };
  return (
    <Sheet open={open} onClose={onClose} title="Your why">
      <div className="editor">
        <p className="why-help">One line that reminds you why you’re doing this. It shows here, and again when your apps are locked or you try to quit.</p>
        <textarea className="field big why-field" rows={2} maxLength={120} autoFocus placeholder={WHY_DEFAULT} value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); save(text); } }} />
        <button type="button" className="btn big block" onClick={() => save(text)}>Save</button>
        {(s.why || '').trim() && <button type="button" className="btn block ghost" onClick={() => save('')}>Use the default line</button>}
      </div>
    </Sheet>
  );
}

/** Big version for the hard moments */
export function WhyQuote({ className = '' }: { className?: string }) {
  useApp();
  return <q className={'why-big ' + className}>{whyText()}</q>;
}
