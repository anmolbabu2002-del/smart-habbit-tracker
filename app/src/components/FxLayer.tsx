// Confetti on a full-screen canvas plus floating praise words ("Boom!"), drawn above everything.
import { useEffect, useRef, useState } from 'react';
import { registerFx, type BurstOpts } from '../lib/celebrate';

type P = { x: number; y: number; vx: number; vy: number; rot: number; vr: number; size: number; color: string; shape: 'rect' | 'circle' | 'star'; life: number; tilt: number; vt: number };
const COLORS = ['#ff8c42', '#ffc800', '#12c79b', '#1cb0f6', '#a560e8', '#ff4b4b', '#ff7eb6'];
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

function star(ctx: CanvasRenderingContext2D, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i * Math.PI) / 5 - Math.PI / 2, rr = i % 2 ? r * 0.45 : r;
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
}

export function FxLayer() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const parts = useRef<P[]>([]);
  const raf = useRef(0);
  const [words, setWords] = useState<{ id: number; x: number; y: number; text: string; color?: string }[]>([]);

  useEffect(() => {
    const cv = canvas.current!;
    const ctx = cv.getContext('2d')!;
    const dpr = Math.min(2, devicePixelRatio || 1);
    const size = () => { cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; };
    size();
    addEventListener('resize', size);

    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(2.5, (now - last) / 16.67);
      last = now;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      const ps = parts.current;
      for (let i = ps.length - 1; i >= 0; i--) {
        const p = ps[i];
        p.vy += 0.32 * dt;
        p.vx *= Math.pow(0.985, dt);
        p.vy *= Math.pow(0.985, dt);
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
        p.tilt += p.vt * dt;
        p.life -= 0.006 * dt;
        if (p.y > innerHeight + 40 || p.life <= 0) { ps.splice(i, 1); continue; }
        ctx.save();
        ctx.globalAlpha = Math.min(1, p.life * 3);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.scale(1, Math.cos(p.tilt)); // paper flipping in the air
        ctx.fillStyle = p.color;
        if (p.shape === 'rect') ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.66);
        else if (p.shape === 'circle') { ctx.beginPath(); ctx.arc(0, 0, p.size / 2.4, 0, Math.PI * 2); ctx.fill(); }
        else star(ctx, p.size / 1.6);
        ctx.restore();
      }
      raf.current = ps.length ? requestAnimationFrame(loop) : 0;
    };
    const kick = () => { if (!raf.current) { last = performance.now(); raf.current = requestAnimationFrame(loop); } };

    const make = (x: number, y: number, vx: number, vy: number, colors: string[], shapes: P['shape'][]): P => ({
      x, y, vx, vy, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, size: 7 + Math.random() * 7,
      color: colors[Math.floor(Math.random() * colors.length)], shape: shapes[Math.floor(Math.random() * shapes.length)],
      life: 1, tilt: Math.random() * 6, vt: 0.1 + Math.random() * 0.2
    });

    registerFx({
      burst(o: BurstOpts) {
        if (reduced()) return;
        const n = o.count ?? 30, power = o.power ?? 1, colors = o.colors || COLORS, shapes = o.shapes || ['rect', 'rect', 'circle', 'star'];
        for (let i = 0; i < n; i++) {
          const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.3;
          const sp = (5 + Math.random() * 9) * power;
          parts.current.push(make(o.x, o.y, Math.cos(a) * sp, Math.sin(a) * sp, colors, shapes));
        }
        kick();
      },
      rain(ms = 1800) {
        if (reduced()) return;
        const until = performance.now() + ms;
        const drop = () => {
          for (let i = 0; i < 7; i++) parts.current.push(make(Math.random() * innerWidth, -20, (Math.random() - 0.5) * 3, 2 + Math.random() * 4, COLORS, ['rect', 'rect', 'circle', 'star']));
          kick();
          if (performance.now() < until) setTimeout(drop, 45);
        };
        // two side cannons, then a shower
        [0.08, 0.92].forEach(fx => {
          for (let i = 0; i < 45; i++) {
            const a = -Math.PI / 2 + (fx < 0.5 ? 0.35 : -0.35) + (Math.random() - 0.5) * 0.7;
            const sp = 12 + Math.random() * 12;
            parts.current.push(make(innerWidth * fx, innerHeight * 0.85, Math.cos(a) * sp, Math.sin(a) * sp, COLORS, ['rect', 'circle', 'star']));
          }
        });
        drop();
      },
      praise(x, y, text, color) {
        const id = Date.now() + Math.random();
        setWords(w => [...w, { id, x: Math.max(70, Math.min(innerWidth - 70, x)), y, text, color }]);
        setTimeout(() => setWords(w => w.filter(v => v.id !== id)), 1100);
      }
    });
    return () => { registerFx(null); removeEventListener('resize', size); cancelAnimationFrame(raf.current); };
  }, []);

  return (
    <>
      <canvas ref={canvas} className="fx-canvas" aria-hidden="true" />
      {words.map(w => (
        <span key={w.id} className="praise" style={{ left: w.x, top: w.y, color: w.color }} aria-hidden="true">{w.text}</span>
      ))}
    </>
  );
}
