import { HouseSimple, ListChecks, Timer, SquaresFour } from '@phosphor-icons/react';

export type Tab = 'today' | 'tasks' | 'focus' | 'more';

const TABS: { id: Tab; label: string; Icon: typeof HouseSimple }[] = [
  { id: 'today', label: 'Today', Icon: HouseSimple },
  { id: 'tasks', label: 'Tasks', Icon: ListChecks },
  { id: 'focus', label: 'Focus', Icon: Timer },
  { id: 'more', label: 'More', Icon: SquaresFour }
];

export function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav className="tabbar" aria-label="Main">
      {TABS.map(({ id, label, Icon }) => (
        <button key={id} type="button" className={'tab' + (active === id ? ' on' : '')} onClick={() => onChange(id)} aria-current={active === id ? 'page' : undefined}>
          <span className="tab-icon"><Icon size={28} weight={active === id ? 'fill' : 'bold'} /></span>
          <span className="tab-label">{label}</span>
        </button>
      ))}
    </nav>
  );
}
