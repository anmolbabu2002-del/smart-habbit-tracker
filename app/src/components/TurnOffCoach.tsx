// Turning Habit Lock off takes five "are you sure?" moments, one at a time. The good choice is a
// big bright button; the other is small grey text. Choosing the good one ends it right there.
import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Mascot } from './Mascot';
import { WhyQuote } from './Why';
import { play } from '../lib/sound';
import { haptic } from '../lib/native';
import { praise, burst } from '../lib/celebrate';

const STEPS = (streak: number) => [
  { mood: 'happy' as const, title: 'Your future self is counting on you.', text: 'The lock is the reason the hard things get done first.', yes: 'Keep it on', no: 'Still turn it off' },
  { mood: 'focus' as const, title: 'Scrolling feels good for 5 minutes.', text: 'Finishing your habits feels good all day.', yes: 'Nah, I’ll focus', no: 'I’ll get distracted anyway' },
  { mood: 'focus' as const, title: streak > 1 ? `You’re on a ${streak}-day streak.` : 'Streaks start with days like today.', text: 'The lock is what protects it on lazy evenings.', yes: 'Protect my streak', no: 'I don’t care about the streak' },
  { mood: 'sleepy' as const, title: 'The apps will still be there.', text: 'Right after your habits. They always are.', yes: 'Let’s thrive', no: 'I want them now' },
  { mood: 'sleepy' as const, title: 'Last chance.', text: 'Turning it off today makes it easier to slip tomorrow too.', yes: 'Keep me strong', no: 'Turn it off' }
];

export function TurnOffCoach({ open, streak, onKeep, onOff }: { open: boolean; streak: number; onKeep: () => void; onOff: () => void }) {
  const [step, setStep] = useState(0);
  const steps = STEPS(streak);
  const st = steps[step];
  const keep = () => {
    play('combo');
    haptic.success();
    burst({ x: innerWidth / 2, y: innerHeight * 0.45, count: 30 });
    praise(innerWidth / 2, innerHeight * 0.38, 'Good call!');
    setStep(0);
    onKeep();
  };
  const no = () => {
    play('tap');
    haptic.warning();
    if (step === steps.length - 1) { setStep(0); onOff(); } else setStep(step + 1);
  };
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="confirm coach" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <AnimatePresence mode="wait">
            <motion.div key={step} className="confirm-card" initial={{ y: 40, opacity: 0, scale: 0.96 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: -20, opacity: 0 }} transition={{ type: 'spring', stiffness: 380, damping: 30 }}>
              <span className="coach-step">{step + 1} of {steps.length}</span>
              <Mascot size={74} mood={st.mood} />
              <b>{st.title}</b>
              <span>{st.text}</span>
              <WhyQuote className="in-card" />
              <button type="button" className="btn big block mint" onClick={keep}>{st.yes}</button>
              <button type="button" className="coach-no" onClick={no}>{st.no}</button>
            </motion.div>
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
