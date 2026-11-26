import { LockSimple, CheckCircle, Info } from '@phosphor-icons/react';
import { AnimatePresence, motion } from 'motion/react';
import { useToasts, dismissToast } from '../lib/celebrate';

export function Toasts() {
  const list = useToasts();
  return (
    <div className="toasts" aria-live="polite">
      <AnimatePresence>
        {list.map(t => (
          <motion.div key={t.id} className={'toast ' + (t.tone || 'default')} layout
            initial={{ y: -30, opacity: 0, scale: 0.9 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: -20, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}>
            {t.tone === 'lock' ? <LockSimple size={20} weight="fill" /> : t.tone === 'good' ? <CheckCircle size={20} weight="fill" /> : <Info size={20} weight="fill" />}
            <span>{t.text}</span>
            {t.action && <button type="button" className="toast-action" onClick={() => { t.action!.run(); dismissToast(t.id); }}>{t.action.label}</button>}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
