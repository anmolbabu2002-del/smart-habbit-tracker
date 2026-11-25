// Bottom sheet: slides up over a dimmed backdrop; tap outside, swipe down or press back to close.
import { useEffect, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { play } from '../lib/sound';
import { onBack } from '../lib/back';

export function Sheet({ open, onClose, children, title, className = '' }: { open: boolean; onClose: () => void; children: ReactNode; title?: string; className?: string }) {
  useEffect(() => {
    if (!open) return;
    play('whoosh');
    const off = onBack(() => { onClose(); return true; });
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    addEventListener('keydown', esc);
    return () => { off(); removeEventListener('keydown', esc); };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="sheet-wrap" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="sheet-backdrop" onClick={onClose} />
          <motion.div className={'sheet ' + className} role="dialog" aria-modal="true" aria-label={title}
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 36 }}
            drag="y" dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, i) => { if (i.offset.y > 110 || i.velocity.y > 600) onClose(); }}>
            <span className="sheet-handle" />
            {title && <h2 className="sheet-title">{title}</h2>}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
