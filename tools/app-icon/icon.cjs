// Ultradian launcher icons: Noto fills the tile. Three moods, drawn as SVG on the 108x108
// adaptive-icon canvas (about 18..90 is visible). Render with: node tools/app-icon/render.cjs
const FACES = {
  "normal": "\n    <ellipse cx=\"39\" cy=\"66.5\" rx=\"4.4\" ry=\"2.8\" fill=\"#ff9fb4\"/><ellipse cx=\"71\" cy=\"66.5\" rx=\"4.4\" ry=\"2.8\" fill=\"#ff9fb4\"/>\n    <ellipse cx=\"45\" cy=\"58\" rx=\"4.6\" ry=\"6.2\" fill=\"#2a3040\"/><ellipse cx=\"65\" cy=\"58\" rx=\"4.6\" ry=\"6.2\" fill=\"#2a3040\"/>\n    <circle cx=\"46.8\" cy=\"55.6\" r=\"1.8\" fill=\"#fff\"/><circle cx=\"66.8\" cy=\"55.6\" r=\"1.8\" fill=\"#fff\"/>\n    <path d=\"M48.5 67 q6.5 7.5 13 0\" stroke=\"#2a3040\" stroke-width=\"3.4\" fill=\"none\" stroke-linecap=\"round\"/>",
  "done": "<ellipse cx=\"38\" cy=\"66.5\" rx=\"5\" ry=\"3.2\" fill=\"#ff9fb4\"/><ellipse cx=\"72\" cy=\"66.5\" rx=\"5\" ry=\"3.2\" fill=\"#ff9fb4\"/><path d=\"M40 59 q5 -6.5 10 0\" stroke=\"#2a3040\" stroke-width=\"4\" fill=\"none\" stroke-linecap=\"round\"/><path d=\"M60 59 q5 -6.5 10 0\" stroke=\"#2a3040\" stroke-width=\"4\" fill=\"none\" stroke-linecap=\"round\"/>\n     <path d=\"M47 67 l5.5 5.5 l11 -10.5\" stroke=\"#0bae86\" stroke-width=\"4.6\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>",
  "risk": "\n    <ellipse cx=\"38.5\" cy=\"66.5\" rx=\"4.6\" ry=\"2.9\" fill=\"#ff9fb4\"/><ellipse cx=\"71.5\" cy=\"66.5\" rx=\"4.6\" ry=\"2.9\" fill=\"#ff9fb4\"/>\n    <path d=\"M40 50.5 q4 -1 8 -3.6\" stroke=\"#2a3040\" stroke-width=\"2.4\" fill=\"none\" stroke-linecap=\"round\"/>\n    <path d=\"M70 50.5 q-4 -1 -8 -3.6\" stroke=\"#2a3040\" stroke-width=\"2.4\" fill=\"none\" stroke-linecap=\"round\"/>\n    <ellipse cx=\"45\" cy=\"58\" rx=\"5.4\" ry=\"6.4\" fill=\"#2a3040\"/><ellipse cx=\"65\" cy=\"58\" rx=\"5.4\" ry=\"6.4\" fill=\"#2a3040\"/>\n    <path d=\"M40 60 q5 3.8 10 0 v1.4 q-5 4.4 -10 0z\" fill=\"#6fd0ff\"/><path d=\"M60 60 q5 3.8 10 0 v1.4 q-5 4.4 -10 0z\" fill=\"#6fd0ff\"/>\n    <circle cx=\"47\" cy=\"55.4\" r=\"2.2\" fill=\"#fff\"/><circle cx=\"67\" cy=\"55.4\" r=\"2.2\" fill=\"#fff\"/>\n    <circle cx=\"43.2\" cy=\"60\" r=\"1\" fill=\"#fff\"/><circle cx=\"63.2\" cy=\"60\" r=\"1\" fill=\"#fff\"/>\n    <path d=\"M42.5 63.5 q-1 7 0.6 13.5\" stroke=\"#6fd0ff\" stroke-width=\"3.4\" fill=\"none\" stroke-linecap=\"round\"/>\n    <path d=\"M67.5 63.5 q1 7 -0.6 13.5\" stroke=\"#6fd0ff\" stroke-width=\"3.4\" fill=\"none\" stroke-linecap=\"round\"/>\n    <path d=\"M49.5 71.5 q2.7 -3 5.5 -0.6 q2.8 -2.4 5.5 0.6\" stroke=\"#2a3040\" stroke-width=\"2.8\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>"
};
// Noto fills the whole tile (like Duolingo's face icon). 108x108 adaptive canvas, visible ~18..90.

const MOOD = {
  normal: { band: ['#3cc3ff', '#129be0'], page: ['#ffffff', '#eef3f9'] },
  done:   { band: ['#3fe8b8', '#0bae86'], page: ['#ffffff', '#ecfaf4'] },
  risk:   { band: ['#ff6b6b', '#e02b3a'], page: ['#fff4f4', '#ffdcdc'] },
};
let N = 0;
function bg(st) {
  N++; const m = MOOD[st];
  return `<defs><linearGradient id="p${N}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${m.page[0]}"/><stop offset="1" stop-color="${m.page[1]}"/></linearGradient>
  <linearGradient id="t${N}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${m.band[0]}"/><stop offset="1" stop-color="${m.band[1]}"/></linearGradient></defs>
  <rect width="108" height="108" fill="url(#p${N})"/>
  <rect width="108" height="43" fill="url(#t${N})"/>
  <rect y="43" width="108" height="2.2" fill="#000" opacity=".07"/>`;
}
function fg(st) {
  let o = '';
  // binder rings across the band
  for (const x of [35, 47.7, 60.3, 73]) o += `<rect x="${x - 3}" y="25.5" width="6" height="14" rx="3" fill="#fff" stroke="#4d5670" stroke-width="2"/><circle cx="${x}" cy="40.2" r="2.2" fill="#1d2433" opacity=".35"/>`;
  // face, scaled up and centred on the page
  o += `<g transform="translate(54 68) scale(1.28) translate(-55 -62)">${FACES[st]}</g>`;
  return o;
}
const wrap = (i) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108">${i}</svg>`;
const notoFull = (st, part = 'all') => wrap(part === 'bg' ? bg(st) : part === 'fg' ? fg(st) : bg(st) + fg(st));
module.exports = { notoFull };
