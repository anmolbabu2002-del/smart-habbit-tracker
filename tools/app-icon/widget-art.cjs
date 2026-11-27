// Widget banner artwork (text sits on top natively). Drawn at 330x88 units, top corners rounded.
const MOODS = {
  normal: { a: '#ffb347', b: '#ff5e3a', ray: '#fff', blob: '#ffd166', spark: '#fff7c2' },
  risk:   { a: '#ff5a6e', b: '#b5002b', ray: '#fff', blob: '#ff8a9b', spark: '#ffd1d8' },
  done:   { a: '#3ff0c0', b: '#03a07c', ray: '#fff', blob: '#a6ffe3', spark: '#fff59d' },
};
function star(x, y, r, c, rot = 0) {
  let p = ''; for (let i = 0; i < 10; i++) { const rr = i % 2 ? r * 0.45 : r, t = -Math.PI / 2 + i * Math.PI / 5 + rot; p += (i ? 'L' : 'M') + (x + rr * Math.cos(t)).toFixed(1) + ' ' + (y + rr * Math.sin(t)).toFixed(1); }
  return `<path d="${p}Z" fill="${c}" stroke="#fff" stroke-width="1.2" stroke-linejoin="round" opacity=".95"/>`;
}
const sp = (x, y, s, c) => `<path d="M${x} ${y - s}Q${x} ${y} ${x + s} ${y}Q${x} ${y} ${x} ${y + s}Q${x} ${y} ${x - s} ${y}Q${x} ${y} ${x} ${y - s}Z" fill="${c}"/>`;
let N = 0;
function banner(mood, W = 360, H = 150) {
  const m = MOODS[mood]; const k = ++N;
  let rays = '';
  const cx = W * 0.86, cy = H * 0.5;
  for (let i = 0; i < 16; i++) { const a = (i * 22.5) * Math.PI / 180, b = (i * 22.5 + 9) * Math.PI / 180, R = 420; rays += `<path d="M${cx} ${cy}L${cx + R * Math.cos(a)} ${cy + R * Math.sin(a)}L${cx + R * Math.cos(b)} ${cy + R * Math.sin(b)}Z"/>`; }
  let o = `<defs><linearGradient id="g${k}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${m.a}"/><stop offset="1" stop-color="${m.b}"/></linearGradient>
    <radialGradient id="glow${k}" cx="${cx / W}" cy=".5" r=".45"><stop offset="0" stop-color="#fff" stop-opacity=".45"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
    <rect width="${W}" height="${H}" fill="url(#g${k})"/>
    <g fill="${m.ray}" opacity=".10">${rays}</g>
    <rect width="${W}" height="${H}" fill="url(#glow${k})"/>
    <circle cx="${-10}" cy="${H + 6}" r="62" fill="${m.blob}" opacity=".35"/>
    <circle cx="${W * 0.55}" cy="${-30}" r="46" fill="${m.blob}" opacity=".28"/>
    <path d="M0 ${H - 16} Q ${W * 0.25} ${H - 34} ${W * 0.5} ${H - 14} T ${W} ${H - 18} V ${H} H 0Z" fill="#000" opacity=".08"/>`;
  if (mood === 'risk') {
    // falling rain dashes
    for (let i = 0; i < 14; i++) { const x = (i * 53) % W, y = (i * 37) % H; o += `<path d="M${x} ${y}l-4 10" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".18"/>`; }
  } else {
    o += star(W * 0.66, 22, 7, '#ffe14d', .2) + star(W * 0.62, H - 30, 5, '#ffe14d', .5) + sp(W * 0.73, H * 0.82, 5, m.spark) + sp(W * 0.97, 18, 6, m.spark) + sp(W * 0.5, 16, 3.5, '#fff');
    if (mood === 'done') o += star(W * 0.98, H - 20, 8, '#ffe14d', .1) + sp(W * 0.58, H * 0.5, 4, '#fff') + star(W * 0.42, H - 14, 4.5, '#fff59d', .3);
  }
  const r = 24, clip = `M0 ${r} Q0 0 ${r} 0 H${W - r} Q${W} 0 ${W} ${r} V${H} H0Z`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}"><defs><clipPath id="c${k}"><path d="${clip}"/></clipPath></defs><g clip-path="url(#c${k})">${o}</g></svg>`;
}
const COLORS = { orange: ['#ff8c42', '#e26b1f'], mint: ['#12c79b', '#0c9e7a'], blue: ['#1cb0f6', '#1899d6'], purple: ['#a560e8', '#8547c6'], yellow: ['#ffc800', '#e0a800'], red: ['#ff4b4b', '#d93a3a'] };
/** Round 3D buttons, 30x32 units (2-unit solid edge below) */
function button(kind, color) {
  const [c, edge] = kind === 'done' ? ['#12c79b', '#0c9e7a'] : COLORS[color];
  let face;
  if (kind === 'done') face = `<circle cx="15" cy="15" r="14" fill="${c}"/><path d="M8.6 15.4l4.3 4.3 8.6-8.9" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>`;
  else if (kind === 'cam') face = `<circle cx="15" cy="15" r="14" fill="${c}"/><path d="M8 11.6h3l1.5-2.2h5l1.5 2.2h3v9.4H8z" fill="#fff" stroke="#fff" stroke-width="1.3" stroke-linejoin="round"/><circle cx="15" cy="16.1" r="2.7" fill="${c}"/>`;
  else face = `<circle cx="15" cy="15" r="12.6" fill="#fff" stroke="${c}" stroke-width="2.8"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 32"><circle cx="15" cy="17" r="14" fill="${edge}"/>${face}</svg>`;
}
module.exports = { banner, button, MOODS, COLORS };
