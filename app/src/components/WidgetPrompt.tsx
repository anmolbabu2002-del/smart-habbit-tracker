// "Put Noto on your home screen": shown now and then (see shouldAskWidget), never on Today itself.
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle, HandTap, Camera } from '@phosphor-icons/react';
import { shouldAskWidget, markWidgetAsked, pinWidget } from '../lib/widget';
import { onBack } from '../lib/back';
import { play } from '../lib/sound';
import { toast } from '../lib/celebrate';

export const MANUAL_STEPS = 'Long-press your home screen, tap Widgets, then find Ultradian.';

export function WidgetPrompt() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => { shouldAskWidget().then(ok => { if (ok) { play('pop'); setOpen(true); } }); }, 2500);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => (open ? onBack(() => { notNow(); return true; }) : undefined), [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const notNow = () => { play('tap'); markWidgetAsked(true); setOpen(false); };
  const add = async () => {
    play('tap');
    markWidgetAsked(false);
    setOpen(false);
    if (!(await pinWidget())) toast(MANUAL_STEPS);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="confirm coach" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div className="confirm-card wp" initial={{ y: 60, opacity: 0, scale: 0.94 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 30, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 360, damping: 28 }}>
            <motion.img className="wp-img" src="widget-preview.png" alt="" initial={{ rotate: -4, y: 10 }} animate={{ rotate: -2, y: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 12, delay: 0.1 }} />
            <b>Put Noto on your home screen</b>
            <ul className="wp-list">
              <li><HandTap size={18} weight="fill" /> Tick habits without opening the app</li>
              <li><Camera size={18} weight="fill" /> Photo habits jump straight to the camera</li>
              <li><CheckCircle size={18} weight="fill" /> Your why, right on your home screen</li>
            </ul>
            <button type="button" className="btn big block" onClick={add}>Add widget</button>
            <button type="button" className="coach-no" onClick={notNow}>Not now</button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
