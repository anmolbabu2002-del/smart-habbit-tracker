// hero-landscape-3d.js — Premium Cartoonish 3D Landscape for Bloom Hero
// Uses Three.js (already loaded globally) to render a game-quality scene
(function () {
  'use strict';

  var landscapeDiv = document.getElementById('hero-landscape');
  var container = document.querySelector('.bloom-hero');
  if (!landscapeDiv || !container || typeof THREE === 'undefined') return;

  // ═══════════════════════════════════════════════════════
  //  TIME-OF-DAY COLOR PALETTES (game-quality gradients)
  // ═══════════════════════════════════════════════════════
  var palettes = {
    morning: {
      skyTop: new THREE.Color(0x87CEEB),
      skyBot: new THREE.Color(0xFFD4A8),
      fog: new THREE.Color(0xFFE8CC),
      ambient: new THREE.Color(0xfff5e6),
      sunColor: new THREE.Color(0xFFD54F),
      sunPos: { x: 3, y: 5.5, z: -13 },
      sunIntensity: 2.0,
      mountainFar: new THREE.Color(0xB8A9C9),
      mountainMid: new THREE.Color(0x8FBC8F),
      mountainNear: new THREE.Color(0x6B8E6B),
      ground: new THREE.Color(0x7CB87C),
      cloudColor: new THREE.Color(0xffffff),
      cloudOpacity: 0.88,
      treeColor: new THREE.Color(0x4CAF50),
      treeDark: new THREE.Color(0x388E3C),
      particleColor: new THREE.Color(0xFFD700),
      waterColor: new THREE.Color(0x87CEEB),
      showMoon: false,
      showSun: true,
      starOpacity: 0
    },
    afternoon: {
      skyTop: new THREE.Color(0x4BA3F5),
      skyBot: new THREE.Color(0xA8E6CF),
      fog: new THREE.Color(0xDDEEFF),
      ambient: new THREE.Color(0xffffff),
      sunColor: new THREE.Color(0xFFF9C4),
      sunPos: { x: 3, y: 5.5, z: -13 },
      sunIntensity: 2.5,
      mountainFar: new THREE.Color(0x9DB5CC),
      mountainMid: new THREE.Color(0x5DAF6A),
      mountainNear: new THREE.Color(0x3E8A4E),
      ground: new THREE.Color(0x66BB6A),
      cloudColor: new THREE.Color(0xffffff),
      cloudOpacity: 0.92,
      treeColor: new THREE.Color(0x43A047),
      treeDark: new THREE.Color(0x2E7D32),
      particleColor: new THREE.Color(0xFFEB3B),
      waterColor: new THREE.Color(0x64B5F6),
      showMoon: false,
      showSun: true,
      starOpacity: 0
    },
    evening: {
      skyTop: new THREE.Color(0x6A5ACD),
      skyBot: new THREE.Color(0xFF8E53),
      fog: new THREE.Color(0xD4A8C8),
      ambient: new THREE.Color(0xffccaa),
      sunColor: new THREE.Color(0xFF5722),
      sunPos: { x: 3, y: 5.5, z: -13 },
      sunIntensity: 1.8,
      mountainFar: new THREE.Color(0x7B68AE),
      mountainMid: new THREE.Color(0x5C4D8C),
      mountainNear: new THREE.Color(0x3D3566),
      ground: new THREE.Color(0x4A6741),
      cloudColor: new THREE.Color(0xFFB088),
      cloudOpacity: 0.8,
      treeColor: new THREE.Color(0x3E7D3E),
      treeDark: new THREE.Color(0x2E5D2E),
      particleColor: new THREE.Color(0xFF9800),
      waterColor: new THREE.Color(0x7986CB),
      showMoon: false,
      showSun: true,
      starOpacity: 0
    },
    night: {
      skyTop: new THREE.Color(0x0C1445),
      skyBot: new THREE.Color(0x1A237E),
      fog: new THREE.Color(0x0C1445),
      ambient: new THREE.Color(0x334488),
      sunColor: new THREE.Color(0xC5CAE9),
      sunPos: { x: 3, y: 5.5, z: -13 },
      sunIntensity: 0.6,
      mountainFar: new THREE.Color(0x1A2744),
      mountainMid: new THREE.Color(0x0F1B33),
      mountainNear: new THREE.Color(0x0A1226),
      ground: new THREE.Color(0x1A2E1A),
      cloudColor: new THREE.Color(0x4455AA),
      cloudOpacity: 0.35,
      treeColor: new THREE.Color(0x1B3A1B),
      treeDark: new THREE.Color(0x0D1F0D),
      particleColor: new THREE.Color(0x80DEEA),
      waterColor: new THREE.Color(0x1A237E),
      showMoon: true,
      showSun: false,
      starOpacity: 1
    }
  };

  // ═══════════════════════════════════════════════════════
  //  DETECT CURRENT TIME
  // ═══════════════════════════════════════════════════════
  function getTimeKey() {
    var hero = document.querySelector('.bloom-hero');
    if (hero) {
      if (hero.classList.contains('time-morning')) return 'morning';
      if (hero.classList.contains('time-afternoon')) return 'afternoon';
      if (hero.classList.contains('time-evening')) return 'evening';
      if (hero.classList.contains('time-night')) return 'night';
    }
    var h = new Date().getHours();
    if (h >= 5 && h < 12) return 'morning';
    if (h >= 12 && h < 17) return 'afternoon';
    if (h >= 17 && h < 19) return 'evening';
    return 'night';
  }

  var currentPalette = palettes[getTimeKey()];
  var targetPalette = currentPalette;

  // ═══════════════════════════════════════════════════════
  //  SCENE SETUP
  // ═══════════════════════════════════════════════════════
  var W = container.clientWidth;
  var H = container.clientHeight;

  var scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(currentPalette.fog.getHex(), 0.025);

  var camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 200);
  camera.position.set(0, 3.5, 12);
  camera.lookAt(0, 1.5, 0);

  var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setSize(W, H);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.domElement.style.position = 'absolute';
  renderer.domElement.style.inset = '0';
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  renderer.domElement.style.borderRadius = 'inherit';
  landscapeDiv.insertBefore(renderer.domElement, landscapeDiv.firstChild);

  // ═══════════════════════════════════════════════════════
  //  SKY GRADIENT BACKGROUND
  // ═══════════════════════════════════════════════════════
  var skyCanvas = document.createElement('canvas');
  skyCanvas.width = 2;
  skyCanvas.height = 256;
  var skyCtx = skyCanvas.getContext('2d');
  var skyTexture = new THREE.CanvasTexture(skyCanvas);

  function updateSkyGradient(topColor, botColor) {
    var grad = skyCtx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#' + topColor.getHexString());
    grad.addColorStop(1, '#' + botColor.getHexString());
    skyCtx.fillStyle = grad;
    skyCtx.fillRect(0, 0, 2, 256);
    skyTexture.needsUpdate = true;
    scene.background = skyTexture;
  }
  updateSkyGradient(currentPalette.skyTop, currentPalette.skyBot);

  // ═══════════════════════════════════════════════════════
  //  LIGHTING
  // ═══════════════════════════════════════════════════════
  var ambientLight = new THREE.AmbientLight(currentPalette.ambient.getHex(), 0.5);
  scene.add(ambientLight);

  var hemiLight = new THREE.HemisphereLight(0xddeeff, 0x556644, 0.4);
  scene.add(hemiLight);

  var sunLight = new THREE.DirectionalLight(currentPalette.sunColor.getHex(), currentPalette.sunIntensity);
  sunLight.position.set(currentPalette.sunPos.x, currentPalette.sunPos.y, currentPalette.sunPos.z);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(1024, 1024);
  sunLight.shadow.camera.near = 0.5;
  sunLight.shadow.camera.far = 40;
  sunLight.shadow.camera.left = -15;
  sunLight.shadow.camera.right = 15;
  sunLight.shadow.camera.top = 10;
  sunLight.shadow.camera.bottom = -5;
  sunLight.shadow.bias = -0.001;
  scene.add(sunLight);

  // Fill light for ambient shadow softening
  var fillLight = new THREE.PointLight(0x8888FF, 0.3, 30);
  fillLight.position.set(-5, 4, 8);
  scene.add(fillLight);

  // ═══════════════════════════════════════════════════════
  //  HELPERS: LOW-POLY CARTOONISH GEOMETRY BUILDERS
  // ═══════════════════════════════════════════════════════

  // Flat-shaded material helper
  function cartoonMat(color, opts) {
    var o = opts || {};
    return new THREE.MeshStandardMaterial({
      color: color,
      flatShading: true,
      roughness: o.roughness !== undefined ? o.roughness : 0.85,
      metalness: o.metalness !== undefined ? o.metalness : 0.0,
      transparent: !!o.transparent,
      opacity: o.opacity !== undefined ? o.opacity : 1.0,
      side: o.side || THREE.FrontSide
    });
  }

  // ═══════════════════════════════════════════════════════
  //  GROUND PLANE
  // ═══════════════════════════════════════════════════════
  var groundGeo = new THREE.PlaneGeometry(60, 30, 30, 15);
  // Add subtle vertex displacement for a rolling hills effect
  var gVerts = groundGeo.attributes.position;
  for (var i = 0; i < gVerts.count; i++) {
    var gx = gVerts.getX(i);
    var gy = gVerts.getY(i);
    var gz = Math.sin(gx * 0.3) * 0.3 + Math.cos(gy * 0.5) * 0.2 + Math.random() * 0.08;
    gVerts.setZ(i, gz);
  }
  groundGeo.computeVertexNormals();

  var groundMat = cartoonMat(currentPalette.ground);
  var ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.5;
  ground.receiveShadow = true;
  scene.add(ground);

  // ═══════════════════════════════════════════════════════
  //  MOUNTAINS (3 LAYERS, LOW-POLY)
  // ═══════════════════════════════════════════════════════
  var mountainGroups = [];

  function createMountainRange(color, zPos, yOffset, scale, segments) {
    var geo = new THREE.PlaneGeometry(50, 8, segments || 20, 4);
    var verts = geo.attributes.position;
    for (var i = 0; i < verts.count; i++) {
      var x = verts.getX(i);
      var y = verts.getY(i);
      // Create mountain peaks with randomized heights
      var peak = Math.sin(x * 0.4 + zPos) * 2.5 + Math.sin(x * 0.8 + zPos * 2) * 1.5;
      peak *= Math.max(0, 1 - (y / -4)); // taper at bottom
      peak += Math.random() * 0.3; // rough rocky feel
      verts.setZ(i, Math.max(0, peak * scale));
    }
    geo.computeVertexNormals();

    var mat = cartoonMat(color);
    var mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2 + 0.15;
    mesh.position.set(0, yOffset, zPos);
    mesh.receiveShadow = true;
    scene.add(mesh);
    return { mesh: mesh, mat: mat };
  }

  mountainGroups.push(createMountainRange(currentPalette.mountainFar, -12, 1.5, 1.4, 24));
  mountainGroups.push(createMountainRange(currentPalette.mountainMid, -8, 0.5, 1.1, 20));
  mountainGroups.push(createMountainRange(currentPalette.mountainNear, -5, -0.2, 0.75, 16));

  // ═══════════════════════════════════════════════════════
  //  CARTOON TREES
  // ═══════════════════════════════════════════════════════
  var trees = [];
  var treePositions = [
    { x: -8, z: 1 }, { x: -5.5, z: 2.5 }, { x: -3, z: 0.5 },
    { x: -1, z: 2 }, { x: 1.5, z: 1.5 }, { x: 3.5, z: 3 },
    { x: 5, z: 0.8 }, { x: 7, z: 2 }, { x: 9, z: 1 },
    { x: -7, z: 3 }, { x: 4, z: -0.5 }, { x: -10, z: 2.5 }
  ];

  function createTree(x, z) {
    var group = new THREE.Group();

    // Trunk
    var trunkH = 0.5 + Math.random() * 0.3;
    var trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.12, trunkH, 6),
      cartoonMat(0x8D6E53)
    );
    trunk.position.y = trunkH / 2;
    trunk.castShadow = true;
    group.add(trunk);

    // Canopy — stack of 2-3 cones for cartoon look
    var layers = 2 + Math.floor(Math.random() * 2);
    var cY = trunkH * 0.7;
    for (var l = 0; l < layers; l++) {
      var coneR = 0.6 - l * 0.12;
      var coneH = 0.7 - l * 0.08;
      var cone = new THREE.Mesh(
        new THREE.ConeGeometry(coneR, coneH, 7),
        cartoonMat(l === 0 ? currentPalette.treeDark : currentPalette.treeColor)
      );
      cone.position.y = cY + l * 0.35;
      cone.castShadow = true;
      cone.receiveShadow = true;
      group.add(cone);
    }

    // Ground height at position
    var gndY = Math.sin(x * 0.3) * 0.3 + Math.cos(z * 0.5) * 0.2 - 0.5;
    group.position.set(x, gndY, z);

    var s = 0.6 + Math.random() * 0.6;
    group.scale.set(s, s, s);

    scene.add(group);
    trees.push({ group: group, phase: Math.random() * Math.PI * 2 });
    return group;
  }

  treePositions.forEach(function (p) {
    createTree(p.x, p.z);
  });

  // ═══════════════════════════════════════════════════════
  //  VOLUMETRIC 3D CLOUDS (slow drift)
  // ═══════════════════════════════════════════════════════
  var clouds = [];

  function createCloud(x, y, z, scale) {
    var group = new THREE.Group();
    var cloudMat = new THREE.MeshStandardMaterial({
      color: currentPalette.cloudColor,
      flatShading: true,
      roughness: 1.0,
      metalness: 0.0,
      transparent: true,
      opacity: currentPalette.cloudOpacity
    });

    // Create a cluster of soft spheres
    var puffs = 5 + Math.floor(Math.random() * 4);
    for (var p = 0; p < puffs; p++) {
      var r = 0.4 + Math.random() * 0.5;
      var puff = new THREE.Mesh(
        new THREE.SphereGeometry(r, 8, 6),
        cloudMat
      );
      puff.position.set(
        (Math.random() - 0.5) * 2.2,
        (Math.random() - 0.3) * 0.6,
        (Math.random() - 0.5) * 0.8
      );
      puff.scale.y = 0.6 + Math.random() * 0.3; // Flatten slightly
      group.add(puff);
    }

    group.position.set(x, y, z);
    var s = scale || 1;
    group.scale.set(s, s * 0.7, s * 0.8);
    scene.add(group);

    clouds.push({
      group: group,
      mat: cloudMat,
      speed: 0.15 + Math.random() * 0.15, // Very slow drift
      startX: x,
      resetX: -25
    });
    return group;
  }

  // Place clouds at different heights and depths
  createCloud(-10, 5.5, -10, 1.2);
  createCloud(5, 6, -14, 1.5);
  createCloud(15, 4.5, -8, 1.0);
  createCloud(-18, 6.5, -12, 1.3);
  createCloud(22, 5, -16, 0.9);

  // ═══════════════════════════════════════════════════════
  //  SUN / MOON
  // ═══════════════════════════════════════════════════════

  // -- Glow Texture Generator (Soft sphere for sun/moon glow) --
  var glowCanvas = document.createElement('canvas');
  glowCanvas.width = 128;
  glowCanvas.height = 128;
  var glowCtx = glowCanvas.getContext('2d');
  var glowGrad = glowCtx.createRadialGradient(64, 64, 0, 64, 64, 64);
  glowGrad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  glowGrad.addColorStop(0.3, 'rgba(255, 255, 255, 0.5)');
  glowGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  glowCtx.fillStyle = glowGrad;
  glowCtx.fillRect(0, 0, 128, 128);
  var glowTex = new THREE.CanvasTexture(glowCanvas);

  // -- Sun --
  var sunGroup = new THREE.Group();
  
  var sunCanvas = document.createElement('canvas');
  sunCanvas.width = 256;
  sunCanvas.height = 256;
  var sunCtx = sunCanvas.getContext('2d');
  sunCtx.font = '180px sans-serif';
  sunCtx.textAlign = 'center';
  sunCtx.textBaseline = 'middle';
  sunCtx.fillText('🌞', 128, 140);
  
  var sunTex = new THREE.CanvasTexture(sunCanvas);
  // Optional: keep texture crisp
  sunTex.minFilter = THREE.LinearFilter;
  
  var sunCoreMat = new THREE.SpriteMaterial({ map: sunTex, transparent: true });
  var sunCore = new THREE.Sprite(sunCoreMat);
  sunCore.scale.set(3.5, 3.5, 1);
  sunGroup.add(sunCore);

  // Sun glow (additive sprite) - reduced heavily per user request
  var sunGlowMat = new THREE.SpriteMaterial({
    map: glowTex,
    color: currentPalette.sunColor,
    transparent: true,
    opacity: 0.15,
    blending: THREE.AdditiveBlending
  });
  var sunGlow = new THREE.Sprite(sunGlowMat);
  sunGlow.scale.set(4, 4, 1);
  sunGroup.add(sunGlow);

  var rayGroup = new THREE.Group(); // empty placeholder to prevent loop crash

  sunGroup.position.set(currentPalette.sunPos.x, currentPalette.sunPos.y, currentPalette.sunPos.z);
  sunGroup.visible = false; // Forced hidden per user request to remove floating circles
  scene.add(sunGroup);

  // -- Moon --
  var moonGroup = new THREE.Group();
  var moonMat = new THREE.MeshStandardMaterial({
    color: 0xE8EAF6,
    emissive: 0x9FA8DA,
    emissiveIntensity: 0.5,
    flatShading: true,
    roughness: 0.9
  });
  var moonSphere = new THREE.Mesh(new THREE.SphereGeometry(0.6, 12, 12), moonMat);
  moonGroup.add(moonSphere);

  // Crescent cutout (dark sphere overlapping)
  var moonCut = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 12, 12),
    new THREE.MeshBasicMaterial({ color: currentPalette.skyTop })
  );
  moonCut.position.set(0.25, 0.15, 0.2);
  moonGroup.add(moonCut);

  // Moon glow - reduced heavily
  var moonGlowMat = new THREE.SpriteMaterial({
    map: glowTex,
    color: 0x9FA8DA,
    transparent: true,
    opacity: 0.15,
    blending: THREE.AdditiveBlending
  });
  var moonGlow = new THREE.Sprite(moonGlowMat);
  moonGlow.scale.set(3, 3, 1);
  moonGroup.add(moonGlow);

  moonGroup.position.set(3, 5.5, -13);
  moonGroup.visible = false;
  scene.add(moonGroup);

  // ═══════════════════════════════════════════════════════
  //  VIBRANT CARTOONISH FLOATING ELEMENTS
  // ═══════════════════════════════════════════════════════
  var vibrantGroup = new THREE.Group();

  // 1. Floating Magical Ring (Torus)
  var torusMat = new THREE.MeshStandardMaterial({ 
    color: 0xFF9BEA, 
    roughness: 0.2, 
    metalness: 0.1,
    emissive: 0xFF69B4,
    emissiveIntensity: 0.15
  });
  var floatingTorus = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.2, 16, 32), torusMat);
  floatingTorus.position.set(-6, 3.5, -8);
  vibrantGroup.add(floatingTorus);

  // 2. Floating Crystal (Octahedron)
  var crystalMat = new THREE.MeshStandardMaterial({
    color: 0x4DF0FF,
    roughness: 0.1,
    metalness: 0.2,
    flatShading: true,
    emissive: 0x00E5FF,
    emissiveIntensity: 0.2
  });
  var floatingCrystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.7, 0), crystalMat);
  floatingCrystal.position.set(7, 4.5, -10);
  vibrantGroup.add(floatingCrystal);

  // Floatings without bubble
  vibrantGroup.visible = false; // Hidden per user request 
  scene.add(vibrantGroup);

  // ═══════════════════════════════════════════════════════
  //  STARS (night-only particles)
  // ═══════════════════════════════════════════════════════
  var starCount = 120;
  var starGeo = new THREE.BufferGeometry();
  var starPositions = new Float32Array(starCount * 3);
  for (var s = 0; s < starCount; s++) {
    starPositions[s * 3] = (Math.random() - 0.5) * 50;
    starPositions[s * 3 + 1] = 3 + Math.random() * 8;
    starPositions[s * 3 + 2] = -5 - Math.random() * 20;
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  var starMat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.08,
    transparent: true,
    opacity: currentPalette.starOpacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  var starPoints = new THREE.Points(starGeo, starMat);
  scene.add(starPoints);

  // ═══════════════════════════════════════════════════════
  //  WATER / RIVER PLANE
  // ═══════════════════════════════════════════════════════
  var waterGeo = new THREE.PlaneGeometry(12, 4, 20, 8);
  var waterMat = new THREE.MeshStandardMaterial({
    color: currentPalette.waterColor,
    transparent: true,
    opacity: 0.6,
    roughness: 0.1,
    metalness: 0.3,
    flatShading: true,
    side: THREE.DoubleSide
  });
  var water = new THREE.Mesh(waterGeo, waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.set(2, -0.35, 3);
  water.receiveShadow = true;
  scene.add(water);

  // ═══════════════════════════════════════════════════════
  //  FLOATING PARTICLES (fireflies / dust motes)
  // ═══════════════════════════════════════════════════════
  var particleCount = 60;
  var particleGeo = new THREE.BufferGeometry();
  var pPositions = new Float32Array(particleCount * 3);
  var pVelocities = [];
  for (var pi = 0; pi < particleCount; pi++) {
    pPositions[pi * 3] = (Math.random() - 0.5) * 30;
    pPositions[pi * 3 + 1] = Math.random() * 5 + 0.5;
    pPositions[pi * 3 + 2] = (Math.random() - 0.5) * 15;
    pVelocities.push({
      x: (Math.random() - 0.5) * 0.005,
      y: 0.003 + Math.random() * 0.005,
      z: (Math.random() - 0.5) * 0.003
    });
  }
  particleGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
  var particleMat = new THREE.PointsMaterial({
    color: currentPalette.particleColor,
    size: 0.06,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  var particles = new THREE.Points(particleGeo, particleMat);
  scene.add(particles);

  // ═══════════════════════════════════════════════════════
  //  SMALL DETAIL: ROCKS (scattered)
  // ═══════════════════════════════════════════════════════
  var rockPositions = [
    { x: -6, z: 3, s: 0.3 }, { x: 2, z: 4, s: 0.2 }, { x: -2, z: 1.5, s: 0.25 },
    { x: 6.5, z: 2, s: 0.35 }, { x: -9, z: 0.5, s: 0.2 }, { x: 8, z: 3.5, s: 0.15 }
  ];
  rockPositions.forEach(function (rp) {
    var rockGeo = new THREE.DodecahedronGeometry(rp.s, 0);
    var rock = new THREE.Mesh(rockGeo, cartoonMat(0x9E9E9E));
    var gndY = Math.sin(rp.x * 0.3) * 0.3 + Math.cos(rp.z * 0.5) * 0.2 - 0.5;
    rock.position.set(rp.x, gndY + rp.s * 0.3, rp.z);
    rock.rotation.set(Math.random(), Math.random(), Math.random());
    rock.castShadow = true;
    rock.receiveShadow = true;
    scene.add(rock);
  });

  // ═══════════════════════════════════════════════════════
  //  BEAUTIFUL 3D FLOWERS (multi-petal with stems)
  // ═══════════════════════════════════════════════════════
  var flowerTypes = [
    { petals: 8, petalColor: 0xFF5252, centerColor: 0xFFCDD2, petalW: 0.12, petalLen: 0.15, name: 'rose' },
    { petals: 10, petalColor: 0xFFFFFF, centerColor: 0xFFD54F, petalW: 0.06, petalLen: 0.14, name: 'daisy' },
    { petals: 6, petalColor: 0xF48FB1, centerColor: 0xFCE4EC, petalW: 0.1, petalLen: 0.12, name: 'sakura' },
    { petals: 12, petalColor: 0xFFD54F, centerColor: 0x5D4037, petalW: 0.08, petalLen: 0.16, name: 'sunflower' },
    { petals: 5, petalColor: 0xCE93D8, centerColor: 0xF3E5F5, petalW: 0.09, petalLen: 0.11, name: 'violet' },
    { petals: 3, petalColor: 0xE53935, centerColor: 0xFFEB3B, petalW: 0.14, petalLen: 0.0, name: 'tulip' }
  ];
  var flowerMeshes = [];

  function createFlower3D(x, z, typeIndex) {
    var group = new THREE.Group();
    var type = flowerTypes[typeIndex % flowerTypes.length];
    var gndY = Math.sin(x * 0.3) * 0.3 + Math.cos(z * 0.5) * 0.2 - 0.5;
    var stemH = 0.25 + Math.random() * 0.15;
    var fStem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.018, stemH, 5),
      cartoonMat(0x4CAF50)
    );
    fStem.position.y = stemH / 2;
    fStem.castShadow = true;
    group.add(fStem);
    var leafGeo = new THREE.SphereGeometry(0.06, 4, 3);
    leafGeo.scale(1, 0.3, 2);
    var leaf = new THREE.Mesh(leafGeo, cartoonMat(0x66BB6A));
    leaf.position.set(0.04, stemH * 0.4, 0);
    leaf.rotation.z = -0.5;
    group.add(leaf);
    var headGroup = new THREE.Group();
    headGroup.position.y = stemH;
    if (type.name === 'tulip') {
      for (var tp = 0; tp < type.petals; tp++) {
        var tAngle = (tp / type.petals) * Math.PI * 2;
        var tulipPetal = new THREE.Mesh(
          new THREE.SphereGeometry(0.08, 6, 6),
          cartoonMat(type.petalColor)
        );
        tulipPetal.scale.set(0.6, 1.2, 0.5);
        tulipPetal.position.set(Math.cos(tAngle) * 0.03, 0.06, Math.sin(tAngle) * 0.03);
        tulipPetal.rotation.z = Math.cos(tAngle) * 0.3;
        headGroup.add(tulipPetal);
      }
    } else {
      for (var fp = 0; fp < type.petals; fp++) {
        var fAng = (fp / type.petals) * Math.PI * 2;
        var petalGeo = new THREE.SphereGeometry(type.petalW, 5, 4);
        petalGeo.scale(1, 0.4, 2.2);
        var petal = new THREE.Mesh(petalGeo, cartoonMat(type.petalColor));
        petal.position.set(Math.cos(fAng) * type.petalLen, 0, Math.sin(fAng) * type.petalLen);
        petal.rotation.y = -fAng;
        petal.rotation.x = -0.3;
        petal.castShadow = true;
        headGroup.add(petal);
      }
    }
    var cSize = type.name === 'sunflower' ? 0.08 : 0.04;
    var fCenter = new THREE.Mesh(
      new THREE.SphereGeometry(cSize, 8, 6),
      cartoonMat(type.centerColor, { roughness: 0.4 })
    );
    fCenter.position.y = 0.01;
    headGroup.add(fCenter);
    headGroup.rotation.x = -0.2 + Math.random() * 0.2;
    headGroup.rotation.z = (Math.random() - 0.5) * 0.3;
    group.add(headGroup);
    var fScale = 0.5 + Math.random() * 0.4; // Scaled back up so they are clearly visible
    group.scale.set(fScale, fScale, fScale);
    group.position.set(x, gndY, z);
    scene.add(group);
    flowerMeshes.push({ group: group, headGroup: headGroup, phase: Math.random() * Math.PI * 2 });
  }

  // Generate realistic organic clusters of wildflowers
  var flower3DPositions = [];
  var clusterCenters = [];
  
  // Create 16 natural clustering zones scattered closer to readable view
  for (var c = 0; c < 16; c++) {
    clusterCenters.push({
      x: (Math.random() - 0.5) * 35,
      z: -7 + Math.random() * 11 // z: -7 to 4
    });
  }

  // Populate dense flowers inside clusters
  clusterCenters.forEach(function(center) {
    var flowersInCluster = 6 + Math.floor(Math.random() * 8);
    var dominantType = Math.floor(Math.random() * flowerTypes.length);
    
    for (var i = 0; i < flowersInCluster; i++) {
        var fx = center.x + (Math.random() - 0.5) * 4;
        var fz = center.z + (Math.random() - 0.5) * 4;
        
        var fType = Math.random() > 0.8 ? Math.floor(Math.random() * flowerTypes.length) : dominantType;
        
        flower3DPositions.push({ x: fx, z: fz, t: fType });
    }
  });

  flower3DPositions.forEach(function (fPos) {
    createFlower3D(fPos.x, fPos.z, fPos.t);
  });

  // ═══════════════════════════════════════════════════════
  //  COLOR LERP HELPER
  // ═══════════════════════════════════════════════════════
  function lerpColor(current, target, alpha) {
    current.r += (target.r - current.r) * alpha;
    current.g += (target.g - current.g) * alpha;
    current.b += (target.b - current.b) * alpha;
  }

  // ═══════════════════════════════════════════════════════
  //  TIME-OF-DAY TRANSITION
  // ═══════════════════════════════════════════════════════
  function transitionToTime(newTimeKey) {
    targetPalette = palettes[newTimeKey];
  }

  // Listen for time changes
  window.addEventListener('heroTimeChanged', function (e) {
    if (e.detail && e.detail.timeClass) {
      var key = e.detail.timeClass.replace('time-', '');
      if (palettes[key]) transitionToTime(key);
    }
  });

  // Also poll periodically
  var lastTimeKey = getTimeKey();
  setInterval(function () {
    var k = getTimeKey();
    if (k !== lastTimeKey) {
      lastTimeKey = k;
      transitionToTime(k);
    }
  }, 30000);

  // ═══════════════════════════════════════════════════════
  //  ANIMATION LOOP
  // ═══════════════════════════════════════════════════════
  var clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    var t = clock.getElapsedTime();
    var dt = clock.getDelta();
    var lerpSpeed = 0.008;

    // -- Smooth color transitions --
    lerpColor(groundMat.color, targetPalette.ground, lerpSpeed);
    mountainGroups.forEach(function (mg, idx) {
      var targetColor = idx === 0 ? targetPalette.mountainFar : idx === 1 ? targetPalette.mountainMid : targetPalette.mountainNear;
      lerpColor(mg.mat.color, targetColor, lerpSpeed);
    });

    // Sky gradient transition
    lerpColor(currentPalette.skyTop, targetPalette.skyTop, lerpSpeed);
    lerpColor(currentPalette.skyBot, targetPalette.skyBot, lerpSpeed);
    updateSkyGradient(currentPalette.skyTop, currentPalette.skyBot);

    // Fog
    lerpColor(scene.fog.color, targetPalette.fog, lerpSpeed);

    // Ambient light
    lerpColor(ambientLight.color, targetPalette.ambient, lerpSpeed);

    // Sun position & color
    sunLight.position.x += (targetPalette.sunPos.x - sunLight.position.x) * lerpSpeed;
    sunLight.position.y += (targetPalette.sunPos.y - sunLight.position.y) * lerpSpeed;
    sunLight.intensity += (targetPalette.sunIntensity - sunLight.intensity) * lerpSpeed;
    lerpColor(sunLight.color, targetPalette.sunColor, lerpSpeed);

    // Sun/Moon visibility
    sunGroup.visible = targetPalette.showSun;
    sunGroup.position.copy(sunLight.position);
    lerpColor(sunGlowMat.color, targetPalette.sunColor, lerpSpeed);

    moonGroup.visible = targetPalette.showMoon;
    lerpColor(moonCut.material.color, targetPalette.skyTop, lerpSpeed);

    // Sun slow oscillation
    sunCore.position.y = Math.sin(t * 0.2) * 0.03;

    // Vibrant 3D objects animation
    floatingTorus.rotation.x += 0.01;
    floatingTorus.rotation.y += 0.015;
    floatingTorus.position.y = 3.5 + Math.sin(t * 1.5) * 0.2;

    floatingCrystal.rotation.y += 0.02;
    floatingCrystal.position.y = 4.5 + Math.sin(t * 2.0) * 0.15;

    // Stars
    starMat.opacity += (targetPalette.starOpacity - starMat.opacity) * lerpSpeed;

    // -- Cloud drift (SLOW) --
    clouds.forEach(function (c) {
      c.group.position.x += c.speed * 0.016; // ~1px per frame at 60fps
      // Gentle vertical oscillation
      c.group.position.y += Math.sin(t * 0.3 + c.startX) * 0.001;

      // Reset when off screen right
      if (c.group.position.x > 28) {
        c.group.position.x = -28;
      }

      // Update cloud color
      lerpColor(c.mat.color, targetPalette.cloudColor, lerpSpeed);
      c.mat.opacity += (targetPalette.cloudOpacity - c.mat.opacity) * lerpSpeed;
    });

    // -- Tree sway --
    trees.forEach(function (tr) {
      tr.group.rotation.z = Math.sin(t * 0.8 + tr.phase) * 0.03;
      tr.group.rotation.x = Math.sin(t * 0.5 + tr.phase * 2) * 0.015;
    });

    // -- Water wave animation --
    var wVerts = waterGeo.attributes.position;
    for (var wi = 0; wi < wVerts.count; wi++) {
      var wx = wVerts.getX(wi);
      var wy = wVerts.getY(wi);
      wVerts.setZ(wi, Math.sin(wx * 1.5 + t * 1.2) * 0.06 + Math.cos(wy * 2 + t * 0.8) * 0.04);
    }
    waterGeo.attributes.position.needsUpdate = true;
    waterGeo.computeVertexNormals();
    lerpColor(waterMat.color, targetPalette.waterColor, lerpSpeed);

    // -- Floating particles --
    var pa = particleGeo.attributes.position.array;
    for (var pi = 0; pi < particleCount; pi++) {
      pa[pi * 3] += pVelocities[pi].x + Math.sin(t + pi) * 0.002;
      pa[pi * 3 + 1] += pVelocities[pi].y;
      pa[pi * 3 + 2] += pVelocities[pi].z;

      // Reset particles that float too high
      if (pa[pi * 3 + 1] > 8) {
        pa[pi * 3] = (Math.random() - 0.5) * 30;
        pa[pi * 3 + 1] = 0.5;
        pa[pi * 3 + 2] = (Math.random() - 0.5) * 15;
      }
    }
    particleGeo.attributes.position.needsUpdate = true;
    lerpColor(particleMat.color, targetPalette.particleColor, lerpSpeed);

    // -- Camera gentle breathing --
    camera.position.y = 3.5 + Math.sin(t * 0.4) * 0.08;
    camera.position.x = Math.sin(t * 0.15) * 0.3;
    camera.lookAt(0, 1.5, 0);

    renderer.render(scene, camera);
  }

  animate();

  // ═══════════════════════════════════════════════════════
  //  RESPONSIVE RESIZE
  // ═══════════════════════════════════════════════════════
  window.addEventListener('resize', function () {
    var w = container.clientWidth;
    var h = container.clientHeight;
    if (w === 0 || h === 0) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });

})();
