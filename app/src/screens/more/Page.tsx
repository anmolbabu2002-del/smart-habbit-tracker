// A full-screen page opened from More, sliding in from the right; back returns to More.
import { useEffect, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft } from '@phosphor-icons/react';
import { onBack } from '../../lib/back';
import { play } from '../../lib/sound';

export function Page({ title, onBack: back, children, action, className = '' }: { title: string; onBack: () => void; children: ReactNode; action?: ReactNode; className?: string }) {
  useEffect(() => onBack(() => { back(); return true; }), [back]);
  return (
    <motion.div className={'page ' + className} initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', stiffness: 380, damping: 38 }}>
      <header className="page-bar">
        <button type="button" className="rd-ic" onClick={() => { play('tap'); back(); }} aria-label="Back"><ArrowLeft size={24} weight="bold" /></button>
        <h1>{title}</h1>
        {action}
      </header>
      <div className="page-body">{children}</div>
    </motion.div>
  );
}
