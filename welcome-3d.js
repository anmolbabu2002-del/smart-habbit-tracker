// welcome-3d.js — Premium Light-Theme 3D Welcome Scene
(function () {
  var overlay = document.getElementById('name-registration-overlay');
  var container = document.getElementById('welcome-3d-canvas');
  if (!overlay || !container) return;
  var started = false;

  function init() {
    if (started) return;
    started = true;

    var W = container.clientWidth, H = container.clientHeight;
    var scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f2f8);
    scene.fog = new THREE.FogExp2(0xf0f2f8, 0.035);

    var isMobile = W < H;
    var camera = new THREE.PerspectiveCamera(isMobile ? 60 : 50, W / H, 0.1, 100);
    camera.position.set(0, isMobile ? 2.8 : 2.5, isMobile ? 12 : 10);

    var renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    container.appendChild(renderer.domElement);

    // ═══ PREMIUM LIGHTING (bright, warm, cinematic) ═══
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));

    var keyLight = new THREE.DirectionalLight(0xfff5e6, 1.8);
    keyLight.position.set(5, 12, 8);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(2048, 2048);
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 30;
    keyLight.shadow.camera.left = -8;
    keyLight.shadow.camera.right = 8;
    keyLight.shadow.camera.top = 8;
    keyLight.shadow.camera.bottom = -8;
    keyLight.shadow.bias = -0.0001;
    scene.add(keyLight);

    var rimLight = new THREE.DirectionalLight(0x99bbff, 0.6);
    rimLight.position.set(-5, 8, -5);
    scene.add(rimLight);

    var fillLight = new THREE.PointLight(0x8b5cf6, 1.2, 15);
    fillLight.position.set(2, 3, 5);
    scene.add(fillLight);

    var accentLight = new THREE.PointLight(0x667eea, 1.5, 10);
    accentLight.position.set(0, 3, 0);
    scene.add(accentLight);

    // Hemispheric light for natural sky feel
    scene.add(new THREE.HemisphereLight(0xddeeff, 0xc8c8d0, 0.5));

    // ═══ GROUND (light reflective) ═══
    var gnd = new THREE.Mesh(
      new THREE.PlaneGeometry(80, 80),
      new THREE.MeshStandardMaterial({ color: 0xe8eaf0, metalness: 0.15, roughness: 0.6 })
    );
    gnd.rotation.x = -Math.PI / 2;
    gnd.receiveShadow = true;
    scene.add(gnd);

    // Subtle grid
    var grid = new THREE.GridHelper(40, 80, 0xd0d4e0, 0xe0e2ea);
    grid.position.y = 0.01;
    grid.material.opacity = 0.4;
    grid.material.transparent = true;
    scene.add(grid);

    // ═══ FLOATING PARTICLES (light sparkles) ═══
    var pCount = 200;
    var pGeo = new THREE.BufferGeometry();
    var pPos = new Float32Array(pCount * 3);
    for (var i = 0; i < pCount; i++) {
      pPos[i * 3] = (Math.random() - 0.5) * 25;
      pPos[i * 3 + 1] = Math.random() * 8 + 0.5;
      pPos[i * 3 + 2] = (Math.random() - 0.5) * 25;
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    scene.add(new THREE.Points(pGeo, new THREE.PointsMaterial({
      color: 0x8b5cf6, size: 0.035, transparent: true, opacity: 0.35,
      blending: THREE.AdditiveBlending, depthWrite: false
    })));

    // ═══ ADVANCED CHARACTER (highly detailed) ═══
    var skinMat = new THREE.MeshStandardMaterial({ color: 0xf0c8a0, roughness: 0.45, metalness: 0.02 });
    var hairMat = new THREE.MeshStandardMaterial({ color: 0x1a0e08, roughness: 0.85, metalness: 0.05 });
    var shirtMat = new THREE.MeshStandardMaterial({ color: 0x4f46e5, roughness: 0.35, metalness: 0.08 });
    var collarMat = new THREE.MeshStandardMaterial({ color: 0x3730a3, roughness: 0.4 });
    var pantsMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.55 });
    var shoeMat = new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.3, metalness: 0.2 });
    var soleMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 });

    var char = new THREE.Group();

    // ── Torso (tapered, detailed) ──
    var torso = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.25, 1.05, 20), shirtMat);
    torso.castShadow = true;
    char.add(torso);

    // Collar detail
    var collar = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.04, 8, 20, Math.PI * 2), collarMat);
    collar.position.set(0, 0.5, 0);
    collar.rotation.x = Math.PI / 2;
    char.add(collar);

    // ── Neck ──
    var neck = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.18, 16), skinMat);
    neck.position.y = 0.62;
    neck.castShadow = true;
    char.add(neck);

    // ── Head (detailed) ──
    var headGroup = new THREE.Group();
    headGroup.position.y = 0.90;

    // Head shape (slightly elongated sphere)
    var head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 40, 40), skinMat);
    head.scale.set(1, 1.12, 0.92);
    head.castShadow = true;
    headGroup.add(head);

    // Jaw definition
    var jaw = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 20), skinMat);
    jaw.scale.set(0.85, 0.5, 0.75);
    jaw.position.set(0, -0.15, 0.05);
    headGroup.add(jaw);

    // Ears
    [-0.26, 0.26].forEach(function(x) {
      var ear = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 12), skinMat);
      ear.scale.set(0.5, 0.8, 0.6);
      ear.position.set(x, 0.02, -0.02);
      headGroup.add(ear);
    });

    // Hair (layered, volumetric)
    var hairBase = new THREE.Mesh(new THREE.SphereGeometry(0.30, 32, 32), hairMat);
    hairBase.scale.set(1.06, 1.08, 1.02);
    hairBase.position.y = 0.07;
    headGroup.add(hairBase);

    // Hair top volume
    var hairTop = new THREE.Mesh(new THREE.SphereGeometry(0.22, 24, 24), hairMat);
    hairTop.scale.set(1.2, 0.6, 1.0);
    hairTop.position.set(0, 0.25, 0.02);
    headGroup.add(hairTop);

    // Styled fringe (swept)
    var fringe = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.10, 0.18), hairMat);
    fringe.position.set(0.04, 0.24, 0.2);
    fringe.rotation.set(-0.25, 0.15, 0.05);
    headGroup.add(fringe);

    // Side hair
    [-0.22, 0.22].forEach(function(x) {
      var side = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.15, 0.12), hairMat);
      side.position.set(x, 0.1, 0.12);
      headGroup.add(side);
    });

    // Eyes (detailed with iris)
    var eyeWhiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.1, metalness: 0 });
    var irisMat = new THREE.MeshStandardMaterial({ color: 0x3b5998, roughness: 0.2, metalness: 0.1 });
    var pupilMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.05 });

    [-0.095, 0.095].forEach(function(x) {
      // Eye white
      var ew = new THREE.Mesh(new THREE.SphereGeometry(0.052, 20, 20), eyeWhiteMat);
      ew.scale.set(1.1, 0.85, 0.45);
      ew.position.set(x, 0.04, 0.24);
      headGroup.add(ew);
      // Iris
      var iris = new THREE.Mesh(new THREE.SphereGeometry(0.032, 16, 16), irisMat);
      iris.position.set(x, 0.04, 0.268);
      headGroup.add(iris);
      // Pupil
      var pupil = new THREE.Mesh(new THREE.SphereGeometry(0.016, 12, 12), pupilMat);
      pupil.position.set(x, 0.04, 0.28);
      headGroup.add(pupil);
      // Highlight
      var hl = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xffffff }));
      hl.position.set(x + 0.012, 0.052, 0.285);
      headGroup.add(hl);
      // Eyebrow
      var brow = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.02, 0.03), hairMat);
      brow.position.set(x, 0.11, 0.24);
      brow.rotation.z = x > 0 ? -0.08 : 0.08;
      headGroup.add(brow);
    });

    // Nose
    var nose = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.03, 0.07, 8), skinMat);
    nose.position.set(0, -0.02, 0.28);
    nose.rotation.x = -0.3;
    headGroup.add(nose);

    // Lips
    var upperLip = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.012, 8, 16, Math.PI), 
      new THREE.MeshStandardMaterial({ color: 0xd4957a, roughness: 0.5 }));
    upperLip.position.set(0, -0.09, 0.25);
    upperLip.rotation.x = 0.1;
    headGroup.add(upperLip);

    var lowerLip = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.014, 8, 16, Math.PI),
      new THREE.MeshStandardMaterial({ color: 0xd4957a, roughness: 0.5 }));
    lowerLip.position.set(0, -0.095, 0.245);
    lowerLip.rotation.set(Math.PI + 0.2, 0, 0);
    headGroup.add(lowerLip);

    char.add(headGroup);

    // ── Arms (with sleeve detail) ──
    var upperArmGeo = new THREE.CylinderGeometry(0.065, 0.055, 0.48, 14);
    var lowerArmGeo = new THREE.CylinderGeometry(0.05, 0.045, 0.42, 14);
    var handGeo = new THREE.SphereGeometry(0.06, 18, 18);

    // Right arm
    var rShoulder = new THREE.Group();
    rShoulder.position.set(-0.36, 0.35, 0);
    var rUpperArm = new THREE.Mesh(upperArmGeo, shirtMat);
    rUpperArm.position.y = -0.24; rUpperArm.castShadow = true;
    rShoulder.add(rUpperArm);
    // Sleeve cuff
    var rCuff = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.012, 6, 14, Math.PI * 2), shirtMat);
    rCuff.position.y = -0.45; rCuff.rotation.x = Math.PI / 2;
    rShoulder.add(rCuff);
    var rElbow = new THREE.Group();
    rElbow.position.y = -0.48;
    var rForearm = new THREE.Mesh(lowerArmGeo, skinMat);
    rForearm.position.y = -0.21; rForearm.castShadow = true;
    rElbow.add(rForearm);
    var rHand = new THREE.Mesh(handGeo, skinMat);
    rHand.position.y = -0.44; rHand.scale.set(1, 0.75, 0.55);
    rHand.castShadow = true;
    rElbow.add(rHand);
    // Fingers hint
    for (var f = 0; f < 4; f++) {
      var finger = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.008, 0.06, 6), skinMat);
      finger.position.set(-0.02 + f * 0.014, -0.48, 0.02);
      finger.rotation.x = 0.3;
      rElbow.add(finger);
    }
    rShoulder.add(rElbow);
    char.add(rShoulder);

    // Left arm
    var lShoulder = new THREE.Group();
    lShoulder.position.set(0.36, 0.35, 0);
    var lUpperArm = new THREE.Mesh(upperArmGeo, shirtMat);
    lUpperArm.position.y = -0.24; lUpperArm.castShadow = true;
    lShoulder.add(lUpperArm);
    var lCuff = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.012, 6, 14, Math.PI * 2), shirtMat);
    lCuff.position.y = -0.45; lCuff.rotation.x = Math.PI / 2;
    lShoulder.add(lCuff);
    var lElbow = new THREE.Group();
    lElbow.position.y = -0.48;
    var lForearm = new THREE.Mesh(lowerArmGeo, skinMat);
    lForearm.position.y = -0.21; lForearm.castShadow = true;
    lElbow.add(lForearm);
    var lHand = new THREE.Mesh(handGeo, skinMat);
    lHand.position.y = -0.44; lHand.scale.set(1, 0.75, 0.55);
    lElbow.add(lHand);
    lShoulder.add(lElbow);
    char.add(lShoulder);

    // ── Belt ──
    var belt = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.025, 6, 20, Math.PI * 2),
      new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.3, metalness: 0.4 }));
    belt.position.y = -0.48; belt.rotation.x = Math.PI / 2;
    char.add(belt);

    // Belt buckle
    var buckle = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 0.02),
      new THREE.MeshStandardMaterial({ color: 0xc0c0c0, metalness: 0.8, roughness: 0.2 }));
    buckle.position.set(0, -0.48, 0.26);
    char.add(buckle);

    // ── Hips + Legs (detailed) ──
    var hips = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.23, 0.22, 18), pantsMat);
    hips.position.y = -0.62;
    hips.castShadow = true;
    char.add(hips);

    var upperLegGeo = new THREE.CylinderGeometry(0.095, 0.075, 0.52, 14);
    var lowerLegGeo = new THREE.CylinderGeometry(0.07, 0.065, 0.48, 14);

    function makeLeg(xPos) {
      var hip = new THREE.Group();
      hip.position.set(xPos, -0.78, 0);
      var ul = new THREE.Mesh(upperLegGeo, pantsMat);
      ul.position.y = -0.26; ul.castShadow = true;
      hip.add(ul);
      var knee = new THREE.Group();
      knee.position.y = -0.52;
      var ll = new THREE.Mesh(lowerLegGeo, pantsMat);
      ll.position.y = -0.24; ll.castShadow = true;
      knee.add(ll);
      // Shoe (detailed)
      var shoeBody = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.09, 0.24), shoeMat);
      shoeBody.position.set(0, -0.50, 0.03);
      shoeBody.castShadow = true;
      knee.add(shoeBody);
      // Sole
      var sole = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.03, 0.26), soleMat);
      sole.position.set(0, -0.555, 0.03);
      knee.add(sole);
      // Shoe toe curve
      var toe = new THREE.Mesh(new THREE.SphereGeometry(0.065, 12, 12), shoeMat);
      toe.scale.set(1, 0.5, 0.8);
      toe.position.set(0, -0.50, 0.14);
      knee.add(toe);
      hip.add(knee);
      return hip;
    }

    var rHip = makeLeg(-0.12);
    var lHip = makeLeg(0.12);
    char.add(rHip);
    char.add(lHip);

    char.position.set(-9, 2, 0);
    scene.add(char);

    // ═══ HOLOGRAPHIC PANEL (light theme) ═══
    var panelGroup = new THREE.Group();

    var panelMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(5.5, 3),
      new THREE.MeshPhysicalMaterial({
        color: 0xffffff, transparent: true, opacity: 0.5,
        roughness: 0.05, metalness: 0.0,
        emissive: 0x8b5cf6, emissiveIntensity: 0.08,
        side: THREE.DoubleSide
      })
    );
    panelMesh.castShadow = true;
    panelGroup.add(panelMesh);

    // Panel glow border
    var borderMat = new THREE.LineBasicMaterial({ color: 0x8b5cf6, transparent: true, opacity: 0.4 });
    panelGroup.add(new THREE.LineSegments(new THREE.EdgesGeometry(panelMesh.geometry), borderMat));

    // Canvas text
    var tc = document.createElement("canvas");
    tc.width = 1200; tc.height = 660;
    var ctx = tc.getContext("2d");
    // Frosted bg
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.fillRect(0, 0, 1200, 660);
    // Title
    ctx.fillStyle = "#4f46e5";
    ctx.font = "bold 90px 'Segoe UI', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("ULTRADIAN", 600, 220);
    // Gradient line
    var grad = ctx.createLinearGradient(350, 0, 850, 0);
    grad.addColorStop(0, "#4f46e5");
    grad.addColorStop(1, "#9333ea");
    ctx.strokeStyle = grad;
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(370, 270); ctx.lineTo(830, 270); ctx.stroke();
    // Subtitle
    ctx.fillStyle = "#475569";
    ctx.font = "36px 'Segoe UI', sans-serif";
    ctx.fillText("A productivity app that deserves", 600, 340);
    ctx.fillText("to be in your device", 600, 390);
    // Features hint
    ctx.fillStyle = "#8b5cf6";
    ctx.font = "28px 'Segoe UI', sans-serif";
    ctx.fillText("🎯 Focus  ·  🏆 Streaks  ·  🌍 Ecosystem", 600, 480);

    var textPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(5.5, 3),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(tc), transparent: true })
    );
    textPlane.position.z = 0.02;
    panelGroup.add(textPlane);
    panelGroup.position.set(0, 9, 0);
    scene.add(panelGroup);

    // ═══ WALK CYCLE ═══
    var walkOn = false;
    function doWalk(t) {
      if (!walkOn) return;
      var s = t * 5.5;
      char.position.y = 2 + Math.abs(Math.sin(s)) * 0.10;
      rHip.rotation.x = Math.sin(s) * 0.55;
      lHip.rotation.x = Math.sin(s + Math.PI) * 0.55;
      lShoulder.rotation.x = Math.sin(s) * 0.35;
      torso.rotation.y = Math.sin(s) * 0.04;
      headGroup.rotation.z = Math.sin(s * 0.5) * 0.025;
    }

    // ═══ GSAP TIMELINE ═══
    var tl = gsap.timeline({ delay: 0.5 });

    // Camera swoop
    tl.to(camera.position, { z: 6.5, y: 2.2, duration: 2.5, ease: "power2.out" });

    // Walk in
    tl.call(function () { walkOn = true; }, null, 0.2);
    tl.to(char.position, { x: 0, duration: 2.6, ease: "power2.out" }, 0.3);
    tl.call(function () { walkOn = false; char.position.y = 2; }, null, 2.9);
    tl.to(rHip.rotation, { x: 0, duration: 0.3 }, 2.9);
    tl.to(lHip.rotation, { x: 0, duration: 0.3 }, 2.9);
    tl.to(lShoulder.rotation, { x: 0, duration: 0.3 }, 2.9);

    // Wave hello
    tl.to(rShoulder.rotation, { z: -2.2, duration: 0.5, ease: "back.out(1.5)" }, 3.2);
    tl.to(rElbow.rotation, { x: -0.8, duration: 0.3 }, 3.3);
    tl.to(rElbow.rotation, { z: 0.4, duration: 0.2, yoyo: true, repeat: 4 }, 3.6);
    tl.to(headGroup.rotation, { z: 0.08, duration: 0.25, yoyo: true, repeat: 2 }, 3.6);

    // Reach up
    tl.to(rShoulder.rotation, { z: -3.0, x: 0.3, duration: 0.6, ease: "power2.inOut" }, 5.2);
    tl.to(rElbow.rotation, { x: 0, z: 0, duration: 0.4 }, 5.2);

    // Pull panel down!
    tl.to(panelGroup.position, { y: 2.4, duration: 1.6, ease: "elastic.out(1, 0.45)" }, 5.9);
    tl.to(rShoulder.rotation, { z: -1.5, x: 0, duration: 1.2, ease: "power2.out" }, 5.9);
    tl.to(accentLight, { intensity: 5, duration: 0.4, yoyo: true, repeat: 1 }, 5.9);
    tl.to(fillLight, { intensity: 3.5, duration: 0.5, yoyo: true, repeat: 1 }, 6.0);

    // Relax, look at camera
    tl.to(rShoulder.rotation, { z: 0, x: 0, duration: 0.6, ease: "power2.out" }, 7.8);
    tl.to(rElbow.rotation, { x: 0, z: 0, duration: 0.4 }, 7.8);
    tl.to(headGroup.rotation, { y: 0.25, z: 0, duration: 0.5 }, 7.8);

    // Camera refocus
    tl.to(camera.position, { y: 2.5, z: 5.5, x: 0, duration: 1.5, ease: "power2.inOut" }, 8.0);

    // Walk away (to the right, no turning)
    tl.call(function () { walkOn = true; }, null, 9.0);
    tl.to(char.position, { x: 14, duration: 2.8, ease: "power2.in" }, 9.0);
    tl.call(function () { walkOn = false; }, null, 11.8);

    // Show UI card
    tl.call(function () {
      var ui = document.getElementById('welcome-ui-overlay');
      if (ui) ui.classList.add('visible');
    }, null, 10.0);

    // ═══ RENDER LOOP ═══
    var clk = new THREE.Clock();
    function loop() {
      requestAnimationFrame(loop);
      var t = clk.getElapsedTime();
      doWalk(t);
      // Particle drift
      var pa = pGeo.attributes.position.array;
      for (var i = 1; i < pa.length; i += 3) pa[i] += Math.sin(t * 0.8 + i) * 0.0008;
      pGeo.attributes.position.needsUpdate = true;
      // Camera breathing
      camera.position.y += Math.sin(t * 0.6) * 0.0008;
      // Panel float
      if (panelGroup.position.y < 5) {
        panelGroup.position.y += Math.sin(t * 1.2) * 0.0008;
        panelGroup.rotation.y = Math.sin(t * 0.4) * 0.015;
      }
      renderer.render(scene, camera);
    }
    loop();

    window.addEventListener("resize", function () {
      var w = container.clientWidth, h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
  }

  // Start when overlay becomes visible
  var obs = new MutationObserver(function () {
    if (!overlay.classList.contains('hidden')) { init(); obs.disconnect(); }
  });
  obs.observe(overlay, { attributes: true, attributeFilter: ['class'] });
  if (!overlay.classList.contains('hidden')) init();
})();
