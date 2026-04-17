// welcome-3d.js — Cinematic Entrance v3: Fixed Object.assign bug
(function () {
  var overlay = document.getElementById('name-registration-overlay');
  var container = document.getElementById('welcome-3d-canvas');
  if (!overlay || !container) return;
  var started = false;

  // Helper: create mesh, set position/rotation/scale, return it
  function M(geo, mat, px, py, pz, rx, ry, rz, sx, sy, sz) {
    var m = new THREE.Mesh(geo, mat);
    if (px !== undefined) m.position.set(px||0, py||0, pz||0);
    if (rx !== undefined) m.rotation.set(rx||0, ry||0, rz||0);
    if (sx !== undefined) m.scale.set(sx, sy, sz);
    m.castShadow = true;
    return m;
  }

  function init() {
    if (started) return;
    started = true;

    var W = container.clientWidth, H = container.clientHeight;
    var isMobile = W < H;

    // ═══ RENDERER ═══
    var renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    container.appendChild(renderer.domElement);

    // ═══ SCENE ═══
    var scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f2f8);
    scene.fog = new THREE.FogExp2(0xf0f2f8, 0.02);

    // ═══ CAMERA ═══
    var camera = new THREE.PerspectiveCamera(isMobile ? 60 : 50, W / H, 0.1, 200);
    camera.position.set(0, isMobile ? 3.2 : 2.8, isMobile ? 13 : 10);
    var cameraShake = { x: 0, y: 0 };

    // ═══ LIGHTING ═══
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    scene.add(new THREE.HemisphereLight(0xddeeff, 0xc8c8d0, 0.5));
    var keyLight = new THREE.DirectionalLight(0xfff5e6, 1.6);
    keyLight.position.set(5, 12, 8);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(2048, 2048);
    keyLight.shadow.camera.near = 0.5; keyLight.shadow.camera.far = 30;
    keyLight.shadow.camera.left = -8; keyLight.shadow.camera.right = 8;
    keyLight.shadow.camera.top = 8; keyLight.shadow.camera.bottom = -8;
    keyLight.shadow.bias = -0.0001;
    scene.add(keyLight);
    var backLight = new THREE.DirectionalLight(0x99bbff, 0.6);
    backLight.position.set(-5, 8, -5);
    scene.add(backLight);
    var fillLight = new THREE.PointLight(0xFF8C42, 1.0, 15);
    fillLight.position.set(2, 3, 5);
    scene.add(fillLight);
    var accentLight = new THREE.PointLight(0x667eea, 1.5, 10);
    accentLight.position.set(0, 3, 0);
    scene.add(accentLight);

    // ═══ GROUND ═══
    var gnd = new THREE.Mesh(new THREE.PlaneGeometry(80, 80),
      new THREE.MeshStandardMaterial({ color: 0xe8eaf0, metalness: 0.15, roughness: 0.6 }));
    gnd.rotation.x = -Math.PI / 2; gnd.receiveShadow = true;
    scene.add(gnd);
    var grid = new THREE.GridHelper(40, 80, 0xd0d4e0, 0xe0e2ea);
    grid.position.y = 0.01; grid.material.opacity = 0.4; grid.material.transparent = true;
    scene.add(grid);

    // ═══ FLOATING PARTICLES ═══
    var pCount = 200;
    var pGeo = new THREE.BufferGeometry();
    var pPos = new Float32Array(pCount * 3);
    for (var i = 0; i < pCount; i++) {
      pPos[i*3] = (Math.random()-0.5)*25;
      pPos[i*3+1] = Math.random()*8+0.5;
      pPos[i*3+2] = (Math.random()-0.5)*25;
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    scene.add(new THREE.Points(pGeo, new THREE.PointsMaterial({
      color: 0x8b5cf6, size: 0.035, transparent: true, opacity: 0.35,
      blending: THREE.AdditiveBlending, depthWrite: false
    })));

    // ═══ TRAIL ═══
    var trailCount = 50, trailIdx = 0, trailActive = false;
    var trailGeo = new THREE.BufferGeometry();
    var trailPos = new Float32Array(trailCount * 3);
    for (var i = 0; i < trailCount; i++) { trailPos[i*3]=-100; trailPos[i*3+1]=-100; trailPos[i*3+2]=-100; }
    trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3));
    scene.add(new THREE.Points(trailGeo, new THREE.PointsMaterial({
      color: 0x8b5cf6, size: 0.06, transparent: true, opacity: 0.45,
      blending: THREE.AdditiveBlending, depthWrite: false
    })));
    function emitTrail(x, y, z) {
      if (!trailActive) return;
      var pa = trailGeo.attributes.position.array;
      for (var j = 0; j < 2; j++) {
        var idx = ((trailIdx+j) % trailCount)*3;
        pa[idx] = x+(Math.random()-0.5)*0.15;
        pa[idx+1] = y+Math.random()*0.3+0.1;
        pa[idx+2] = z+(Math.random()-0.5)*0.15;
      }
      trailIdx = (trailIdx+2) % trailCount;
      trailGeo.attributes.position.needsUpdate = true;
    }
    function updateTrail() {
      var pa = trailGeo.attributes.position.array;
      for (var i = 0; i < trailCount; i++) pa[i*3+1] += 0.012;
      trailGeo.attributes.position.needsUpdate = true;
    }

    // ═══ RIPPLE ═══
    var rippleMat = new THREE.MeshBasicMaterial({ color: 0x8b5cf6, transparent: true, opacity: 0, side: THREE.DoubleSide });
    var ripple = new THREE.Mesh(new THREE.RingGeometry(0.1, 0.3, 64), rippleMat);
    ripple.rotation.x = -Math.PI/2; ripple.position.y = 0.02;
    scene.add(ripple);

    // ═══ MATERIALS ═══
    var skinMat = new THREE.MeshStandardMaterial({ color: 0xf0c8a0, roughness: 0.45, metalness: 0.02 });
    var skinDarkMat = new THREE.MeshStandardMaterial({ color: 0xe0b890, roughness: 0.5 });
    var hairMat = new THREE.MeshStandardMaterial({ color: 0x1a0e08, roughness: 0.85, metalness: 0.05 });
    var hoodieMat = new THREE.MeshStandardMaterial({ color: 0x4f46e5, roughness: 0.6, metalness: 0.05 });
    var hoodieAccentMat = new THREE.MeshStandardMaterial({ color: 0x3730a3, roughness: 0.5 });
    var pantsMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.55 });
    var pantsCreaseMat = new THREE.MeshStandardMaterial({ color: 0x161e2e, roughness: 0.65 });
    var shoeMat = new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.3, metalness: 0.2 });
    var soleMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 });
    var hpMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.2, metalness: 0.6 });
    var hpCushMat = new THREE.MeshStandardMaterial({ color: 0x2d2d3d, roughness: 0.8 });
    var hpAccMat = new THREE.MeshStandardMaterial({ color: 0xFF8C42, roughness: 0.3, metalness: 0.4 });
    var nailMat = new THREE.MeshStandardMaterial({ color: 0xf5d5c0, roughness: 0.3 });
    var lipMat = new THREE.MeshStandardMaterial({ color: 0xd4957a, roughness: 0.5 });
    var eyeWMat = new THREE.MeshStandardMaterial({ color: 0xfefefe, roughness: 0.08 });
    var irisMat = new THREE.MeshStandardMaterial({ color: 0x3b5998, roughness: 0.15, metalness: 0.12 });
    var pupilMat = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.05 });
    var strMat = new THREE.MeshStandardMaterial({ color: 0xf0f0f0, roughness: 0.8 });
    var lashMat = new THREE.MeshStandardMaterial({ color: 0x0a0805, roughness: 0.9 });

    var char = new THREE.Group();

    // ═══ HOODIE BODY ═══
    var torso = M(new THREE.CylinderGeometry(0.36, 0.34, 1.15, 24), hoodieMat);
    char.add(torso);

    // Ribbed hem
    var hem = M(new THREE.TorusGeometry(0.34, 0.03, 8, 24), hoodieAccentMat, 0, -0.57, 0, Math.PI/2, 0, 0);
    char.add(hem);

    // Center seam
    char.add(M(new THREE.BoxGeometry(0.008, 0.8, 0.008), hoodieAccentMat, 0, 0, 0.35));

    // Kangaroo pocket
    char.add(M(new THREE.BoxGeometry(0.5, 0.22, 0.04), hoodieAccentMat, 0, -0.18, 0.33));

    // Pocket slit
    char.add(M(new THREE.BoxGeometry(0.05, 0.22, 0.008),
      new THREE.MeshStandardMaterial({ color: 0x2d2778, roughness: 0.7 }), 0, -0.18, 0.355));

    // Collar
    char.add(M(new THREE.TorusGeometry(0.26, 0.04, 10, 24), hoodieAccentMat, 0, 0.55, 0, Math.PI/2, 0, 0));

    // Drawstrings
    [-0.07, 0.07].forEach(function(x) {
      char.add(M(new THREE.CylinderGeometry(0.005, 0.005, 0.35, 6), strMat, x, 0.35, 0.34));
      char.add(M(new THREE.CylinderGeometry(0.008, 0.003, 0.04, 6), strMat, x, 0.17, 0.34));
    });

    // ═══ NECK ═══
    char.add(M(new THREE.CylinderGeometry(0.09, 0.11, 0.16, 16), skinMat, 0, 0.65, 0));

    // ═══ HEAD ═══
    var headGroup = new THREE.Group();
    headGroup.position.y = 0.93;

    // Skull
    var head = M(new THREE.SphereGeometry(0.28, 48, 48), skinMat);
    head.scale.set(1, 1.12, 0.94);
    headGroup.add(head);

    // Jaw
    var jaw = M(new THREE.SphereGeometry(0.2, 24, 24), skinMat, 0, -0.15, 0.05);
    jaw.scale.set(0.85, 0.5, 0.75);
    headGroup.add(jaw);

    // Chin
    headGroup.add(M(new THREE.SphereGeometry(0.06, 16, 16), skinMat, 0, -0.22, 0.17));

    // Cheekbones
    [-0.18, 0.18].forEach(function(x) {
      var cb = M(new THREE.SphereGeometry(0.06, 12, 12), skinMat, x, -0.01, 0.18);
      cb.scale.set(1, 0.6, 0.8);
      headGroup.add(cb);
    });

    // Forehead
    var fh = M(new THREE.SphereGeometry(0.22, 20, 20), skinMat, 0, 0.14, 0.2);
    fh.scale.set(1.1, 0.3, 0.5);
    headGroup.add(fh);

    // ── HOOD ──
    var hoodBody = M(new THREE.SphereGeometry(0.38, 28, 28, 0, Math.PI*2, 0, Math.PI*0.55), hoodieMat, 0, 0, -0.15, -0.5, 0, 0);
    hoodBody.scale.set(1.0, 0.9, 1.15);
    headGroup.add(hoodBody);

    var hoodLip = M(new THREE.TorusGeometry(0.32, 0.025, 8, 20, Math.PI*1.2), hoodieAccentMat, 0, 0.12, 0, 0.3, 0, 0);
    headGroup.add(hoodLip);

    var hoodDrape = M(new THREE.CylinderGeometry(0.28, 0.34, 0.35, 16), hoodieMat, 0, -0.28, -0.12, 0.15, 0, 0);
    headGroup.add(hoodDrape);

    // Ears
    [-0.26, 0.26].forEach(function(x) {
      var ear = M(new THREE.SphereGeometry(0.058, 14, 14), skinMat, x, 0.02, -0.02);
      ear.scale.set(0.45, 0.85, 0.6);
      headGroup.add(ear);
      var inner = M(new THREE.SphereGeometry(0.035, 10, 10), skinDarkMat, x*0.95, 0.025, 0.0);
      inner.scale.set(0.35, 0.6, 0.25);
      headGroup.add(inner);
      headGroup.add(M(new THREE.SphereGeometry(0.02, 8, 8), skinMat, x, -0.035, 0.0));
    });

    // Hair
    var hairBase = M(new THREE.SphereGeometry(0.30, 32, 32), hairMat, 0, 0.07, 0);
    hairBase.scale.set(1.06, 1.08, 1.02);
    headGroup.add(hairBase);
    var hairTop = M(new THREE.SphereGeometry(0.22, 24, 24), hairMat, 0, 0.25, 0.02);
    hairTop.scale.set(1.2, 0.6, 1.0);
    headGroup.add(hairTop);
    headGroup.add(M(new THREE.BoxGeometry(0.48, 0.10, 0.18), hairMat, 0.04, 0.24, 0.2, -0.25, 0.15, 0.05));
    [-0.22, 0.22].forEach(function(x) {
      headGroup.add(M(new THREE.BoxGeometry(0.08, 0.15, 0.12), hairMat, x, 0.1, 0.12));
    });
    // Side strands
    [-0.25, 0.25].forEach(function(x) {
      for (var s = 0; s < 3; s++) {
        headGroup.add(M(new THREE.CylinderGeometry(0.008, 0.004, 0.12, 4), hairMat,
          x, 0.05-s*0.04, 0.05, 0, 0, x > 0 ? 0.5 : -0.5));
      }
    });

    // ══ EYES ══
    [-0.095, 0.095].forEach(function(x) {
      // Socket
      var sock = M(new THREE.SphereGeometry(0.058, 14, 14), skinDarkMat, x, 0.04, 0.225);
      sock.scale.set(1.2, 0.7, 0.3);
      headGroup.add(sock);
      // Eyeball
      var ew = M(new THREE.SphereGeometry(0.052, 24, 24), eyeWMat, x, 0.04, 0.24);
      ew.scale.set(1.1, 0.88, 0.48);
      headGroup.add(ew);
      // Iris
      headGroup.add(M(new THREE.SphereGeometry(0.034, 20, 20), irisMat, x, 0.04, 0.268));
      // Iris ring
      headGroup.add(M(new THREE.TorusGeometry(0.028, 0.004, 8, 20),
        new THREE.MeshStandardMaterial({ color: 0x2a4580, roughness: 0.2 }), x, 0.04, 0.27));
      // Pupil
      headGroup.add(M(new THREE.SphereGeometry(0.016, 14, 14), pupilMat, x, 0.04, 0.282));
      // Catch lights
      headGroup.add(M(new THREE.SphereGeometry(0.006, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xffffff }), x+0.013, 0.052, 0.287));
      headGroup.add(M(new THREE.SphereGeometry(0.003, 6, 6),
        new THREE.MeshBasicMaterial({ color: 0xffffff }), x-0.005, 0.032, 0.285));
      // Upper eyelid
      var ul = M(new THREE.SphereGeometry(0.055, 14, 14), skinMat, x, 0.065, 0.24);
      ul.scale.set(1.15, 0.35, 0.5);
      headGroup.add(ul);
      // Lower eyelid
      var ll = M(new THREE.SphereGeometry(0.048, 12, 12), skinMat, x, 0.015, 0.245);
      ll.scale.set(1.0, 0.2, 0.4);
      headGroup.add(ll);
      // Eyelash
      headGroup.add(M(new THREE.BoxGeometry(0.08, 0.006, 0.015), lashMat, x, 0.072, 0.26, -0.1, 0, 0));
      // Eyebrow
      headGroup.add(M(new THREE.BoxGeometry(0.09, 0.018, 0.025), hairMat, x, 0.115, 0.24, 0, 0, x>0 ? -0.08 : 0.08));
      headGroup.add(M(new THREE.BoxGeometry(0.04, 0.014, 0.02), hairMat, x*0.6, 0.12, 0.245, 0, 0, x>0 ? 0.15 : -0.15));
    });

    // ══ NOSE ══
    headGroup.add(M(new THREE.CylinderGeometry(0.018, 0.025, 0.08, 8), skinMat, 0, -0.01, 0.28, -0.3, 0, 0));
    headGroup.add(M(new THREE.SphereGeometry(0.025, 14, 14), skinMat, 0, -0.05, 0.3));
    [-0.015, 0.015].forEach(function(x) {
      headGroup.add(M(new THREE.SphereGeometry(0.012, 8, 8), skinDarkMat, x, -0.062, 0.29));
    });
    [-0.022, 0.022].forEach(function(x) {
      headGroup.add(M(new THREE.SphereGeometry(0.016, 10, 10), skinMat, x, -0.05, 0.28));
    });

    // ══ MOUTH ══
    headGroup.add(M(new THREE.BoxGeometry(0.015, 0.025, 0.008), skinDarkMat, 0, -0.075, 0.27));
    headGroup.add(M(new THREE.TorusGeometry(0.042, 0.013, 10, 18, Math.PI), lipMat, 0, -0.09, 0.25, 0.1, 0, 0));
    headGroup.add(M(new THREE.TorusGeometry(0.038, 0.016, 10, 18, Math.PI), lipMat, 0, -0.098, 0.248, Math.PI+0.2, 0, 0));
    [-0.042, 0.042].forEach(function(x) {
      headGroup.add(M(new THREE.SphereGeometry(0.006, 6, 6), skinDarkMat, x, -0.092, 0.24));
    });
    [-0.06, 0.06].forEach(function(x) {
      headGroup.add(M(new THREE.CylinderGeometry(0.004, 0.003, 0.08, 4), skinDarkMat, x, -0.05, 0.24, 0, 0, x>0 ? -0.25 : 0.25));
    });

    // ═══ HEADPHONES ═══
    var headband = M(new THREE.TorusGeometry(0.32, 0.018, 10, 32, Math.PI), hpMat, 0, 0.15, -0.02);
    headGroup.add(headband);
    var hbPad = M(new THREE.TorusGeometry(0.31, 0.012, 8, 24, Math.PI*0.7), hpCushMat, 0, 0.2, -0.02);
    headGroup.add(hbPad);

    [-0.30, 0.30].forEach(function(x) {
      var cup = M(new THREE.CylinderGeometry(0.1, 0.1, 0.06, 20), hpMat, x, 0, -0.02, 0, 0, Math.PI/2);
      headGroup.add(cup);
      var ring = M(new THREE.TorusGeometry(0.08, 0.006, 8, 20), hpAccMat, x > 0 ? x+0.03 : x-0.03, 0, -0.02, 0, 0, Math.PI/2);
      headGroup.add(ring);
      var cush = M(new THREE.CylinderGeometry(0.085, 0.085, 0.025, 20), hpCushMat, x > 0 ? x-0.02 : x+0.02, 0, -0.02, 0, 0, Math.PI/2);
      headGroup.add(cush);
      var spk = M(new THREE.CircleGeometry(0.06, 16),
        new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.9 }),
        x > 0 ? x-0.035 : x+0.035, 0, -0.02, 0, x > 0 ? -Math.PI/2 : Math.PI/2, 0);
      headGroup.add(spk);
      headGroup.add(M(new THREE.BoxGeometry(0.012, 0.08, 0.015), hpMat, x > 0 ? x-0.01 : x+0.01, 0.1, -0.02));
    });

    char.add(headGroup);

    // ═══ ARMS ═══
    var uArmGeo = new THREE.CylinderGeometry(0.085, 0.07, 0.48, 14);
    var lArmGeo = new THREE.CylinderGeometry(0.055, 0.048, 0.42, 14);

    function makeHand(parent) {
      var palm = M(new THREE.BoxGeometry(0.08, 0.06, 0.1), skinMat, 0, -0.44, 0);
      parent.add(palm);
      // Thumb
      parent.add(M(new THREE.CylinderGeometry(0.014, 0.012, 0.07, 6), skinMat, 0.05, -0.43, 0.02, 0, 0, -0.6));
      parent.add(M(new THREE.SphereGeometry(0.013, 8, 8), skinMat, 0.08, -0.42, 0.02));
      parent.add(M(new THREE.SphereGeometry(0.007, 6, 6), nailMat, 0.085, -0.415, 0.03));
      // Fingers
      for (var f = 0; f < 4; f++) {
        var fX = -0.025 + f * 0.02;
        parent.add(M(new THREE.CylinderGeometry(0.011, 0.01, 0.04, 6), skinMat, fX, -0.48, 0.04, 0.2, 0, 0));
        parent.add(M(new THREE.CylinderGeometry(0.009, 0.008, 0.03, 6), skinMat, fX, -0.505, 0.06, 0.35, 0, 0));
        parent.add(M(new THREE.SphereGeometry(0.011, 6, 6), skinMat, fX, -0.47, 0.035));
        parent.add(M(new THREE.SphereGeometry(0.009, 6, 6), skinMat, fX, -0.52, 0.075));
        parent.add(M(new THREE.SphereGeometry(0.005, 4, 4), nailMat, fX, -0.522, 0.082));
      }
    }

    // Right arm
    var rShoulder = new THREE.Group();
    rShoulder.position.set(-0.40, 0.35, 0);
    rShoulder.add(M(uArmGeo, hoodieMat, 0, -0.24, 0));
    rShoulder.add(M(new THREE.TorusGeometry(0.055, 0.018, 8, 14), hoodieAccentMat, 0, -0.47, 0, Math.PI/2, 0, 0));
    var rElbow = new THREE.Group();
    rElbow.position.y = -0.48;
    rElbow.add(M(lArmGeo, hoodieMat, 0, -0.21, 0));
    rElbow.add(M(new THREE.TorusGeometry(0.048, 0.015, 8, 12), hoodieAccentMat, 0, -0.40, 0, Math.PI/2, 0, 0));
    makeHand(rElbow);
    rShoulder.add(rElbow);
    char.add(rShoulder);

    // Left arm
    var lShoulder = new THREE.Group();
    lShoulder.position.set(0.40, 0.35, 0);
    lShoulder.add(M(uArmGeo, hoodieMat, 0, -0.24, 0));
    lShoulder.add(M(new THREE.TorusGeometry(0.055, 0.018, 8, 14), hoodieAccentMat, 0, -0.47, 0, Math.PI/2, 0, 0));
    var lElbow = new THREE.Group();
    lElbow.position.y = -0.48;
    lElbow.add(M(lArmGeo, hoodieMat, 0, -0.21, 0));
    lElbow.add(M(new THREE.TorusGeometry(0.048, 0.015, 8, 12), hoodieAccentMat, 0, -0.40, 0, Math.PI/2, 0, 0));
    makeHand(lElbow);
    lShoulder.add(lElbow);
    char.add(lShoulder);

    // Belt
    char.add(M(new THREE.TorusGeometry(0.25, 0.025, 6, 20),
      new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.3, metalness: 0.4 }), 0, -0.5, 0, Math.PI/2, 0, 0));
    char.add(M(new THREE.BoxGeometry(0.05, 0.04, 0.02),
      new THREE.MeshStandardMaterial({ color: 0xc0c0c0, metalness: 0.8, roughness: 0.2 }), 0, -0.5, 0.26));

    // ═══ BAGGY PANTS ═══
    char.add(M(new THREE.CylinderGeometry(0.28, 0.25, 0.22, 20), pantsMat, 0, -0.64, 0));

    function makeLeg(xPos) {
      var hip = new THREE.Group();
      hip.position.set(xPos, -0.8, 0);
      // Upper leg
      hip.add(M(new THREE.CylinderGeometry(0.11, 0.095, 0.52, 16), pantsMat, 0, -0.26, 0));
      // Wrinkles
      for (var w = 0; w < 3; w++) {
        var wr = M(new THREE.TorusGeometry(0.1-w*0.005, 0.004, 4, 16, Math.PI*0.6), pantsCreaseMat,
          0.02, -0.15-w*0.12, 0.06, 0.1, 0.2, 0.1);
        hip.add(wr);
      }
      var knee = new THREE.Group();
      knee.position.y = -0.52;
      var kneeBulge = M(new THREE.SphereGeometry(0.085, 12, 12), pantsMat, 0, 0, 0.03);
      kneeBulge.scale.set(1, 0.5, 1);
      knee.add(kneeBulge);
      knee.add(M(new THREE.CylinderGeometry(0.09, 0.075, 0.48, 16), pantsMat, 0, -0.24, 0));
      for (var w = 0; w < 2; w++) {
        knee.add(M(new THREE.TorusGeometry(0.08, 0.003, 4, 14, Math.PI*0.5), pantsCreaseMat,
          0.01, -0.1-w*0.15, 0.05, 0.15, 0.1, 0));
      }
      // Cuffs
      knee.add(M(new THREE.TorusGeometry(0.076, 0.012, 6, 16), pantsCreaseMat, 0, -0.46, 0, Math.PI/2, 0, 0));
      knee.add(M(new THREE.TorusGeometry(0.078, 0.008, 6, 16), pantsMat, 0, -0.44, 0, Math.PI/2, 0, 0));
      // Shoe
      knee.add(M(new THREE.BoxGeometry(0.14, 0.1, 0.26), shoeMat, 0, -0.52, 0.03));
      knee.add(M(new THREE.BoxGeometry(0.15, 0.03, 0.28), soleMat, 0, -0.575, 0.03));
      var toe = M(new THREE.SphereGeometry(0.07, 12, 12), shoeMat, 0, -0.52, 0.15);
      toe.scale.set(1, 0.5, 0.8);
      knee.add(toe);
      knee.add(M(new THREE.BoxGeometry(0.15, 0.015, 0.01), hpAccMat, 0, -0.50, 0.16));
      hip.add(knee);
      hip._knee = knee;
      return hip;
    }

    var rHip = makeLeg(-0.13);
    var lHip = makeLeg(0.13);
    char.add(rHip);
    char.add(lHip);

    char.position.set(-9, 2, 0);
    scene.add(char);

    // ═══ HOLOGRAPHIC PANEL ═══
    var panelGroup = new THREE.Group();
    var panelMesh = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 3),
      new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.5,
        roughness: 0.05, emissive: 0x8b5cf6, emissiveIntensity: 0.08, side: THREE.DoubleSide }));
    panelGroup.add(panelMesh);
    panelGroup.add(new THREE.LineSegments(new THREE.EdgesGeometry(panelMesh.geometry),
      new THREE.LineBasicMaterial({ color: 0x8b5cf6, transparent: true, opacity: 0.4 })));

    var tc = document.createElement("canvas");
    tc.width = 1200; tc.height = 660;
    var ctx = tc.getContext("2d");
    ctx.fillStyle = "rgba(255,255,255,0.6)"; ctx.fillRect(0, 0, 1200, 660);
    ctx.fillStyle = "#4f46e5"; ctx.font = "bold 90px 'Segoe UI', sans-serif"; ctx.textAlign = "center";
    ctx.fillText("ULTRADIAN", 600, 220);
    var grad = ctx.createLinearGradient(350, 0, 850, 0);
    grad.addColorStop(0, "#4f46e5"); grad.addColorStop(1, "#9333ea");
    ctx.strokeStyle = grad; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(370, 270); ctx.lineTo(830, 270); ctx.stroke();
    ctx.fillStyle = "#475569"; ctx.font = "36px 'Segoe UI', sans-serif";
    ctx.fillText("Your life, optimized.", 600, 360);
    var texMesh = M(new THREE.PlaneGeometry(5.5, 3),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(tc), transparent: true }), 0, 0, 0.02);
    panelGroup.add(texMesh);
    panelGroup.position.set(0, 9, 0);
    scene.add(panelGroup);

    // ═══ SHATTER FRAGMENTS ═══
    var fragCount = 60;
    var fragGeo = new THREE.BufferGeometry();
    var fragPos = new Float32Array(fragCount * 3);
    var fragVel = [];
    for (var i = 0; i < fragCount; i++) { fragPos[i*3]=0; fragPos[i*3+1]=9; fragPos[i*3+2]=0; fragVel.push({x:0,y:0,z:0}); }
    fragGeo.setAttribute('position', new THREE.BufferAttribute(fragPos, 3));
    var fragMat = new THREE.PointsMaterial({ color: 0x8b5cf6, size: 0.1, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false });
    scene.add(new THREE.Points(fragGeo, fragMat));
    var fragActive = false;

    // ═══ WALK CYCLE ═══
    var walkOn = false, walkSpeed = 4.5;
    function doWalk(t) {
      if (!walkOn) return;
      var s = t * walkSpeed, cycle = Math.sin(s), cycleAbs = Math.abs(cycle);
      char.position.y = 2 + cycleAbs * 0.06;
      rHip.rotation.x = Math.sin(s) * 0.45;
      lHip.rotation.x = Math.sin(s + Math.PI) * 0.45;
      var rP = Math.sin(s), lP = Math.sin(s + Math.PI);
      rHip._knee.rotation.x = rP < 0 ? Math.abs(rP) * 0.7 : rP * 0.1;
      lHip._knee.rotation.x = lP < 0 ? Math.abs(lP) * 0.7 : lP * 0.1;
      rShoulder.rotation.x = Math.sin(s + Math.PI) * 0.3;
      lShoulder.rotation.x = Math.sin(s) * 0.3;
      rElbow.rotation.x = -0.15 - Math.abs(Math.sin(s + Math.PI)) * 0.15;
      lElbow.rotation.x = -0.15 - Math.abs(Math.sin(s)) * 0.15;
      torso.rotation.y = Math.sin(s) * 0.04;
      torso.rotation.z = Math.sin(s * 0.5) * 0.015;
      headGroup.position.y = 0.93 + cycleAbs * 0.015;
      headGroup.rotation.z = Math.sin(s * 0.5) * 0.02;
      emitTrail(char.position.x - 0.2, 0.3, char.position.z);
    }

    function doLandingImpact() {
      gsap.to(cameraShake, { x: 0.08, duration: 0.05, yoyo: true, repeat: 3, ease: "power4.out",
        onComplete: function() { cameraShake.x=0; cameraShake.y=0; } });
      gsap.to(cameraShake, { y: -0.06, duration: 0.06, yoyo: true, repeat: 2, ease: "power4.out" });
      ripple.scale.set(0.5,0.5,0.5); rippleMat.opacity = 0.6;
      gsap.to(ripple.scale, { x:10, y:10, z:10, duration: 1.2, ease: "power2.out" });
      gsap.to(rippleMat, { opacity: 0, duration: 1.2, ease: "power2.out" });
      gsap.to(accentLight, { intensity: 5, duration: 0.15, yoyo: true, repeat: 1 });
    }

    function shatterPanel() {
      fragActive = true; fragMat.opacity = 0.8;
      var fp = fragGeo.attributes.position.array;
      for (var i = 0; i < fragCount; i++) {
        fp[i*3] = panelGroup.position.x+(Math.random()-0.5)*5;
        fp[i*3+1] = panelGroup.position.y+(Math.random()-0.5)*3;
        fp[i*3+2] = (Math.random()-0.5)*0.5;
        fragVel[i] = { x:(Math.random()-0.5)*0.12, y:(Math.random()-0.5)*0.1, z:Math.random()*0.1+0.02 };
      }
      fragGeo.attributes.position.needsUpdate = true;
      gsap.to(panelGroup.scale, { x:0, y:0, z:0, duration: 0.25, ease: "power4.in" });
      gsap.to(fragMat, { opacity:0, duration:2.0, delay:0.3, ease:"power2.out",
        onComplete: function() { fragActive=false; } });
    }

    function resetPose() {
      walkOn = false; trailActive = false; char.position.y = 2;
      gsap.to(rHip.rotation, { x:0, duration:0.25 });
      gsap.to(lHip.rotation, { x:0, duration:0.25 });
      gsap.to(rHip._knee.rotation, { x:0, duration:0.25 });
      gsap.to(lHip._knee.rotation, { x:0, duration:0.25 });
      gsap.to(rShoulder.rotation, { x:0, duration:0.25 });
      gsap.to(lShoulder.rotation, { x:0, duration:0.25 });
      gsap.to(rElbow.rotation, { x:0, duration:0.25 });
      gsap.to(lElbow.rotation, { x:0, duration:0.25 });
      gsap.to(torso.rotation, { y:0, z:0, duration:0.25 });
    }

    // ═══ TIMELINE ═══
    var tl = gsap.timeline({ delay: 0.3 });
    tl.to(camera.position, { z: isMobile ? 8.5 : 6.5, y: isMobile ? 2.8 : 2.2, duration: 2.8, ease: "power2.out" }, 0);
    tl.call(function() { walkOn = true; trailActive = true; }, null, 0.5);
    tl.to(char.position, { x: 0, duration: 2.5, ease: "power2.out" }, 0.5);
    tl.call(function() { resetPose(); doLandingImpact(); }, null, 3.0);
    // Wave
    tl.to(rShoulder.rotation, { z: -2.2, duration: 0.45, ease: "back.out(1.5)" }, 3.5);
    tl.to(rElbow.rotation, { x: -0.8, duration: 0.3 }, 3.6);
    tl.to(rElbow.rotation, { z: 0.4, duration: 0.18, yoyo: true, repeat: 3 }, 3.9);
    tl.to(headGroup.rotation, { z: 0.08, duration: 0.2, yoyo: true, repeat: 2 }, 3.9);
    // Reach up
    tl.to(rShoulder.rotation, { z: -3.0, x: 0.3, duration: 0.5, ease: "power2.inOut" }, 5.2);
    tl.to(rElbow.rotation, { x: 0, z: 0, duration: 0.35 }, 5.2);
    // Pull panel down
    tl.to(panelGroup.position, { y: 2.4, duration: 1.3, ease: "elastic.out(1, 0.45)" }, 5.8);
    tl.to(rShoulder.rotation, { z: -1.5, x: 0, duration: 1.0, ease: "power2.out" }, 5.8);
    tl.to(accentLight, { intensity: 4, duration: 0.3, yoyo: true, repeat: 1 }, 5.8);
    // Reset arm
    tl.to(rShoulder.rotation, { z: 0, x: 0, duration: 0.4, ease: "power2.out" }, 7.5);
    tl.to(rElbow.rotation, { x: 0, z: 0, duration: 0.3 }, 7.5);
    tl.to(headGroup.rotation, { y: 0, z: 0, x: 0.15, duration: 0.3 }, 7.5);
    // Swipe to shatter
    tl.to(rShoulder.rotation, { z: -1.5, x: 0.5, duration: 0.2, ease: "power4.out" }, 8.2);
    tl.to(rShoulder.rotation, { z: 1.2, x: -0.3, duration: 0.2, ease: "power4.in" }, 8.4);
    tl.call(shatterPanel, null, 8.5);
    tl.to(rShoulder.rotation, { z: 0, x: 0, duration: 0.3 }, 8.6);
    tl.to(headGroup.rotation, { y: 0.2, x: 0, duration: 0.3 }, 8.6);
    // Show UI card
    tl.call(function() {
      var ui = document.getElementById('welcome-ui-overlay');
      if (ui) ui.classList.add('visible');
    }, null, 8.5);
    tl.to(camera.position, { y: 2.5, z: isMobile ? 7.5 : 5.5, x: 0, duration: 1.5, ease: "power2.inOut" }, 8.5);
    // Walk out
    tl.call(function() { walkOn = true; trailActive = true; }, null, 9.2);
    tl.to(char.position, { x: 14, duration: 3.0, ease: "power2.in" }, 9.2);
    tl.call(function() { walkOn = false; trailActive = false; }, null, 12.2);

    // ═══ RENDER LOOP ═══
    var clk = new THREE.Clock();
    function loop() {
      requestAnimationFrame(loop);
      var t = clk.getElapsedTime();
      doWalk(t);
      updateTrail();
      var pa = pGeo.attributes.position.array;
      for (var i = 1; i < pa.length; i += 3) pa[i] += Math.sin(t*0.8+i)*0.0008;
      pGeo.attributes.position.needsUpdate = true;
      if (fragActive) {
        var fp = fragGeo.attributes.position.array;
        for (var i = 0; i < fragCount; i++) {
          fp[i*3]+=fragVel[i].x; fp[i*3+1]+=fragVel[i].y; fp[i*3+2]+=fragVel[i].z;
          fragVel[i].y-=0.001;
        }
        fragGeo.attributes.position.needsUpdate = true;
      }
      camera.position.x += cameraShake.x;
      camera.position.y += cameraShake.y + Math.sin(t*0.6)*0.0008;
      if (panelGroup.position.y < 5 && panelGroup.scale.x > 0.5) {
        panelGroup.position.y += Math.sin(t*1.2)*0.0008;
        panelGroup.rotation.y = Math.sin(t*0.4)*0.015;
      }
      renderer.render(scene, camera);
    }
    loop();

    window.addEventListener("resize", function() {
      var w = container.clientWidth, h = container.clientHeight;
      camera.aspect = w/h; camera.updateProjectionMatrix(); renderer.setSize(w, h);
    });
  }

  var obs = new MutationObserver(function() {
    if (!overlay.classList.contains('hidden')) { init(); obs.disconnect(); }
  });
  obs.observe(overlay, { attributes: true, attributeFilter: ['class'] });
  if (!overlay.classList.contains('hidden')) init();
})();
