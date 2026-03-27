// castle-3d.js — Three.js 3D Castle Builder for Streak System
// Renders progressive castle stages as 3D geometry with brick-by-brick animations
(function () {
  var container, renderer, scene, camera, castle3D, currentStage = -1, mobileMode = false;
  var animating = false;
  var castleGroup;
  var cloudsGroup;
  var cloudData = [];
  var clock;

  // Colors
  var C = {
    stone:     0x9e9e9e, stoneDark: 0x757575,
    brick:     0xc0836d, brickDark: 0xa0634d,
    wood:      0x8d6e63, woodDark: 0x5d4037,
    roof:      0xb71c1c, roofDark: 0x7f0000,
    gold:      0xffd54f, goldDark: 0xffb300,
    purple:    0xce93d8, purpleDark: 0x9c27b0,
    glass:     0x81d4fa, glassDark: 0x4fc3f7,
    grass:     0x43a047, grassDark: 0x2e7d32,
    door:      0x5d4037, gate:     0x3e2723,
    white:     0xffffff, flag:     0xe53935,
    magic:     0xb388ff, magicGlow: 0x7c4dff
  };

  function init() {
    container = document.getElementById('castle-container');
    if (!container || container.dataset.has3d) return;
    container.dataset.has3d = 'true';

    var sky = container.querySelector('.castle-sky');
    var ground = container.querySelector('.castle-ground');
    var particles = container.querySelector('.castle-particles-layer');
    if (sky) sky.style.display = 'none';
    if (ground) ground.style.display = 'none';
    if (particles) particles.style.display = 'none';

    var W = container.clientWidth || 400;
    var H = container.clientHeight || 320;
    mobileMode = W < 500;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(mobileMode ? 60 : 45, W / H, 0.1, 100);
    camera.position.set(0, mobileMode ? 4 : 3, mobileMode ? 12 : 8);
    camera.lookAt(0, 1.5, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.domElement.style.cssText = 'position:absolute;top:0;left:0;z-index:5;border-radius:22px;';
    container.appendChild(renderer.domElement);

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    var sun = new THREE.DirectionalLight(0xfff5e6, 1.2);
    sun.position.set(4, 8, 5);
    sun.castShadow = true;
    sun.shadow.mapSize.set(512, 512);
    scene.add(sun);
    scene.add(new THREE.HemisphereLight(0x87ceeb, 0x43a047, 0.4));

    // Ground
    var gnd = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), mat(C.grass, { roughness: 0.8 }));
    gnd.rotation.x = -Math.PI / 2; gnd.receiveShadow = true; scene.add(gnd);

    // Path
    var path = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 4), mat(0xbcaaa4, { roughness: 0.9 }));
    path.rotation.x = -Math.PI / 2; path.position.set(0, 0.01, 2.5); scene.add(path);

    castleGroup = new THREE.Group();
    scene.add(castleGroup);

    // 3D Clouds
    cloudsGroup = new THREE.Group();
    cloudsGroup.position.y = 4.5;
    scene.add(cloudsGroup);
    createClouds();

    clock = new THREE.Clock();

    function loop() {
      requestAnimationFrame(loop);
      var t = clock.getElapsedTime();
      if (currentStage >= 7 && castleGroup.children.length > 0) {
        castleGroup.position.y = Math.sin(t * 1.5) * 0.08;
      }
      animateClouds(t);
      renderer.render(scene, camera);
    }
    loop();

    window.addEventListener('resize', function () {
      if (!container) return;
      var w = container.clientWidth, h = container.clientHeight;
      if (w > 0 && h > 0) {
        mobileMode = w < 500;
        camera.aspect = w / h;
        camera.fov = mobileMode ? 60 : 45;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
        if (currentStage >= 0) adjustCameraForStage(currentStage);
      }
    });
  }

  // ═══ FLUFFY 3D CLOUDS ═══
  function makeCloud(size) {
    var g = new THREE.Group();
    var puffCount = 5 + Math.floor(Math.random() * 4);
    var cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0, transparent: true, opacity: 0.85 });
    for (var i = 0; i < puffCount; i++) {
      var r = (0.3 + Math.random() * 0.5) * size;
      var puff = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), cloudMat);
      puff.position.set((Math.random() - 0.5) * size * 1.8, (Math.random() - 0.3) * size * 0.5, (Math.random() - 0.5) * size * 0.8);
      puff.scale.y = 0.55 + Math.random() * 0.2;
      g.add(puff);
    }
    return g;
  }

  function createClouds() {
    cloudData = [];
    var configs = [
      { x: -5, y: 0.3, z: -4, size: 1.2, speed: 0.15, bobAmp: 0.08, bobFreq: 0.8 },
      { x: -1, y: 0.8, z: -6, size: 1.5, speed: 0.1,  bobAmp: 0.12, bobFreq: 0.6 },
      { x:  4, y: 0.1, z: -3, size: 0.9, speed: 0.2,  bobAmp: 0.06, bobFreq: 1.0 },
      { x:  7, y: 0.6, z: -5, size: 1.1, speed: 0.12, bobAmp: 0.1,  bobFreq: 0.7 },
      { x: -8, y: 0.5, z: -7, size: 1.4, speed: 0.08, bobAmp: 0.09, bobFreq: 0.5 },
      { x:  2, y: 1.0, z: -8, size: 1.0, speed: 0.18, bobAmp: 0.07, bobFreq: 0.9 }
    ];
    for (var i = 0; i < configs.length; i++) {
      var cfg = configs[i];
      var cloud = makeCloud(cfg.size);
      cloud.position.set(cfg.x, cfg.y, cfg.z);
      cloudsGroup.add(cloud);
      cloudData.push({ mesh: cloud, speed: cfg.speed, baseY: cfg.y, bobAmp: cfg.bobAmp, bobFreq: cfg.bobFreq, phase: Math.random() * Math.PI * 2 });
    }
  }

  function animateClouds(t) {
    for (var i = 0; i < cloudData.length; i++) {
      var d = cloudData[i];
      d.mesh.position.x += d.speed * 0.016;
      if (d.mesh.position.x > 12) d.mesh.position.x = -12;
      d.mesh.position.y = d.baseY + Math.sin(t * d.bobFreq + d.phase) * d.bobAmp;
    }
  }

  // ═══ MATERIAL HELPER ═══
  function mat(color, opts) {
    return new THREE.MeshStandardMaterial(Object.assign({ color: color, roughness: 0.7, metalness: 0.05 }, opts || {}));
  }

  // ═══ DECORATIVE HELPERS ═══
  function makeTree(trunkH, crownR, crownColor) {
    var g = new THREE.Group();
    var trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, trunkH, 8), mat(C.wood));
    trunk.position.y = trunkH / 2; trunk.castShadow = true; g.add(trunk);
    for (var i = 0; i < 3; i++) {
      var r = crownR * (1 - i * 0.2);
      var leaf = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), mat(crownColor || 0x4caf50));
      leaf.position.y = trunkH + i * r * 0.5; leaf.scale.y = 0.7; leaf.castShadow = true; g.add(leaf);
    }
    return g;
  }

  function makeBush(r, color) {
    var g = new THREE.Group();
    for (var i = 0; i < 3; i++) {
      var puff = new THREE.Mesh(new THREE.SphereGeometry(r * (0.6 + Math.random() * 0.4), 8, 6), mat(color || 0x388e3c));
      puff.position.set((Math.random() - 0.5) * r, r * 0.4, (Math.random() - 0.5) * r * 0.6);
      puff.scale.y = 0.7; puff.castShadow = true; g.add(puff);
    }
    return g;
  }

  function makeFlower(color) {
    var g = new THREE.Group();
    var stem = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.15, 4), mat(0x2e7d32));
    stem.position.y = 0.075; g.add(stem);
    var head = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), mat(color));
    head.position.y = 0.15; g.add(head);
    return g;
  }

  function makeTorch() {
    var g = new THREE.Group();
    var pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 6), mat(C.woodDark));
    pole.position.y = 0.25; g.add(pole);
    var flame = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), mat(0xff9800, { emissive: 0xff6f00, emissiveIntensity: 1.0 }));
    flame.position.y = 0.55; flame.scale.y = 1.4; g.add(flame);
    var light = new THREE.PointLight(0xff8f00, 0.6, 2.5);
    light.position.y = 0.55; g.add(light);
    return g;
  }

  function makeRock(s) {
    var rock = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), mat(0x9e9e9e, { roughness: 0.9 }));
    rock.scale.y = 0.6; rock.castShadow = true;
    return rock;
  }

  function makeFenceSection(len) {
    var g = new THREE.Group();
    var n = Math.floor(len / 0.2);
    for (var i = 0; i <= n; i++) {
      var post = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.3, 0.04), mat(C.wood));
      post.position.set(i * 0.2 - len / 2, 0.15, 0); g.add(post);
    }
    var rail = new THREE.Mesh(new THREE.BoxGeometry(len, 0.03, 0.03), mat(C.wood));
    rail.position.y = 0.22; g.add(rail);
    var rail2 = new THREE.Mesh(new THREE.BoxGeometry(len, 0.03, 0.03), mat(C.wood));
    rail2.position.y = 0.1; g.add(rail2);
    return g;
  }

  function makeFountain() {
    var g = new THREE.Group();
    var pool = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.65, 0.15, 16), mat(C.stone));
    pool.position.y = 0.075; g.add(pool);
    var water = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.05, 16), mat(0x4fc3f7, { transparent: true, opacity: 0.7 }));
    water.position.y = 0.15; g.add(water);
    var pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.5, 8), mat(C.stoneDark));
    pillar.position.y = 0.4; g.add(pillar);
    var bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.18, 0.1, 12), mat(C.stone));
    bowl.position.y = 0.7; g.add(bowl);
    var water2 = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.04, 12), mat(0x81d4fa, { transparent: true, opacity: 0.6 }));
    water2.position.y = 0.73; g.add(water2);
    var spout = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), mat(0x81d4fa, { emissive: 0x4fc3f7, emissiveIntensity: 0.3 }));
    spout.position.y = 0.85; g.add(spout);
    return g;
  }

  function makeCrystal(h, color) {
    var g = new THREE.Group();
    var crystal = new THREE.Mesh(new THREE.ConeGeometry(h * 0.25, h, 6), mat(color, { transparent: true, opacity: 0.8, emissive: color, emissiveIntensity: 0.4 }));
    crystal.position.y = h / 2; g.add(crystal);
    var glow = new THREE.PointLight(color, 0.4, 2);
    glow.position.y = h * 0.6; g.add(glow);
    return g;
  }

  function makeMushroomCluster() {
    var g = new THREE.Group();
    var colors = [0xe57373, 0xffb74d, 0xfff176];
    for (var i = 0; i < 3; i++) {
      var stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.08, 6), mat(0xfafafa));
      var cap = new THREE.Mesh(new THREE.SphereGeometry(0.04 + i * 0.01, 8, 6), mat(colors[i]));
      cap.scale.y = 0.5;
      stem.position.set((i - 1) * 0.06, 0.04, 0);
      cap.position.set((i - 1) * 0.06, 0.09 + i * 0.01, 0);
      g.add(stem); g.add(cap);
    }
    return g;
  }

  function makeSign() {
    var g = new THREE.Group();
    var post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.6, 6), mat(C.wood));
    post.position.y = 0.3; g.add(post);
    var board = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.03), mat(C.wood));
    board.position.y = 0.55; g.add(board);
    return g;
  }

  function makeBridge(len) {
    var g = new THREE.Group();
    for (var i = 0; i < Math.floor(len / 0.15); i++) {
      var plank = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.04, 0.12), mat(C.wood));
      plank.position.set(0, 0.02, i * 0.15 - len / 2); plank.castShadow = true; g.add(plank);
    }
    [-0.4, 0.4].forEach(function (x) {
      var rail = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.25, len), mat(C.wood));
      rail.position.set(x, 0.14, 0); g.add(rail);
    });
    return g;
  }

  // ═══ STRUCTURAL HELPERS ═══
  function brickRow(width, height, depth, color, y, parent) {
    var brickW = 0.3, count = Math.floor(width / brickW);
    var offset = -(count * brickW) / 2 + brickW / 2;
    for (var i = 0; i < count; i++) {
      var b = new THREE.Mesh(
        new THREE.BoxGeometry(brickW - 0.02, height - 0.01, depth),
        mat(i % 2 === 0 ? color : (color === C.brick ? C.brickDark : C.stoneDark))
      );
      b.position.set(offset + i * brickW, y, 0);
      b.castShadow = true; b.receiveShadow = true; b.scale.set(0, 0, 0);
      parent.add(b);
    }
  }

  function makeWall(w, h, d, color) {
    var g = new THREE.Group();
    var rows = Math.floor(h / 0.2);
    for (var r = 0; r < rows; r++) brickRow(w, 0.18, d, color, r * 0.2 + 0.1, g);
    return g;
  }

  function makeTower(radius, height, color) {
    var g = new THREE.Group();
    var body = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 1.05, height, 16), mat(color));
    body.position.y = height / 2; body.castShadow = true; g.add(body);
    // Stone ring detail
    var ring = new THREE.Mesh(new THREE.TorusGeometry(radius * 1.02, 0.03, 8, 16), mat(C.stoneDark));
    ring.position.y = height * 0.5; ring.rotation.x = Math.PI / 2; g.add(ring);
    // Cone roof
    var roof = new THREE.Mesh(new THREE.ConeGeometry(radius * 1.3, height * 0.4, 16), mat(C.roof));
    roof.position.y = height + height * 0.2; roof.castShadow = true; g.add(roof);
    // Windows with frames
    for (var i = 0; i < 2; i++) {
      var frame = new THREE.Mesh(new THREE.PlaneGeometry(radius * 0.6, radius * 0.8), mat(C.woodDark));
      frame.position.set(0, height * 0.35 + i * height * 0.3, radius + 0.005); g.add(frame);
      var win = new THREE.Mesh(new THREE.PlaneGeometry(radius * 0.45, radius * 0.65), mat(C.glass, { emissive: C.glassDark, emissiveIntensity: 0.4 }));
      win.position.set(0, height * 0.35 + i * height * 0.3, radius + 0.01); g.add(win);
    }
    return g;
  }

  function makeFlag(color) {
    var g = new THREE.Group();
    var pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.6, 6), mat(0x888888, { metalness: 0.5 }));
    pole.position.y = 0.3; g.add(pole);
    var ball = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), mat(C.gold, { metalness: 0.6 }));
    ball.position.y = 0.6; g.add(ball);
    var cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 0.2), mat(color || C.flag, { side: THREE.DoubleSide }));
    cloth.position.set(0.18, 0.5, 0); g.add(cloth);
    return g;
  }

  // ═══════════════════════════════════════════
  // ═══ STAGE BUILDERS (PREMIUM ENHANCED) ═══
  // ═══════════════════════════════════════════

  function buildStage0() { // Foundation
    var g = new THREE.Group();
    var slab = new THREE.Mesh(new THREE.BoxGeometry(3, 0.3, 2), mat(C.stone));
    slab.position.y = 0.15; slab.castShadow = true; slab.receiveShadow = true; g.add(slab);
    // Corner stones
    [[-1.2, 0, -0.7], [1.2, 0, -0.7], [-1.2, 0, 0.7], [1.2, 0, 0.7]].forEach(function (p) {
      var s = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.45, 0.4), mat(C.stoneDark));
      s.position.set(p[0], 0.22, p[2]); s.castShadow = true; g.add(s);
    });
    // Scattered rocks
    [[1.8, 0.1, 0.5], [-2.0, 0.08, -0.3], [2.2, 0.07, -0.8], [-1.8, 0.09, 1.0]].forEach(function (p) {
      var r = makeRock(p[1] + 0.04); r.position.set(p[0], p[1], p[2]); r.rotation.y = Math.random() * 3; g.add(r);
    });
    // Wooden sign
    var sign = makeSign(); sign.position.set(2.0, 0, 0.8); sign.rotation.y = -0.3; g.add(sign);
    // Mushrooms
    var mush = makeMushroomCluster(); mush.position.set(-2.2, 0, 0.6); g.add(mush);
    // Wild flowers
    [0xff7043, 0xffd54f, 0xba68c8, 0x4fc3f7].forEach(function (c, i) {
      var f = makeFlower(c); f.position.set(-1.5 + i * 0.4, 0, 1.3 + Math.random() * 0.3); g.add(f);
    });
    // Small bush
    var bush = makeBush(0.2, 0x4caf50); bush.position.set(2.5, 0, -0.5); g.add(bush);
    // Tiny sapling tree
    var sapling = makeTree(0.3, 0.15, 0x66bb6a); sapling.position.set(-2.5, 0, -0.7); g.add(sapling);
    return g;
  }

  function buildStage1() { // Walls
    var g = new THREE.Group();
    var base = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.2, 2.5), mat(C.stone));
    base.position.y = 0.1; base.receiveShadow = true; g.add(base);
    // Brick walls
    var bw = makeWall(3, 1.2, 0.25, C.brick); bw.position.set(0, 0.2, -1); g.add(bw);
    var sw1 = makeWall(2, 1.0, 0.25, C.brick); sw1.position.set(-1.4, 0.2, 0); sw1.rotation.y = Math.PI / 2; g.add(sw1);
    var sw2 = makeWall(2, 1.0, 0.25, C.brick); sw2.position.set(1.4, 0.2, 0); sw2.rotation.y = Math.PI / 2; g.add(sw2);
    // Scaffolding
    [[-0.5, 0], [0.5, 0]].forEach(function (p) {
      var pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.6, 6), mat(C.wood));
      pole.position.set(p[0], 0.8, 1.2); g.add(pole);
    });
    var plank = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.04, 0.3), mat(C.wood));
    plank.position.set(0, 1.1, 1.2); g.add(plank);
    // Pile of extra bricks
    for (var i = 0; i < 5; i++) {
      var eb = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.12, 0.12), mat(i % 2 ? C.brick : C.brickDark));
      eb.position.set(2 + (i % 3) * 0.15, 0.06 + Math.floor(i / 3) * 0.13, 0.8 + (i % 2) * 0.13);
      eb.rotation.y = Math.random() * 0.3; g.add(eb);
    }
    // Bushes & flowers
    var b1 = makeBush(0.25, 0x388e3c); b1.position.set(-2.0, 0, 0.5); g.add(b1);
    var b2 = makeBush(0.2, 0x4caf50); b2.position.set(2.5, 0, -0.8); g.add(b2);
    [0xff5252, 0xffd740, 0xba68c8].forEach(function (c, i) {
      var f = makeFlower(c); f.position.set(-2.2 + i * 0.18, 0, 1.0); g.add(f);
    });
    // Small tree
    var tree = makeTree(0.4, 0.2, 0x4caf50); tree.position.set(2.8, 0, 0.3); g.add(tree);
    return g;
  }

  function buildStage2() { // Cottage
    var g = new THREE.Group();
    // Walls
    var walls = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.2, 1.8), mat(C.brick));
    walls.position.y = 0.6; walls.castShadow = true; walls.receiveShadow = true; g.add(walls);
    // Roof
    var roofShape = new THREE.Shape();
    roofShape.moveTo(-1.3, 0); roofShape.lineTo(0, 0.8); roofShape.lineTo(1.3, 0); roofShape.lineTo(-1.3, 0);
    var roofMesh = new THREE.Mesh(new THREE.ExtrudeGeometry(roofShape, { depth: 2.0, bevelEnabled: false }), mat(C.roof));
    roofMesh.position.set(0, 1.2, -1.0); roofMesh.castShadow = true; g.add(roofMesh);
    // Door with frame
    var doorFrame = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.85), mat(C.woodDark));
    doorFrame.position.set(0, 0.42, 0.905); g.add(doorFrame);
    var door = new THREE.Mesh(new THREE.PlaneGeometry(0.48, 0.78), mat(C.door));
    door.position.set(0, 0.4, 0.91); g.add(door);
    // Windows with flower boxes
    [-0.6, 0.6].forEach(function (x) {
      var wf = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.42), mat(C.woodDark));
      wf.position.set(x, 0.8, 0.905); g.add(wf);
      var w = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 0.35), mat(C.glass, { emissive: C.glassDark, emissiveIntensity: 0.3 }));
      w.position.set(x, 0.8, 0.91); g.add(w);
      var box = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.08, 0.1), mat(C.wood));
      box.position.set(x, 0.56, 0.95); g.add(box);
      for (var fi = 0; fi < 3; fi++) {
        var fl = makeFlower([0xff7043, 0xffd54f, 0xba68c8][fi]);
        fl.position.set(x - 0.12 + fi * 0.12, 0.6, 0.95); fl.scale.set(0.7, 0.7, 0.7); g.add(fl);
      }
    });
    // Chimney with smoke
    var chimney = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.6, 0.25), mat(C.stoneDark));
    chimney.position.set(0.7, 1.7, -0.3); chimney.castShadow = true; g.add(chimney);
    var smoke = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), mat(0xeeeeee, { transparent: true, opacity: 0.4 }));
    smoke.position.set(0.7, 2.1, -0.3); g.add(smoke);
    var smoke2 = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), mat(0xeeeeee, { transparent: true, opacity: 0.25 }));
    smoke2.position.set(0.75, 2.3, -0.25); g.add(smoke2);
    // Garden fence
    var fence = makeFenceSection(1.5); fence.position.set(-1.7, 0, 0.8); fence.rotation.y = Math.PI / 2; g.add(fence);
    var fence2 = makeFenceSection(1.0); fence2.position.set(-1.2, 0, 1.5); g.add(fence2);
    // Trees
    var tree1 = makeTree(0.6, 0.35, 0x388e3c); tree1.position.set(-2.2, 0, -0.5); g.add(tree1);
    var tree2 = makeTree(0.5, 0.25, 0x2e7d32); tree2.position.set(2.0, 0, -0.7); g.add(tree2);
    // Bushes
    var bush = makeBush(0.25); bush.position.set(1.8, 0, 0.6); g.add(bush);
    var bush2 = makeBush(0.2, 0x4caf50); bush2.position.set(-2.5, 0, 0.3); g.add(bush2);
    // Path stones
    [0, 0.5, 1.0, 1.5].forEach(function (z) {
      var ps = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.03, 8), mat(0xbcaaa4));
      ps.position.set(0, 0.015, 1.0 + z); g.add(ps);
    });
    return g;
  }

  function buildStage3() { // Tower
    var g = new THREE.Group();
    var base = new THREE.Mesh(new THREE.BoxGeometry(2, 1.0, 1.5), mat(C.brick));
    base.position.y = 0.5; base.castShadow = true; g.add(base);
    // Door with arch
    var door = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.7), mat(C.door));
    door.position.set(0, 0.35, 0.76); g.add(door);
    var arch = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.04, 8, 12, Math.PI), mat(C.stoneDark));
    arch.position.set(0, 0.7, 0.76); g.add(arch);
    // Main tower
    var tower = makeTower(0.5, 2.5, C.stone);
    tower.position.set(0, 1.0, -0.3); g.add(tower);
    // Balcony
    var balcony = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.05, 0.35), mat(C.stoneDark));
    balcony.position.set(0, 2.2, 0.35); g.add(balcony);
    var railing = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.15, 0.03), mat(C.stone));
    railing.position.set(0, 2.3, 0.5); g.add(railing);
    // Torches
    [-1.05, 1.05].forEach(function (x) {
      var t = makeTorch(); t.position.set(x, 0.7, 0.76); g.add(t);
    });
    // Trees and vegetation
    var tree1 = makeTree(0.5, 0.3, 0x2e7d32); tree1.position.set(-1.8, 0, 0.8); g.add(tree1);
    var tree2 = makeTree(0.7, 0.4, 0x388e3c); tree2.position.set(2.0, 0, -0.5); g.add(tree2);
    var bush = makeBush(0.22); bush.position.set(1.5, 0, 1.0); g.add(bush);
    // Flowers near entrance
    [0xff7043, 0xffd54f, 0x64b5f6].forEach(function (c, i) {
      var f = makeFlower(c); f.position.set(-0.5 + i * 0.25, 0, 1.2); g.add(f);
    });
    // Flag on tower
    var flag = makeFlag(C.flag); flag.position.set(0, 3.7, -0.3); g.add(flag);
    return g;
  }

  function buildStage4() { // Castle
    var g = new THREE.Group();
    // Central wall
    var wall = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.5, 0.3), mat(C.brick));
    wall.position.set(0, 0.75, 0); wall.castShadow = true; g.add(wall);
    // Battlements
    for (var i = -1; i <= 1; i += 0.5) {
      var bt = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.3, 0.35), mat(C.brick));
      bt.position.set(i, 1.65, 0); bt.castShadow = true; g.add(bt);
    }
    // Two towers
    [-1.5, 1.5].forEach(function (x) {
      var t = makeTower(0.45, 2.2, C.stone); t.position.set(x, 0, 0); g.add(t);
    });
    // Gate with arch
    var gate = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.9), mat(C.gate));
    gate.position.set(0, 0.45, 0.16); g.add(gate);
    var archG = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.06, 8, 16, Math.PI), mat(C.stoneDark));
    archG.position.set(0, 0.9, 0.16); g.add(archG);
    // Drawbridge
    var bridge = makeBridge(1.0); bridge.position.set(0, 0.01, 1.0); g.add(bridge);
    // Wall torches
    [-0.8, 0.8].forEach(function (x) {
      var t = makeTorch(); t.position.set(x, 1.0, 0.16); g.add(t);
    });
    // Trees
    var t1 = makeTree(0.8, 0.45, 0x2e7d32); t1.position.set(-2.8, 0, 0.5); g.add(t1);
    var t2 = makeTree(0.6, 0.35, 0x388e3c); t2.position.set(2.8, 0, -0.3); g.add(t2);
    // Bushes
    var b1 = makeBush(0.2); b1.position.set(-2.2, 0, -0.8); g.add(b1);
    var b2 = makeBush(0.25); b2.position.set(2.3, 0, 1.0); g.add(b2);
    // Flags on towers
    [-1.5, 1.5].forEach(function (x) {
      var f = makeFlag(C.flag); f.position.set(x, 2.8, 0); g.add(f);
    });
    // Garden patches
    [[-2.5, 1.2], [2.5, 1.2]].forEach(function (p) {
      for (var fi = 0; fi < 3; fi++) {
        var fl = makeFlower([0xff7043, 0xffd54f, 0xba68c8][fi]);
        fl.position.set(p[0] + fi * 0.15, 0, p[1]); g.add(fl);
      }
    });
    return g;
  }

  function buildStage5() { // Grand Castle
    var g = new THREE.Group();
    // Main keep
    var keep = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.0, 1.2), mat(C.brick));
    keep.position.set(0, 1.0, -0.3); keep.castShadow = true; g.add(keep);
    var keepRoof = new THREE.Mesh(new THREE.ConeGeometry(1.1, 0.8, 4), mat(C.roofDark));
    keepRoof.position.set(0, 2.4, -0.3); keepRoof.rotation.y = Math.PI / 4; keepRoof.castShadow = true; g.add(keepRoof);
    // 4 corner towers
    [[-1.8, 0.5], [1.8, 0.5], [-1.8, -1.1], [1.8, -1.1]].forEach(function (p) {
      var t = makeTower(0.4, 2.0, C.stone); t.position.set(p[0], 0, p[1]); g.add(t);
    });
    // Front wall with battlements
    var fwall = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.2, 0.25), mat(C.brick));
    fwall.position.set(0, 0.6, 0.6); fwall.castShadow = true; g.add(fwall);
    for (var i = -1.4; i <= 1.4; i += 0.4) {
      var bt = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.25, 0.3), mat(C.brick));
      bt.position.set(i, 1.35, 0.6); g.add(bt);
    }
    // Gate
    var gate = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.0), mat(C.gate));
    gate.position.set(0, 0.5, 0.73); g.add(gate);
    // Bridge over moat
    var bridge = makeBridge(1.2); bridge.position.set(0, 0.06, 1.5); g.add(bridge);
    // Moat
    var moat = new THREE.Mesh(new THREE.BoxGeometry(5, 0.05, 1), mat(0x4fc3f7, { transparent: true, opacity: 0.6 }));
    moat.position.set(0, 0.02, 1.5); g.add(moat);
    // Flags on all towers
    [[-1.8, 2.8, 0.5], [1.8, 2.8, 0.5], [-1.8, 2.8, -1.1], [1.8, 2.8, -1.1]].forEach(function (p) {
      var f = makeFlag(C.flag); f.position.set(p[0], p[1], p[2]); g.add(f);
    });
    // Courtyard fountain
    var fountain = makeFountain(); fountain.position.set(0, 0, -0.3); g.add(fountain);
    // Torches on walls
    [-1.2, 1.2].forEach(function (x) {
      var torch = makeTorch(); torch.position.set(x, 0.9, 0.73); g.add(torch);
    });
    // Trees outside
    var t1 = makeTree(1.0, 0.5, 0x2e7d32); t1.position.set(-3.2, 0, 0); g.add(t1);
    var t2 = makeTree(0.8, 0.4, 0x388e3c); t2.position.set(3.0, 0, -0.5); g.add(t2);
    // Bushes
    var b1 = makeBush(0.3, 0x388e3c); b1.position.set(-3.0, 0, 1.5); g.add(b1);
    var b2 = makeBush(0.25); b2.position.set(3.2, 0, 1.0); g.add(b2);
    return g;
  }

  function buildStage6() { // Kingdom
    var g = buildStage5();
    // Make everything golden
    g.traverse(function (child) {
      if (child.isMesh && child.material && child.material.color) {
        var hex = child.material.color.getHex();
        if (hex === C.brick || hex === C.brickDark) child.material = mat(C.gold, { metalness: 0.3 });
        if (hex === C.roof || hex === C.roofDark) child.material = mat(C.goldDark, { metalness: 0.4 });
      }
    });
    // Golden statues at gate
    [-0.6, 0.6].forEach(function (x) {
      var pedestal = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.3, 0.25), mat(C.stoneDark));
      pedestal.position.set(x, 0.15, 0.75); g.add(pedestal);
      var statue = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.5, 8), mat(C.gold, { metalness: 0.6 }));
      statue.position.set(x, 0.55, 0.75); g.add(statue);
      var head = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), mat(C.gold, { metalness: 0.6 }));
      head.position.set(x, 0.85, 0.75); g.add(head);
    });
    // Lanterns everywhere
    [[-2, 2.5, 0.5], [2, 2.5, 0.5], [0, 3.2, -0.3], [-2, 2.5, -1.1], [2, 2.5, -1.1]].forEach(function (p) {
      var lantern = new THREE.PointLight(0xff9800, 0.6, 3);
      lantern.position.set(p[0], p[1], p[2]); g.add(lantern);
      var lm = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), mat(0xff9800, { emissive: 0xff6f00, emissiveIntensity: 0.8 }));
      lm.position.set(p[0], p[1], p[2]); g.add(lm);
    });
    // Crystals
    var c1 = makeCrystal(0.4, 0x42a5f5); c1.position.set(-3.0, 0, 1.0); g.add(c1);
    var c2 = makeCrystal(0.3, 0x66bb6a); c2.position.set(3.2, 0, 0.8); g.add(c2);
    var c3 = makeCrystal(0.35, 0xffa726); c3.position.set(-2.8, 0, -1.5); g.add(c3);
    // Ornamental flower gardens
    for (var row = 0; row < 2; row++) {
      for (var col = 0; col < 4; col++) {
        var fl = makeFlower([0xff7043, 0xffd54f, 0xba68c8, 0x4fc3f7][col]);
        fl.position.set(-3.5 + col * 0.2, 0, 2.0 + row * 0.2); g.add(fl);
      }
    }
    return g;
  }

  function buildStage7() { // Sky Castle
    var g = buildStage6();
    // Make magical purple
    g.traverse(function (child) {
      if (child.isMesh && child.material && child.material.color) {
        var hex = child.material.color.getHex();
        if (hex === C.gold) child.material = mat(C.purple, { emissive: C.magicGlow, emissiveIntensity: 0.15 });
        if (hex === C.goldDark) child.material = mat(C.purpleDark, { emissive: C.magicGlow, emissiveIntensity: 0.2 });
        if (hex === C.stone || hex === C.stoneDark) child.material = mat(0xe1bee7, { emissive: C.magic, emissiveIntensity: 0.1 });
      }
    });
    g.traverse(function (child) {
      if (child.isPointLight) { child.color.set(C.magic); child.intensity = 1.0; }
    });
    // Crystal spires on top
    [[-1.0, 3.0, -0.3], [1.0, 3.0, -0.3], [0, 3.5, -0.3]].forEach(function (p) {
      var spire = makeCrystal(0.6, C.magic); spire.position.set(p[0], p[1], p[2]); g.add(spire);
    });
    // Floating magical orbs
    [[-2.5, 2.0, 0], [2.5, 2.5, -0.5], [0, 4.0, 0.3], [-1.5, 3.5, 0.5], [1.5, 3.0, -1.0]].forEach(function (p) {
      var orb = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), mat(C.magic, { emissive: C.magicGlow, emissiveIntensity: 0.8, transparent: true, opacity: 0.7 }));
      orb.position.set(p[0], p[1], p[2]); g.add(orb);
      var orbLight = new THREE.PointLight(C.magic, 0.3, 2);
      orbLight.position.set(p[0], p[1], p[2]); g.add(orbLight);
    });
    // Floating cloud bed beneath
    [-2, -0.5, 1, 2.5].forEach(function (x) {
      for (var j = 0; j < 3; j++) {
        var cloud = new THREE.Mesh(new THREE.SphereGeometry(0.4 + Math.random() * 0.3, 10, 8), mat(0xffffff, { transparent: true, opacity: 0.4 }));
        cloud.scale.set(1.5, 0.3, 0.8);
        cloud.position.set(x + (Math.random() - 0.5), -0.4 - Math.random() * 0.3, (Math.random() - 0.5) * 2);
        g.add(cloud);
      }
    });
    // Aurora beam
    var aurora = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.15, 4, 8), mat(C.magic, { transparent: true, opacity: 0.2, emissive: C.magicGlow, emissiveIntensity: 0.5 }));
    aurora.position.set(0, 4, -0.3); g.add(aurora);
    return g;
  }

  var builders = [buildStage0, buildStage1, buildStage2, buildStage3,
    buildStage4, buildStage5, buildStage6, buildStage7];

  // ═══ STAGE TRANSITION ═══
  function animateBuildIn(group) {
    var meshes = [];
    group.traverse(function (child) {
      if (child.isMesh) meshes.push(child);
    });
    meshes.forEach(function (m, i) {
      var origScale = m.scale.clone();
      m.scale.set(0, 0, 0);
      m.position.y -= 0.3;
      var origY = m.position.y + 0.3;
      var delay = i * 30;
      setTimeout(function () {
        var start = Date.now();
        var dur = 500;
        function tick() {
          var p = Math.min(1, (Date.now() - start) / dur);
          var e = p === 1 ? 1 : 1 - Math.pow(2, -10 * p) * Math.cos((p * 10 - 0.75) * (2 * Math.PI / 3));
          m.scale.set(origScale.x * e, origScale.y * e, origScale.z * e);
          m.position.y = origY - 0.3 + 0.3 * e;
          if (p < 1) requestAnimationFrame(tick);
        }
        tick();
      }, delay);
    });
  }

  // ═══ UPDATE SKY ═══
  function updateSky(stageIdx) {
    var skies = [
      [0x87ceeb, 0xe0f7fa], [0x4fc3f7, 0xb3e5fc], [0x42a5f5, 0x90caf9],
      [0xff8a65, 0xffe082], [0x7e57c2, 0xf48fb1], [0x5c6bc0, 0x9fa8da],
      [0x1a237e, 0x3949ab], [0x0d0d2b, 0x4a148c]
    ];
    var s = skies[stageIdx] || skies[0];
    scene.background = new THREE.Color(s[0]);
    scene.fog = new THREE.FogExp2(s[0], 0.06);
    scene.traverse(function (child) {
      if (child.isHemisphereLight) child.color.set(s[1]);
    });
  }

  // ═══ PUBLIC API ═══
  // Dynamic camera per stage so taller castles stay visible on mobile
  function adjustCameraForStage(idx) {
    if (!camera) return;
    // Stage-specific camera offsets: [camY, camZ, lookY]
    var presets = [
      [3,   8,  1.0],  // 0 Foundation
      [3,   8,  1.0],  // 1 Walls
      [3,   8.5,1.2],  // 2 Cottage
      [3.2, 9,  1.5],  // 3 Tower
      [3.5, 9.5,1.8],  // 4 Castle
      [3.8, 10, 2.0],  // 5 Grand Castle
      [4.0, 10.5,2.2], // 6 Kingdom
      [4.5, 11, 2.5]   // 7 Sky Castle
    ];
    var p = presets[Math.min(idx, 7)];
    if (mobileMode) {
      // Pull far back on mobile so entire castle + decorations are visible
      camera.position.set(0, p[0] + 1.5, p[1] + 4);
      camera.lookAt(0, p[2] + 0.5, 0);
      castleGroup.scale.setScalar(0.7);
    } else {
      camera.position.set(0, p[0], p[1]);
      camera.lookAt(0, p[2], 0);
      castleGroup.scale.setScalar(1);
    }
    camera.updateProjectionMatrix();
  }

  window.updateCastle3D = function (stageIdx) {
    if (typeof THREE === 'undefined') return false;
    if (!container) init();
    if (!container) return false;
    if (stageIdx === currentStage) return true;

    while (castleGroup.children.length > 0) castleGroup.remove(castleGroup.children[0]);

    var idx = Math.min(stageIdx, builders.length - 1);
    var newCastle = builders[idx]();
    castleGroup.add(newCastle);
    castleGroup.position.y = 0;

    adjustCameraForStage(idx);
    animateBuildIn(newCastle);
    updateSky(idx);
    currentStage = stageIdx;
    return true;
  };

  function tryInit() {
    if (typeof THREE !== 'undefined' && document.getElementById('castle-container')) {
      init();
    } else {
      setTimeout(tryInit, 500);
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryInit);
  } else {
    tryInit();
  }
})();
