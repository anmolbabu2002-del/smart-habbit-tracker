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

  const LOTUS_PETALS = `<ellipse cx="22" cy="5" rx="3" ry="7" transform="rotate(-35 22 9)"/><ellipse cx="38" cy="5" rx="3" ry="7" transform="rotate(35 38 9)"/><ellipse cx="26" cy="3" rx="3.2" ry="8" transform="rotate(-12 26 9)"/><ellipse cx="34" cy="3" rx="3.2" ry="8" transform="rotate(12 34 9)"/><ellipse cx="30" cy="2" rx="3.4" ry="8.5"/>`;

  // flower: "pink" | "white" | "bud" | "" (just a pad)
  function lilyPad(x, y, flower) {
    const w = r1(18 + y * 0.62); // farther pads (higher up the lake) are smaller
    let top = "";
    if (flower === "pink" || flower === "white") {
      top = `<g class="ms-lotus${flower === "white" ? " white" : ""}">${LOTUS_PETALS}</g><circle class="ms-lotus-heart" cx="30" cy="7" r="1.8"/>`;
    } else if (flower === "bud") {
      top = `<path class="ms-bud-stem" d="M36,12 Q38,3 37,-3"/><ellipse class="ms-lotus" cx="37" cy="-6" rx="2.6" ry="5.2"/>`;
    }
    return `<svg class="ms-pad" style="left:${x}%;top:${y}%;width:${w}px;animation-delay:${r1(-Math.random() * 6)}s" viewBox="0 -14 60 36"><path d="M30,12 L55.1,14.3 A26,9 0 1,1 55.1,9.7 Z"/>${top}</svg>`;
  }

  // Pads hug the shores and the near water; the middle stays open for the controls and glitter
  const PADS = [
    [4, 16, "bud"], [10, 21, ""], [16, 15, ""], [78, 22, ""], [84, 17, "white"], [91, 24, ""],
    [2, 42, "pink"], [9, 49, ""], [18, 45, "bud"], [80, 52, ""], [88, 45, "pink"], [93, 57, "white"],
    [2, 65, "white"], [14, 70, "pink"], [24, 80, ""], [6, 86, ""], [90, 72, ""], [74, 76, "bud"],
    [82, 88, "pink"], [30, 91, "white"], [62, 93, "bud"]
  ];

  // Small clumps of reeds standing in the water near the banks (x, waterline y, height px)
  function reedClump(x, y, h, seed) {
    const rnd = seeded(seed);
    let blades = "";
    for (let i = 0; i < 7; i++) {
      const bx = 6 + i * 4 + rnd() * 3;
      const bh = 30 + rnd() * 28;
      const bend = (rnd() - 0.5) * 14;
      const delay = r1(rnd() * -4);
      blades += `<path class="ms-blade" style="animation-delay:${delay}s" d="M${r1(bx)},60 Q${r1(bx + bend * 0.3)},${r1(60 - bh * 0.6)} ${r1(bx + bend)},${r1(60 - bh)} Q${r1(bx + bend * 0.3 + 2)},${r1(60 - bh * 0.6)} ${r1(bx + 3)},60Z"/>`;
      if (i === 2 || i === 5) blades += `<g class="ms-blade" style="animation-delay:${delay}s"><path class="ms-stem" d="M${r1(bx + 1.5)},60 L${r1(bx + 1.5 + bend * 0.4)},${r1(52 - bh)}"/><rect class="ms-cattail" x="${r1(bx + bend * 0.4)}" y="${r1(52 - bh)}" width="3.2" height="11" rx="1.6"/></g>`;
    }
    return `<svg class="ms-clump" style="left:${x}%;top:${y}%;height:${h}px" viewBox="0 0 40 60">${blades}</svg>`;
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
    const banks = bankLayer(W, S, hy);
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
      <i class="ms-gl-slot"></i>
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
        ${PADS.map(([x, y, f]) => lilyPad(x, y, f)).join("")}
      </div>
      <svg class="ms-banks" ${view}>${banks}</svg>
      <div class="ms-plants">${reedClump(1, 13, 54, 5)}${reedClump(13, 33, 46, 8)}${reedClump(91, 15, 50, 13)}${reedClump(85, 38, 42, 17)}</div>
      <svg class="ms-front" ${view}><path class="ms-tree-front" d="${frontLayer(W, H, S)}"/></svg>
      ${reeds(false)}${reeds(true)}
      <div class="ms-flies"></div>
      <div class="ms-vignette"></div>`;

    lake = scene.querySelector(".ms-lake");
    sky = scene.querySelector(".ms-birds");
    populateFlies();
    geo = { W, H, hy, S, far, banks };
    setupWater();
    kickWater();
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
    if (gl && geo && scene.classList.contains("gl-water")) {
      waterRipple(x, y, Math.min(1.4, 0.35 + size / 260));
      return;
    }
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

  // ── real water (WebGL) ───────────────────────────────
  // The lake is drawn by a shader: rolling waves, a mirror reflection of the sky and forest that
  // bends with the waves, sun/moon glitter, and true ripple rings. Falls back to the CSS lake.
  const WATER_VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = vec2(aPos.x * 0.5 + 0.5, 0.5 - aPos.y * 0.5);
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

  const WATER_FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 vUv;
uniform sampler2D uTex;
uniform float uTime;
uniform float uAspect;
uniform float uDepth;
uniform float uSunX;
uniform vec3 uNear;
uniform vec3 uFar;
uniform vec3 uSun;
uniform vec4 uRip[8];

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}

// Screen point on the lake -> flat water-plane coordinates (perspective)
vec2 world(vec2 uv) {
  float s = 0.06 + uv.y;
  return vec2((uv.x - 0.5) * uAspect / s, 1.0 / s) * 6.0;
}

// Wave height: three layers drifting toward the viewer at different speeds
float height(vec2 w) {
  float t = uTime;
  float h = noise(w * vec2(0.9, 1.8) + vec2(t * 0.18, t * 0.45)) * 0.55;
  h += noise(w * vec2(2.1, 3.9) + vec2(-t * 0.32, t * 0.7)) * 0.3;
  h += noise(w * vec2(4.6, 8.2) + vec2(t * 0.55, t * 1.1)) * 0.15;
  return h;
}

void main() {
  vec2 uv = vUv;
  vec2 w = world(uv);
  float e = 0.08;
  float h0 = height(w);
  vec2 n = vec2(height(w + vec2(e, 0.0)) - h0, height(w + vec2(0.0, e)) - h0) / e;
  float calm = smoothstep(0.0, 0.35, uv.y); // mirror-still near the horizon
  n *= 0.35 * (0.25 + 0.75 * calm);

  // Ripple rings (tap, fish, leaves, breathing)
  float ringLight = 0.0;
  for (int i = 0; i < 8; i++) {
    vec4 r = uRip[i];
    float age = uTime - r.z;
    if (r.w <= 0.0 || age < 0.0 || age > 7.0) continue;
    vec2 dv = w - world(r.xy);
    float d = length(dv);
    float R = age * 1.5;
    float band = exp(-pow((d - R) * 1.3, 2.0));
    float wave = cos((d - R) * 11.0) * band * r.w * exp(-age * 0.6);
    n += dv / max(d, 0.001) * wave * 2.2;
    ringLight += max(wave, 0.0);
  }

  // Reflection of the sky and forest, bent by the waves
  float k = 0.012 + 0.05 * uv.y;
  vec2 tuv = vec2(uv.x + n.x * k, 1.0 - uv.y * uDepth + n.y * k * 1.4);
  vec3 refl = texture2D(uTex, clamp(tuv, vec2(0.002), vec2(0.998))).rgb;

  vec3 body = mix(uFar, uNear, smoothstep(0.0, 0.9, uv.y));
  float fres = mix(0.9, 0.42, pow(uv.y, 0.8));
  vec3 col = mix(body, refl, fres);
  col *= 1.0 + n.y * 0.22 * (0.3 + 0.7 * uv.y);

  // Glitter in the column under the sun or moon
  float column = exp(-pow((uv.x - uSunX) * (9.0 - 4.0 * uv.y), 2.0));
  float sp = noise(w * vec2(3.0, 6.0) + vec2(uTime * 1.1, uTime * 0.6)) *
             noise(w * vec2(5.0, 2.5) - vec2(uTime * 0.7, -uTime * 0.9));
  col += uSun * smoothstep(0.5, 0.72, sp + length(n) * 0.2) * column * 0.6;
  col += vec3(ringLight * 0.28);

  gl_FragColor = vec4(col, 1.0);
}`;

  let gl = null;
  let glCanvas = null;
  let glTex = null;
  let glRaf = 0;
  let glStart = performance.now();
  let glScale = 1;
  let reflStamp = 0;
  let geo = null;
  const glU = {};
  const ripData = new Float32Array(32);
  let ripIdx = 0;

  function cssVar(name) { return getComputedStyle(scene).getPropertyValue(name).trim(); }

  function hexRGB(hex) {
    const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex);
    return m ? [1, 2, 3].map(i => parseInt(m[i], 16) / 255) : [0.4, 0.6, 0.75];
  }

  function initGL(canvas) {
    const ctx = canvas.getContext("webgl", { alpha: false, antialias: false, powerPreference: "low-power" });
    if (!ctx) return null;
    const compile = (type, src) => {
      const sh = ctx.createShader(type);
      ctx.shaderSource(sh, src);
      ctx.compileShader(sh);
      if (!ctx.getShaderParameter(sh, ctx.COMPILE_STATUS)) { console.warn("[water]", ctx.getShaderInfoLog(sh)); return null; }
      return sh;
    };
    const vs = compile(ctx.VERTEX_SHADER, WATER_VERT);
    const fs = compile(ctx.FRAGMENT_SHADER, WATER_FRAG);
    if (!vs || !fs) return null;
    const prog = ctx.createProgram();
    ctx.attachShader(prog, vs);
    ctx.attachShader(prog, fs);
    ctx.linkProgram(prog);
    if (!ctx.getProgramParameter(prog, ctx.LINK_STATUS)) { console.warn("[water]", ctx.getProgramInfoLog(prog)); return null; }
    ctx.useProgram(prog);

    ctx.bindBuffer(ctx.ARRAY_BUFFER, ctx.createBuffer());
    ctx.bufferData(ctx.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), ctx.STATIC_DRAW);
    const aPos = ctx.getAttribLocation(prog, "aPos");
    ctx.enableVertexAttribArray(aPos);
    ctx.vertexAttribPointer(aPos, 2, ctx.FLOAT, false, 0, 0);
    ["uTex", "uTime", "uAspect", "uDepth", "uSunX", "uNear", "uFar", "uSun", "uRip"].forEach(u => { glU[u] = ctx.getUniformLocation(prog, u); });

    glTex = ctx.createTexture();
    ctx.bindTexture(ctx.TEXTURE_2D, glTex);
    ctx.texImage2D(ctx.TEXTURE_2D, 0, ctx.RGB, 1, 1, 0, ctx.RGB, ctx.UNSIGNED_BYTE, new Uint8Array([120, 170, 200]));
    ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_WRAP_S, ctx.CLAMP_TO_EDGE);
    ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_WRAP_T, ctx.CLAMP_TO_EDGE);
    ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_MIN_FILTER, ctx.LINEAR);
    ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_MAG_FILTER, ctx.LINEAR);
    ctx.uniform1i(glU.uTex, 0);
    canvas.addEventListener("webglcontextlost", (e) => { e.preventDefault(); gl = null; scene.classList.remove("gl-water"); });
    return ctx;
  }

  function setupWater() {
    if (!glCanvas) {
      glCanvas = document.createElement("canvas");
      glCanvas.className = "ms-gl";
      try { gl = initGL(glCanvas); } catch (err) { gl = null; }
    }
    const slot = scene.querySelector(".ms-gl-slot");
    if (!gl || !slot) { scene.classList.remove("gl-water"); return; }
    slot.replaceWith(glCanvas);
    scene.classList.add("gl-water");
    glScale = Math.min(window.devicePixelRatio || 1, 1.5);
    glCanvas.width = Math.round(geo.W * glScale);
    glCanvas.height = Math.max(1, Math.round((geo.H - geo.hy) * glScale));
    gl.viewport(0, 0, glCanvas.width, glCanvas.height);
    updateReflection();
  }

  // Paint the sky, sun and forest above the horizon into a texture for the shader to mirror
  function updateReflection() {
    if (!gl || !geo) return;
    const { W, H, hy, S } = geo;
    const fill = {
      "ms-mtn-far": cssVar("--mtn-far"), "ms-mtn-near": cssVar("--mtn-near"), "ms-treeline": cssVar("--tree-back"),
      "ms-tree-mid": cssVar("--tree-mid"), "ms-tree-round": cssVar("--tree-mid"), "ms-bank": cssVar("--bank")
    };
    const paint = (markup) => markup.replace(/class="(ms-[a-z-]+)"/g, (m, c) => (fill[c] ? `fill="${fill[c]}"` : m));
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
      `<path fill="${fill["ms-mtn-far"]}" d="${geo.far.far}"/><path fill="${fill["ms-mtn-near"]}" d="${geo.far.near}"/>` +
      `<path fill="${fill["ms-treeline"]}" d="${geo.far.trees}"/>${paint(geo.banks)}</svg>`;
    const stamp = ++reflStamp;
    const img = new Image();
    img.onload = () => {
      if (stamp !== reflStamp || !gl) return;
      const c = document.createElement("canvas");
      c.width = W;
      c.height = Math.max(1, Math.round(hy));
      const ctx = c.getContext("2d");
      const sky = ctx.createLinearGradient(0, 0, 0, hy);
      sky.addColorStop(0, cssVar("--sky1"));
      sky.addColorStop(Math.min(0.95, H * 0.34 / hy), cssVar("--sky2"));
      sky.addColorStop(1, cssVar("--sky3"));
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, hy);
      const sx = parseFloat(cssVar("--sun-x")) / 100 * W;
      const sy = parseFloat(cssVar("--sun-y")) / 100 * H;
      const size = parseFloat(cssVar("--sun-size")) || 60;
      const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, size * 3);
      glow.addColorStop(0, cssVar("--sun-glow"));
      glow.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, W, hy);
      ctx.fillStyle = cssVar("--sun");
      ctx.beginPath();
      ctx.arc(sx, sy, size / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.drawImage(img, 0, 0, W, H);
      const haze = ctx.createLinearGradient(0, hy - S * 0.12, 0, hy);
      haze.addColorStop(0, "rgba(255,255,255,0)");
      haze.addColorStop(1, cssVar("--haze"));
      ctx.fillStyle = haze;
      ctx.fillRect(0, hy - S * 0.12, W, S * 0.12);

      gl.bindTexture(gl.TEXTURE_2D, glTex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, c);
      gl.uniform3fv(glU.uNear, hexRGB(cssVar("--water2")));
      gl.uniform3fv(glU.uFar, hexRGB(cssVar("--water1")));
      gl.uniform3fv(glU.uSun, hexRGB(cssVar("--sun")));
      gl.uniform1f(glU.uSunX, sx / W);
      kickWater();
    };
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  }

  function renderWater(now) {
    glRaf = 0;
    if (!gl || !geo || !scene.classList.contains("gl-water")) return;
    gl.uniform1f(glU.uTime, (now - glStart) / 1000);
    gl.uniform1f(glU.uAspect, geo.W / (geo.H - geo.hy));
    gl.uniform1f(glU.uDepth, (geo.H - geo.hy) / geo.hy);
    gl.uniform4fv(glU.uRip, ripData);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    if (running && !reduceMotion) glRaf = requestAnimationFrame(renderWater);
  }

  function kickWater() {
    if (!glRaf && gl) glRaf = requestAnimationFrame(renderWater);
  }

  // x, y in lake pixels (y measured down from the horizon)
  function waterRipple(x, y, strength) {
    const i = (ripIdx++ % 8) * 4;
    ripData[i] = x / geo.W;
    ripData[i + 1] = y / (geo.H - geo.hy);
    ripData[i + 2] = (performance.now() - glStart) / 1000;
    ripData[i + 3] = strength;
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
    if (glRaf) { cancelAnimationFrame(glRaf); glRaf = 0; }
    timers.forEach(clearTimeout);
    timers = [];
    scene?.querySelectorAll(".ms-flock, .ms-fish, .ms-jumper, .ms-ripple, .ms-leaf").forEach(el => el.remove());
  }

  function applyTime() {
    const tod = currentTime();
    if (scene.dataset.tod !== tod) {
      scene.dataset.tod = tod;
      if (builtFor) populateFlies();
      updateReflection();
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
