// Writes the Android launcher icons (.github/android/res) and the web icons (app/public).
// Needs Playwright (renders the SVGs in Chromium).
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const { notoFull } = require('./icon.cjs');
const { banner, button, COLORS } = require('./widget-art.cjs');
const ROOT = path.resolve(__dirname, '../..');
const RES = path.join(ROOT, '.github/android/res'), PUB = path.join(ROOT, 'app/public');
const D = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  async function shot(svg, px, file, crop = null) {
    let s = svg.replace('<svg ', `<svg width="${px}" height="${px}" `);
    if (crop) s = s.replace('viewBox="0 0 108 108"', 'viewBox="18 18 72 72"');
    const mask = crop === 'round' ? 'border-radius:50%' : crop === 'square' ? 'border-radius:22%' : '';
    await p.setViewportSize({ width: px, height: px });
    await p.setContent(`<html><body style="margin:0;background:transparent"><div style="width:${px}px;height:${px}px;overflow:hidden;${mask}">${s}</div></body></html>`);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    await p.screenshot({ path: file, omitBackground: true });
  }
  for (const st of ['normal', 'done', 'risk']) {
    const name = st === 'normal' ? 'ic_launcher' : `ic_launcher_${st}`;
    for (const [d, m] of Object.entries(D)) {
      const dir = `${RES}/mipmap-${d}`;
      await shot(notoFull(st, 'bg'), Math.round(108 * m), `${dir}/noto_bg_${st}.png`);
      await shot(notoFull(st, 'fg'), Math.round(108 * m), `${dir}/noto_fg_${st}.png`);
      await shot(notoFull(st), Math.round(48 * m), `${dir}/${name}.png`, 'square');
      await shot(notoFull(st), Math.round(48 * m), `${dir}/${name}_round.png`, 'round');
    }
    const xml = `<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n    <background android:drawable="@mipmap/noto_bg_${st}" />\n    <foreground android:drawable="@mipmap/noto_fg_${st}" />\n</adaptive-icon>\n`;
    fs.mkdirSync(`${RES}/mipmap-anydpi-v26`, { recursive: true });
    fs.writeFileSync(`${RES}/mipmap-anydpi-v26/${name}.xml`, xml);
    fs.writeFileSync(`${RES}/mipmap-anydpi-v26/${name}_round.xml`, xml);
  }
  // launch screen: Noto centred on dark (replaces Capacitor's splash.png files)
  await shot(notoFull('normal'), 384, `${RES}/drawable-nodpi/splash_noto.png`, 'square');
  fs.mkdirSync(`${RES}/drawable`, { recursive: true });
  fs.writeFileSync(`${RES}/drawable/splash.xml`, `<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
    <item android:drawable="@color/splash_bg" />
    <item android:width="112dp" android:height="112dp" android:gravity="center" android:drawable="@drawable/splash_noto" />
</layer-list>
`);
  fs.mkdirSync(`${RES}/values`, { recursive: true });
  fs.writeFileSync(`${RES}/values/splash_colors.xml`, `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="splash_bg">#121212</color>
</resources>
`);
  // home-screen widget (3x density): banner art, Noto sticker and the round buttons
  async function raw(svg, w, h, file, extra = '') {
    await p.setViewportSize({ width: w, height: h });
    await p.setContent(`<html><body style="margin:0;background:transparent">${extra}${svg.replace('<svg ', `<svg width="${w}" height="${h}" `)}</body></html>`);
    await p.screenshot({ path: file, omitBackground: true });
  }
  const NP = `${RES}/drawable-nodpi`;
  for (const st of ['normal', 'done', 'risk']) {
    await raw(banner(st, 330, 88), 990, 264, `${NP}/widget_banner_${st}.png`);
    // Noto as a tilted sticker: white border, solid drop shadow (64 units, 3x)
    const tile = notoFull(st).replace('<svg ', '<svg width="150" height="150" ').replace('viewBox="0 0 108 108"', 'viewBox="18 18 72 72"');
    await p.setViewportSize({ width: 192, height: 192 });
    await p.setContent(`<html><body style="margin:0;background:transparent"><div style="width:192px;height:192px;display:grid;place-items:center">
      <div style="width:150px;height:150px;border-radius:36px;overflow:hidden;border:8px solid #fff;box-sizing:content-box;box-shadow:0 10px 0 rgba(0,0,0,.18);transform:scale(.86) rotate(${st === 'risk' ? -6 : 6}deg)">${tile}</div></div></body></html>`);
    await p.screenshot({ path: `${NP}/widget_sticker_${st}.png`, omitBackground: true });
  }
  for (const c of Object.keys(COLORS)) {
    await raw(button('tick', c), 90, 96, `${NP}/widget_btn_${c}.png`);
    await raw(button('cam', c), 90, 96, `${NP}/widget_cam_${c}.png`);
  }
  await raw(button('done'), 90, 96, `${NP}/widget_btn_done.png`);
  // web / installed-website icon: full tile, content well inside the maskable safe zone
  await shot(notoFull('normal'), 512, `${PUB}/icon-512-v3.png`);
  await shot(notoFull('normal'), 192, `${PUB}/icon-192-v3.png`);
  await b.close();
})();
