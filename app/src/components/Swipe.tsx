// Swipe a row left to reveal its actions (like native mail and to-do apps). Long-press does the same.
import { useRef, useState, type ReactNode } from 'react';
import { motion, useAnimation } from 'motion/react';
import { haptic } from '../lib/native';

export type SwipeAction = { label: string; icon: ReactNode; tone: 'red' | 'blue' | 'mint'; run: () => void };

export function Swipe({ actions, children, className = '', onSwipeRight, holdOnly }: { actions: SwipeAction[]; children: ReactNode; className?: string; onSwipeRight?: () => void; holdOnly?: boolean }) {
  const width = actions.length * 72;
  const ctl = useAnimation();
  const [open, setOpen] = useState(false);
  const press = useRef(0);
  const close = () => { ctl.start({ x: 0 }); setOpen(false); };
  const reveal = () => { ctl.start({ x: -width }); setOpen(true); haptic.tap(); };
  return (
    <div className={'swipe ' + className}>
      <div className="swipe-actions" style={{ width }}>
        {actions.map(a => (
          <button key={a.label} type="button" className={'swipe-btn ' + a.tone} onClick={() => { close(); a.run(); }}>{a.icon}<small>{a.label}</small></button>
        ))}
      </div>
      <motion.div className="swipe-front" drag={holdOnly ? false : 'x'} dragDirectionLock dragConstraints={{ left: -width, right: onSwipeRight ? 90 : 0 }} dragElastic={0.12} animate={ctl}
        onPointerDown={() => { press.current = window.setTimeout(reveal, 550); }}
        onPointerUp={() => clearTimeout(press.current)} onPointerCancel={() => clearTimeout(press.current)}
        onDragStart={() => clearTimeout(press.current)}
        onDragEnd={(_, i) => {
          if (onSwipeRight && i.offset.x > 70) { close(); onSwipeRight(); return; }
          if (i.offset.x < -width / 2 || i.velocity.x < -400) reveal(); else close();
        }}
        onClickCapture={e => { if (open) { e.stopPropagation(); e.preventDefault(); close(); } }}>
        {children}
      </motion.div>
    </div>
  );
}
