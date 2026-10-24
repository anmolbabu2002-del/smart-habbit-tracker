// ==================== MEDITATION SCENE: FOREST LAKE ====================
// The meditation card itself becomes a living landscape: a sky that follows the time of day,
// misty mountains, pine forest, a mirror lake with koi, birds, lily pads and fireflies.
// During a session the card fills the screen and the lake ripples with your breathing.
(function () {
  const TIMES = ["auto", "dawn", "day", "dusk", "night"];
  const TIME_LABELS = { auto: "✨ Auto", dawn: "🌅 Dawn", day: "☀️ Day", dusk: "🌇 Dusk", night: "🌙 Night" };
  const KOI_COLORS = ["#ff8a3d", "#ffb347", "#fff4e6", "#ff6b4a", "#ffd166"];
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let scene = null;
  let card = null;
  let horizon = 0.56; // horizon line as a fraction of the card height (sent to CSS as --hz)
  let lake = null;
  let sky = null;
  let builtFor = "";
  let running = false;
  let timers = [];
  let resizeTimer = null;

  // Small seeded random so the forest looks the same every visit
  function seeded(seed) {
    return function () {
      seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rand = (min, max) => min + Math.random() * (max - min);
  const r1 = (n) => Math.round(n * 10) / 10;

  // ── time of day ──────────────────────────────────────
  function autoTime() {
    const now = new Date();
    const h = now.getHours() + now.getMinutes() / 60;
    if (h >= 5 && h < 8) return "dawn";
    if (h >= 8 && h < 17) return "day";
    if (h >= 17 && h < 19.5) return "dusk";
    return "night";
  }

  function getTimePref() {
    const pref = appStorage.getItem("medSceneTime");
    return TIMES.includes(pref) ? pref : "auto";
  }

  function currentTime() {
    const pref = getTimePref();
    return pref === "auto" ? autoTime() : pref;
  }

  // ── landscape shapes ─────────────────────────────────
  function pinePath(x, base, h, w) {
    const tiers = 4;
    const top = base - h;
    const crown = h * 0.88;
    const tw = Math.max(0.8, w * 0.06);
    const side = [];
    for (let i = 1; i <= tiers; i++) {
      const y = top + crown * i / tiers;
      const half = w / 2 * (0.3 + 0.7 * i / tiers);
      side.push([half, y]);
      if (i < tiers) side.push([half * 0.42, y]);
    }
    const yEnd = side[side.length - 1][1];
    let d = `M${r1(x)},${r1(top)}`;
    side.forEach(([dx, y]) => { d += `L${r1(x + dx)},${r1(y)}`; });
    d += `L${r1(x + tw)},${r1(yEnd)}L${r1(x + tw)},${r1(base)}L${r1(x - tw)},${r1(base)}L${r1(x - tw)},${r1(yEnd)}`;
    for (let i = side.length - 1; i >= 0; i--) d += `L${r1(x - side[i][0])},${r1(side[i][1])}`;
    return d + "Z";
  }

  function roundTree(x, base, h) {
    const r = h * 0.32;
    return `<rect x="${r1(x - h * 0.03)}" y="${r1(base - h * 0.4)}" width="${r1(h * 0.06)}" height="${r1(h * 0.4)}"/>` +
      `<circle cx="${r1(x)}" cy="${r1(base - h + r)}" r="${r1(r)}"/>` +
      `<circle cx="${r1(x - r * 0.75)}" cy="${r1(base - h + r * 1.9)}" r="${r1(r * 0.85)}"/>` +
      `<circle cx="${r1(x + r * 0.75)}" cy="${r1(base - h + r * 1.8)}" r="${r1(r * 0.9)}"/>`;
  }

  function ridgePath(W, baseY, amp, peaks, rnd) {
    const n = 30;
    const phase = rnd() * 6;
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const y = baseY - amp * (0.55 + 0.3 * Math.sin(t * Math.PI * peaks + phase) +
        0.15 * Math.sin(t * Math.PI * peaks * 2.7 + phase * 2)) - rnd() * amp * 0.1;
      pts.push([t * W, y]);
    }
    let d = `M0,${r1(baseY + 2)}L0,${r1(pts[0][1])}`;
    for (let i = 1; i <= n; i++) {
      const mx = (pts[i - 1][0] + pts[i][0]) / 2;
      const my = (pts[i - 1][1] + pts[i][1]) / 2;
      d += `Q${r1(pts[i - 1][0])},${r1(pts[i - 1][1])} ${r1(mx)},${r1(my)}`;
    }
    return d + `L${W},${r1(pts[n][1])}L${W},${r1(baseY + 2)}Z`;
  }

  // Far bank: mountains + a continuous pine line on the horizon (also used for the reflection)
  function farLayer(W, S, hy) {
    const rnd = seeded(7);
    const far = ridgePath(W, hy, S * 0.2, 2.2, rnd);
    const near = ridgePath(W, hy, S * 0.11, 3.6, rnd);
    let trees = "";
    let x = -6;
    while (x < W + 6) {
      const edge = Math.abs(x / W - 0.5) * 2;
      const h = S * (0.03 + 0.05 * Math.pow(edge, 1.6)) * (0.75 + rnd() * 0.5);
      const w = h * 0.42;
      trees += pinePath(x, hy + 1, h, w);
      x += w * (0.45 + rnd() * 0.35);
    }
    return { far, near, trees };
  }

  function bankY(t, depth) { return depth * Math.pow(1 - t, 2); }

  // Side banks that curve toward the viewer, with taller trees
  function bankLayer(W, S, hy) {
    const rnd = seeded(21);
    const narrow = W < 640;
    let out = "";
    [{ side: "l", reach: narrow ? 0.34 : 0.26 }, { side: "r", reach: narrow ? 0.3 : 0.22 }].forEach(({ side, reach }) => {
      const span = W * reach;
      const depth = S * (narrow ? 0.12 : 0.15);
      const px = (t) => (side === "l" ? t * span : W - t * span);
      let d = `M${px(0)},${r1(hy + depth + 4)}`;
      for (let i = 0; i <= 20; i++) {
        const t = i / 20;
        d += `L${r1(px(t))},${r1(hy + bankY(t, depth))}`;
      }
      d += `L${r1(px(1))},${r1(hy - 1)}L${px(0)},${r1(hy - 1)}Z`;
      out += `<path class="ms-bank" d="${d}"/>`;
      let trees = "", rounds = "";
      for (let t = 0.02; t < 0.95; t += 0.05 + rnd() * 0.06) {
        const base = hy + bankY(t, depth) + 2;
        const h = S * (0.07 + 0.16 * Math.pow(1 - t, 1.4)) * (0.7 + rnd() * 0.5);
        if (rnd() < 0.22) rounds += roundTree(px(t), base, h * 0.6);
        else trees += pinePath(px(t), base, h, h * 0.4);
      }
      out += `<path class="ms-tree-mid" d="${trees}"/><g class="ms-tree-round">${rounds}</g>`;
    });
    return out;
  }

  // Big framing pines at the screen edges
  function frontLayer(W, H, S) {
    const narrow = W < 640;
    const spots = narrow
      ? [[-0.07, 0.62], [1.08, 0.7]]
      : [[-0.02, 0.78], [0.05, 0.6], [0.95, 0.66], [1.02, 0.84]];
    return spots.map(([fx, fh]) => {
      const h = S * fh;
      return pinePath(W * fx, H + 4, h, h * (narrow ? 0.34 : 0.3));
    }).join("");
  }

  function reeds(flip) {
    const rnd = seeded(flip ? 99 : 42);
    let blades = "";
    for (let i = 0; i < 14; i++) {
      const x = 8 + i * 9 + rnd() * 6;
      const h = 60 + rnd() * 110;
      const bend = (rnd() - 0.3) * 30;
      const delay = r1(rnd() * -4);
      const dur = r1(3.5 + rnd() * 2.5);
      blades += `<path class="ms-blade" style="animation-delay:${delay}s;animation-duration:${dur}s" d="M${r1(x)},200 Q${r1(x + bend * 0.3)},${r1(200 - h * 0.6)} ${r1(x + bend)},${r1(200 - h)} Q${r1(x + bend * 0.3 + 3)},${r1(200 - h * 0.6)} ${r1(x + 5)},200Z"/>`;
      if (i % 4 === 1) {
        blades += `<g class="ms-blade" style="animation-delay:${delay}s;animation-duration:${dur}s"><path class="ms-stem" d="M${r1(x + 2)},200 Q${r1(x + 2 + bend * 0.2)},${r1(200 - h * 0.7)} ${r1(x + 2 + bend * 0.5)},${r1(170 - h)}" /><rect class="ms-cattail" x="${r1(x - 0.5 + bend * 0.5)}" y="${r1(170 - h)}" width="5" height="18" rx="2.5"/></g>`;
      }
    }
    return `<svg class="ms-reeds ${flip ? "ms-reeds-r" : "ms-reeds-l"}" viewBox="0 0 140 200" preserveAspectRatio="xMidYMax meet">${blades}</svg>`;
  }

  function lilyPad(x, y, w, lotus) {
    const flower = lotus
      ? `<g class="ms-lotus"><ellipse cx="22" cy="5" rx="3" ry="7" transform="rotate(-35 22 9)"/><ellipse cx="38" cy="5" rx="3" ry="7" transform="rotate(35 38 9)"/><ellipse cx="26" cy="3" rx="3.2" ry="8" transform="rotate(-12 26 9)"/><ellipse cx="34" cy="3" rx="3.2" ry="8" transform="rotate(12 34 9)"/><ellipse cx="30" cy="2" rx="3.4" ry="8.5"/></g>`
      : "";
    return `<svg class="ms-pad" style="left:${x}%;top:${y}%;width:${w}px;animation-delay:${r1(-Math.random() * 6)}s" viewBox="0 -8 60 30"><path d="M30,12 L55.1,14.3 A26,9 0 1,1 55.1,9.7 Z"/>${flower}</svg>`;
  }

  // ── build ────────────────────────────────────────────
  const sceneW = () => scene.clientWidth || 360;
  const sceneH = () => scene.clientHeight || 640;

  function build() {
    const W = Math.max(280, Math.round(sceneW()));
    const H = Math.max(420, Math.round(sceneH()));
    // The horizon sits just under the floating countdown; in a session the orb rests on the lake
    const hero = card.querySelector(".med-countdown-wrap");
    const inSession = card.closest(".med-session-active");
    const heroBottom = hero && hero.offsetHeight ? hero.offsetTop + hero.offsetHeight + 6 : H * 0.56;
    const nextHorizon = inSession ? 0.5 : Math.min(0.6, Math.max(0.25, heroBottom / H));
    const key = W + "x" + H + "@" + nextHorizon.toFixed(3);
    if (builtFor === key) return;
    builtFor = key;
    horizon = nextHorizon;
    scene.style.setProperty("--hz", (horizon * 100).toFixed(2) + "%");
    scene.style.setProperty("--W", W + "px");
    const hy = H * horizon;
    const S = Math.min(H, W * 1.5, 900);
    const far = farLayer(W, S, hy);
    const view = `viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"`;

    // Stars: one element per layer with many box-shadows
    const starRnd = seeded(3);
    const stars = [[], []];
    for (let i = 0; i < 110; i++) {
      const size = starRnd() < 0.15 ? 2 : 1;
      stars[i % 2].push(`${Math.round(starRnd() * W)}px ${Math.round(starRnd() * hy * 0.95)}px 0 ${size === 2 ? 0.5 : 0}px rgba(255,255,255,${(0.4 + starRnd() * 0.6).toFixed(2)})`);
    }

    let waves = "";
    const rows = 11;
    for (let i = 0; i < rows; i++) {
      const t = (i + 1) / rows;
      const bw = Math.round(36 + t * t * 220);
      const dur = r1(18 - t * 9 + rand(-1, 1));
      waves += `<i class="${i % 2 ? "rev" : ""}" style="top:${r1(Math.pow(t, 1.5) * 96)}%;height:${r1(3 + t * 12)}px;--bw:${bw}px;background-size:${bw}px 100%;opacity:${(0.1 + t * 0.28).toFixed(2)};animation-duration:${dur}s;animation-delay:-${r1(rand(0, dur))}s"></i>`;
    }

    let glints = "";
    for (let i = 0; i < 22; i++) {
      const w = rand(8, 46) * (0.4 + i / 22);
      glints += `<i style="top:${r1(i / 22 * 92 + rand(0, 3))}%;width:${r1(w)}px;margin-left:${r1(-w / 2 + rand(-10, 10) * (i / 22))}px;animation-delay:${r1(rand(-3, 0))}s;animation-duration:${r1(rand(1.8, 3.6))}s"></i>`;
    }

    scene.innerHTML = `
      <div class="ms-sky"></div>
      <div class="ms-stars"><i style="box-shadow:${stars[0].join(",")}"></i><i style="box-shadow:${stars[1].join(",")}"></i></div>
      <div class="ms-sun"><i class="ms-sun-glow"></i><i class="ms-sun-disc"></i></div>
      <div class="ms-rays"><i></i><i></i><i></i><i></i></div>
      <div class="ms-clouds">${[0, 1, 2, 3].map(i => `<i class="ms-cloud" style="top:${6 + i * 8}%;animation-duration:${180 + i * 45}s;animation-delay:-${r1(rand(0, 160))}s;--s:${(1.3 - i * 0.18).toFixed(2)}"></i>`).join("")}</div>
      <div class="ms-birds"></div>
      <svg class="ms-far" ${view}>
        <defs>
          <linearGradient id="msHaze" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="ms-haze0"/><stop offset="1" class="ms-haze1"/></linearGradient>
        </defs>
        <path class="ms-mtn-far" d="${far.far}"/>
        <rect x="0" y="${r1(hy - S * 0.12)}" width="${W}" height="${r1(S * 0.12)}" fill="url(#msHaze)"/>
        <path class="ms-mtn-near" d="${far.near}"/>
        <path class="ms-treeline" d="${far.trees}"/>
      </svg>
      <div class="ms-water"></div>
      <div class="ms-fishes"></div>
      <svg class="ms-refl" ${view}>
        <defs>
          <linearGradient id="msReflFade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.9"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
          <mask id="msReflMask"><rect x="0" y="${r1(hy)}" width="${W}" height="${r1(S * 0.3)}" fill="url(#msReflFade)"/></mask>
        </defs>
        <g mask="url(#msReflMask)"><g transform="translate(0 ${r1(hy * 2)}) scale(1 -1)">
          <path class="ms-mtn-far" d="${far.far}"/><path class="ms-mtn-near" d="${far.near}"/><path class="ms-treeline" d="${far.trees}"/>
        </g></g>
      </svg>
      <div class="ms-waves">${waves}</div>
      <div class="ms-sheen"><i></i></div>
      <div class="ms-glints">${glints}</div>
      <div class="ms-mist"><i></i><i></i></div>
      <div class="ms-lake">
        ${lilyPad(14, 70, 70, true)}${lilyPad(24, 80, 46, false)}${lilyPad(6, 86, 56, false)}${lilyPad(74, 76, 52, false)}${lilyPad(82, 88, 64, true)}
      </div>
      <svg class="ms-banks" ${view}>${bankLayer(W, S, hy)}</svg>
      <svg class="ms-front" ${view}><path class="ms-tree-front" d="${frontLayer(W, H, S)}"/></svg>
      ${reeds(false)}${reeds(true)}
      <div class="ms-flies"></div>
      <div class="ms-vignette"></div>`;

    lake = scene.querySelector(".ms-lake");
    sky = scene.querySelector(".ms-birds");
    populateFlies();
  }

  function populateFlies() {
    const box = scene.querySelector(".ms-flies");
    if (!box) return;
    const tod = scene.dataset.tod;
    const count = tod === "night" ? 26 : tod === "dusk" ? 16 : 10;
    let html = "";
    for (let i = 0; i < count; i++) {
      html += `<i style="left:${r1(rand(2, 98))}%;top:${r1(rand(38, 94))}%;--dx:${r1(rand(-40, 40))}px;--dy:${r1(rand(-30, 30))}px;animation-duration:${r1(rand(7, 14))}s,${r1(rand(2, 4.5))}s;animation-delay:-${r1(rand(0, 10))}s,-${r1(rand(0, 4))}s"></i>`;
    }
    box.innerHTML = html;
  }

  // ── living things ────────────────────────────────────
  function ripple(x, y, size, duration, rings) {
    if (!lake) return;
    for (let i = 0; i < (rings || 2); i++) {
      const el = document.createElement("i");
      el.className = "ms-ripple";
      el.style.left = x + "px";
      el.style.top = y + "px";
      el.style.width = size + "px";
      el.style.height = size * 0.26 + "px";
      lake.appendChild(el);
      const anim = el.animate(
        [{ transform: "translate(-50%,-50%) scale(0.08)", opacity: 0.9 }, { transform: "translate(-50%,-50%) scale(1)", opacity: 0 }],
        { duration: duration, delay: i * duration * 0.28, easing: "cubic-bezier(0.2,0.6,0.35,1)", fill: "both" }
      );
      anim.onfinish = () => el.remove();
    }
  }

  function fishSVG(color) {
    return `<svg viewBox="0 0 60 24"><path class="ms-fish-tail" fill="${color}" d="M44,12 L58,3 L54,12 L58,21Z"/><path fill="${color}" d="M4,12 C14,2 34,2 46,12 C34,22 14,22 4,12Z"/><path fill="${color}" opacity="0.7" d="M22,6 L30,1 L32,7Z"/><circle cx="11" cy="10.5" r="1.3" fill="#1b1b1b"/></svg>`;
  }

  function spawnFish() {
    if (!running) return;
    const box = scene.querySelector(".ms-fishes");
    if (!box || box.childElementCount >= 5) return;
    const W = sceneW();
    const lakeH = sceneH() * (1 - horizon);
    const depth = rand(0.18, 0.92);
    const size = 26 + depth * 46;
    const ltr = Math.random() < 0.5;
    const y = depth * lakeH;
    const el = document.createElement("div");
    el.className = "ms-fish" + (ltr ? " ltr" : "");
    el.style.width = size + "px";
    el.style.top = y + "px";
    el.style.opacity = (0.35 + depth * 0.4).toFixed(2);
    el.innerHTML = fishSVG(KOI_COLORS[Math.floor(Math.random() * KOI_COLORS.length)]);
    box.appendChild(el);
    const from = ltr ? -size - 20 : W + 20;
    const to = ltr ? W + 20 : -size - 20;
    const wobble = rand(10, 26);
    const frames = [0, 0.25, 0.5, 0.75, 1].map((t, i) => ({
      transform: `translate(${r1(from + (to - from) * t)}px, ${r1((i % 2 ? 1 : -1) * wobble * (i === 0 || i === 4 ? 0 : 1))}px)`
    }));
    const anim = el.animate(frames, { duration: rand(22000, 36000), easing: "ease-in-out" });
    anim.onfinish = () => el.remove();
  }

  function spawnJump() {
    if (!running || !lake) return;
    const W = sceneW();
    const lakeH = sceneH() * (1 - horizon);
    const x = rand(0.25, 0.75) * W;
    const y = rand(0.12, 0.45) * lakeH;
    const ltr = Math.random() < 0.5;
    const dir = ltr ? 1 : -1;
    const size = 22 + (y / lakeH) * 30;
    const el = document.createElement("div");
    el.className = "ms-jumper";
    el.style.left = x + "px";
    el.style.top = y + "px";
    el.style.width = size + "px";
    el.innerHTML = fishSVG(KOI_COLORS[Math.floor(Math.random() * 2)]);
    lake.appendChild(el);
    const span = size * 1.6;
    // The fish faces left, so flip it for a left-to-right jump
    const flip = ltr ? " scaleX(-1)" : "";
    ripple(x, y, size * 2.2, 1600, 2);
    const anim = el.animate([
      { transform: `translate(-50%,-50%) rotate(${-55 * dir}deg)${flip}`, opacity: 0 },
      { transform: `translate(calc(-50% + ${r1(dir * span * 0.15)}px), calc(-50% - ${r1(size * 0.9)}px)) rotate(${-30 * dir}deg)${flip}`, opacity: 1, offset: 0.2 },
      { transform: `translate(calc(-50% + ${r1(dir * span * 0.5)}px), calc(-50% - ${r1(size * 1.6)}px)) rotate(0deg)${flip}`, opacity: 1 },
      { transform: `translate(calc(-50% + ${r1(dir * span * 0.85)}px), calc(-50% - ${r1(size * 0.9)}px)) rotate(${35 * dir}deg)${flip}`, opacity: 1, offset: 0.8 },
      { transform: `translate(calc(-50% + ${r1(dir * span)}px), -50%) rotate(${60 * dir}deg)${flip}`, opacity: 0 }
    ], { duration: 1100, easing: "cubic-bezier(0.3,0.1,0.5,1)" });
    anim.onfinish = () => {
      el.remove();
      ripple(x + dir * span, y, size * 3, 2400, 3);
    };
  }

  function spawnDrop() {
    if (!running) return;
    const W = sceneW();
    const lakeH = sceneH() * (1 - horizon);
    const depth = rand(0.05, 0.9);
    ripple(rand(0.1, 0.9) * W, depth * lakeH, 18 + depth * 60, 2200, 2);
  }

  function birdSVG() {
    const dur = r1(rand(0.38, 0.6));
    const delay = r1(rand(-0.6, 0));
    return `<svg class="ms-bird" viewBox="0 0 24 12" style="--flap:${dur}s;--delay:${delay}s"><path class="ms-wing ms-wing-l" d="M12,7 Q7,1 1,4"/><path class="ms-wing ms-wing-r" d="M12,7 Q17,1 23,4"/><circle cx="12" cy="7" r="1.2"/></svg>`;
  }

  function spawnFlock() {
    if (!running || !sky || scene.dataset.tod === "night") return;
    const W = sceneW();
    const H = sceneH();
    const count = Math.floor(rand(3, 7));
    const scale = rand(0.7, 1.3);
    const ltr = Math.random() < 0.6;
    const flock = document.createElement("div");
    flock.className = "ms-flock";
    flock.style.top = r1(rand(0.08, 0.32) * H) + "px";
    let html = "";
    const lead = Math.floor(count / 2);
    for (let i = 0; i < count; i++) {
      const off = Math.abs(i - lead);
      html += `<span style="left:${r1(off * 22 * scale)}px;top:${r1((i - lead) * 13 * scale + rand(-3, 3))}px;width:${r1(22 * scale)}px">${birdSVG()}</span>`;
    }
    flock.innerHTML = html;
    sky.appendChild(flock);
    const from = ltr ? -140 : W + 140;
    const to = ltr ? W + 140 : -140;
    const lift = rand(-60, 30);
    // Birds lead with the point of the V
    const flip = ltr ? " scaleX(-1)" : "";
    const anim = flock.animate([
      { transform: `translate(${from}px, 0)${flip}` },
      { transform: `translate(${r1((from + to) / 2)}px, ${r1(lift)}px)${flip}` },
      { transform: `translate(${to}px, ${r1(lift * 0.4)}px)${flip}` }
    ], { duration: rand(26000, 40000) / scale, easing: "linear" });
    anim.onfinish = () => flock.remove();
  }

  function spawnLeaf() {
    if (!running || scene.dataset.tod === "night") return;
    const W = sceneW();
    const H = sceneH();
    const startX = Math.random() < 0.5 ? rand(0, 0.25) * W : rand(0.75, 1) * W;
    const landY = rand(horizon + 0.06, 0.9) * H;
    const drift = rand(-120, 120);
    const leaf = document.createElement("i");
    leaf.className = "ms-leaf";
    scene.appendChild(leaf);
    const anim = leaf.animate([
      { transform: `translate(${r1(startX)}px, -30px) rotate(0deg)`, opacity: 0 },
      { transform: `translate(${r1(startX + drift * 0.3 + 30)}px, ${r1(landY * 0.3)}px) rotate(120deg)`, opacity: 1, offset: 0.25 },
      { transform: `translate(${r1(startX + drift * 0.6 - 30)}px, ${r1(landY * 0.65)}px) rotate(260deg)`, opacity: 1, offset: 0.6 },
      { transform: `translate(${r1(startX + drift)}px, ${r1(landY)}px) rotate(380deg)`, opacity: 1, offset: 0.92 },
      { transform: `translate(${r1(startX + drift)}px, ${r1(landY)}px) rotate(380deg)`, opacity: 0 }
    ], { duration: rand(9000, 14000), easing: "ease-in-out" });
    anim.onfinish = () => {
      leaf.remove();
      ripple(startX + drift, landY - H * horizon, 50, 2200, 2);
    };
  }

  // ── lifecycle ────────────────────────────────────────
  function every(fn, min, max) {
    let id = 0;
    const tick = () => { fn(); id = setTimeout(tick, rand(min, max)); timers.push(id); };
    id = setTimeout(tick, rand(min * 0.3, min));
    timers.push(id);
  }

  function start() {
    if (running) return;
    running = true;
    applyTime();
    build();
    if (reduceMotion) return;
    for (let i = 0; i < 3; i++) setTimeout(spawnFish, i * 1500);
    setTimeout(spawnFlock, 1800);
    every(spawnFish, 5000, 9000);
    every(spawnFlock, 14000, 26000);
    every(spawnJump, 14000, 30000);
    every(spawnDrop, 2500, 6000);
    every(spawnLeaf, 9000, 16000);
    every(applyTime, 300000, 300000);
  }

  function stop() {
    running = false;
    timers.forEach(clearTimeout);
    timers = [];
    scene?.querySelectorAll(".ms-flock, .ms-fish, .ms-jumper, .ms-ripple, .ms-leaf").forEach(el => el.remove());
  }

  function applyTime() {
    const tod = currentTime();
    if (scene.dataset.tod !== tod) {
      scene.dataset.tod = tod;
      if (builtFor) populateFlies();
    }
    document.querySelectorAll("[data-ms-time]").forEach(b => b.classList.toggle("active", b.dataset.msTime === getTimePref()));
    const toggle = document.querySelector(".ms-time-btn");
    if (toggle) toggle.textContent = TIME_LABELS[tod].split(" ")[0];
  }

  // One tiny corner button; tapping it opens the time-of-day list, picking one closes it
  function addTimePicker() {
    if (!card || card.querySelector(".ms-time")) return;
    const wrap = document.createElement("div");
    wrap.className = "ms-time";
    wrap.innerHTML = `<button type="button" class="ms-time-btn" aria-label="Scene time of day" aria-expanded="false"></button>` +
      `<div class="ms-time-menu" role="menu" hidden>${TIMES.map(t => `<button type="button" role="menuitem" data-ms-time="${t}">${TIME_LABELS[t]}</button>`).join("")}</div>`;
    card.appendChild(wrap);
    const btn = wrap.querySelector(".ms-time-btn");
    const menu = wrap.querySelector(".ms-time-menu");
    const setOpen = (open) => { menu.hidden = !open; btn.setAttribute("aria-expanded", String(open)); };
    btn.addEventListener("click", (e) => { e.stopPropagation(); setOpen(menu.hidden); });
    menu.addEventListener("click", (e) => {
      const opt = e.target.closest("[data-ms-time]");
      if (!opt) return;
      appStorage.setItem("medSceneTime", opt.dataset.msTime);
      applyTime();
      setOpen(false);
    });
    document.addEventListener("click", (e) => { if (!wrap.contains(e.target)) setOpen(false); });
  }

  // Fewer rows on screen: −/+ join the duration chips, and the breathing Enable/Disable pair
  // becomes a single pill
  function compactControls() {
    const picks = card.querySelector(".med-quick-picks");
    const minus = document.getElementById("med-dur-minus");
    const plus = document.getElementById("med-dur-plus");
    if (picks && minus && plus) {
      picks.insertBefore(minus, picks.firstChild);
      picks.appendChild(plus);
    }
    const enable = document.getElementById("breath-enable-btn");
    const disable = document.getElementById("breath-disable-btn");
    const row = card.querySelector(".breathing-toggle-row");
    if (!enable || !disable || !row) return;
    const pill = document.createElement("button");
    pill.type = "button";
    pill.className = "ms-breath-pill";
    pill.textContent = "🌬 Breathing guide";
    row.insertAdjacentElement("afterend", pill);
    const sync = () => {
      const on = enable.classList.contains("active");
      pill.classList.toggle("active", on);
      pill.setAttribute("aria-pressed", String(on));
    };
    pill.addEventListener("click", () => (enable.classList.contains("active") ? disable : enable).click());
    new MutationObserver(sync).observe(enable, { attributes: true, attributeFilter: ["class"] });
    sync();
  }

  // Lake breathes with you: the sun glow swells on inhale and a ripple spreads on each phase
  function watchBreathing() {
    const circle = document.getElementById("breathing-circle");
    if (!circle) return;
    let last = "";
    new MutationObserver(() => {
      const phase = ["in", "hold", "out"].find(c => circle.classList.contains(c)) || "";
      if (phase === last) return;
      last = phase;
      const secs = parseFloat((circle.style.transition.match(/transform ([\d.]+)s/) || [])[1]) || 4;
      scene.style.setProperty("--breath-dur", secs + "s");
      scene.classList.toggle("breath-in", phase === "in" || phase === "hold");
      if (running && phase && phase !== "hold" && !reduceMotion) {
        const lakeH = sceneH() * (1 - horizon);
        ripple(sceneW() / 2, lakeH * 0.32, Math.min(sceneW() * 0.9, 520), secs * 1000, 3);
      }
    }).observe(circle, { attributes: true, attributeFilter: ["class"] });
  }

  // Tap anywhere on the water (not on a button) to send ripples across the lake
  function enableTapRipples() {
    card.addEventListener("pointerdown", (e) => {
      if (!running || e.target.closest("button, a, input, select, textarea, .med-mood-overlay, .ms-time")) return;
      const box = scene.getBoundingClientRect();
      const x = e.clientX - box.left;
      const y = e.clientY - box.top - box.height * horizon;
      if (y < 0) return;
      const depth = Math.min(1, y / (box.height * (1 - horizon)));
      ripple(x, y, 60 + depth * 160, 2600, 3);
      if (navigator.vibrate) navigator.vibrate(8);
    });
  }

  function init() {
    const page = document.getElementById("meditation-page");
    if (!page) return;
    card = page.querySelector(".meditation-card");
    if (!card) return;
    scene = document.createElement("div");
    scene.className = "med-scene";
    scene.setAttribute("aria-hidden", "true");
    card.insertBefore(scene, card.firstChild);
    addTimePicker();
    compactControls();
    enableTapRipples();
    applyTime();
    watchBreathing();

    const sync = () => {
      const open = page.classList.contains("active") && !document.hidden;
      document.body.classList.toggle("med-scene-on", page.classList.contains("active"));
      scene.classList.toggle("in-session", page.classList.contains("med-session-active"));
      if (open) { start(); build(); } else stop();
    };
    new MutationObserver(sync).observe(page, { attributes: true, attributeFilter: ["class"] });
    document.addEventListener("visibilitychange", sync);
    new ResizeObserver(() => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => { if (running) build(); }, 200);
    }).observe(card);
    sync();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
