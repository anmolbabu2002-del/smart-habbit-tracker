// Design check: every illustrated icon in every colour (open with ?screen=icons).
import { HabitIcon, ICON_IDS } from '../components/HabitIcon';
import { COLORS } from '../lib/types';
import { StreakFlame } from '../components/StreakFlame';
import { STAGES } from '../lib/streak';

export function IconGallery() {
  return (
    <main className="screen" style={{ paddingBottom: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 24 }}>
        {STAGES.map((st, i) => (
          <div key={st.id} style={{ display: 'grid', justifyItems: 'center', gap: 2 }}>
            <StreakFlame stage={i} size={68} still />
            <small style={{ fontSize: 11, fontWeight: 900 }}>{st.name}</small>
            <small style={{ fontSize: 10, color: 'var(--ink-soft)' }}>{st.min}+ days</small>
          </div>
        ))}
        <div style={{ display: 'grid', justifyItems: 'center' }}><StreakFlame stage={4} size={68} locked /><small style={{ fontSize: 10 }}>locked</small></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10 }}>
        {ICON_IDS.map((id, i) => {
          const color = COLORS[i % COLORS.length];
          return (
            <div key={id} style={{ display: 'grid', justifyItems: 'center', gap: 4 }}>
              <span className="habit-tile" style={{ background: `var(--${color}-soft)` }}><HabitIcon icon={id} color={color} size={38} /></span>
              <small style={{ fontSize: 10, color: 'var(--ink-soft)' }}>{id}</small>
            </div>
          );
        })}
      </div>
    </main>
  );
}
