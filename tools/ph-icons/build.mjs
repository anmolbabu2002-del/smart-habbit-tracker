// Builds app/public/ph-icons.json: every Phosphor icon (fill style) as bare SVG markup, for the
// habit icon search. Loaded only when the search opens. Run: node tools/ph-icons/build.mjs
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
const app = path.resolve(here, '../../app');
const require = createRequire(path.join(app, 'package.json'));
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const ph = await import(path.join(app, 'node_modules/@phosphor-icons/react/dist/index.es.js'));
const out = [];
for (const [name, C] of Object.entries(ph)) {
  if (!/^[A-Z]/.test(name) || name.endsWith('Icon') || name === 'IconContext' || name === 'IconBase' || typeof C !== 'object' && typeof C !== 'function') continue;
  let svg;
  try { svg = renderToStaticMarkup(React.createElement(C, { weight: 'fill', size: 256 })); } catch { continue; }
  const inner = svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '').replace(/<rect width="256" height="256" fill="none"\/>/, '');
  if (!inner.includes('<path') && !inner.includes('<circle')) continue;
  out.push([name, inner]);
}
fs.writeFileSync(path.join(app, 'public/ph-icons.json'), JSON.stringify(out));
console.log(out.length, 'icons,', Math.round(fs.statSync(path.join(app, 'public/ph-icons.json')).size / 1024), 'KB');
