// The first thing a new user sees: a sleeping ember on a hill at sunrise, and the locked
// mystery forms it could grow into. One tap on a suggestion creates the first habit.
import { motion } from 'motion/react';
import { StreakFlame } from './StreakFlame';
import { Mascot } from './Mascot';
import { HabitIcon, iconFor, colorFor } from './HabitIcon';
import { saveHabit } from '../lib/actions';
import { play } from '../lib/sound';

const IDEAS = ['Read 10 pages', 'Workout', 'Meditate', 'Drink water', 'Study 1 hour', 'Journal'];

export function EmptyHabits({ onCustom }: { onCustom: () => void }) {
  return (
    <section className="card empty-hero">
      <svg className="eh-scene" viewBox="0 0 360 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <linearGradient id="eh-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffd9b8" /><stop offset=".55" stopColor="#ffeede" /><stop offset="1" stopColor="#fff7ee" /></linearGradient>
          <radialGradient id="eh-sun"><stop offset="0" stopColor="#ffc56b" /><stop offset="1" stopColor="#ffc56b" stopOpacity="0" /></radialGradient>
        </defs>
        <rect width="360" height="200" fill="url(#eh-sky)" />
        <circle cx="270" cy="120" r="80" fill="url(#eh-sun)" className="eh-glow" />
        <circle cx="270" cy="122" r="26" fill="#ffb25c" opacity=".9" />
        <path d="M0 150 C60 120 120 128 180 140 C240 152 300 130 360 140 V200 H0Z" fill="#a8ecd9" />
        <path d="M0 170 C70 150 130 160 190 168 C250 176 310 158 360 166 V200 H0Z" fill="#12c79b" opacity=".85" />
        <path d="M120 148 C150 120 210 120 240 148" fill="#7fdcbf" />
        {[[40, 40], [90, 24], [150, 50], [320, 34], [210, 22]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1.8" fill="#fff" className="eh-star" style={{ animationDelay: `${i * 0.6}s` }} />)}
        <path d="M30 166 q4 -10 8 0 M300 172 q4 -12 8 0 M330 168 q3 -8 6 0" stroke="#0c9e7a" strokeWidth="2" fill="none" strokeLinecap="round" />
      </svg>
      <div className="eh-ember"><StreakFlame stage={0} size={84} /></div>
      <motion.div className="eh-mascot" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3, type: 'spring' }}><Mascot size={54} mood="happy" /></motion.div>

      <div className="eh-text">
        <b>Your flame is asleep</b>
        <span>Add one habit and it wakes up. Keep it going and it evolves into forms you haven’t seen yet.</span>
      </div>
      <div className="eh-mystery" aria-hidden="true">
        {[1, 3, 5, 7, 9].map(i => <span key={i}><StreakFlame stage={i} size={34} still locked /><small>?</small></span>)}
      </div>
      <div className="eh-ideas">
        {IDEAS.map(n => {
          const icon = iconFor(n);
          return (
            <button key={n} type="button" className="eh-idea" onClick={() => { play('add'); saveHabit({ name: n, icon, color: colorFor(icon) }); }}>
              <HabitIcon icon={icon} color={colorFor(icon)} size={22} />{n}
            </button>
          );
        })}
      </div>
      <button type="button" className="btn block" onClick={() => { play('tap'); onCustom(); }}>Create my own habit</button>
    </section>
  );
}
