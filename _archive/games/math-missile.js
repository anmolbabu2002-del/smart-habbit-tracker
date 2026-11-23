// ============================================================
// MATH MISSILE — Full 3D Immersive Game
// Real sky, grass, mountains, 3D rockets, gradual difficulty
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    // --- UI Elements ---
    const mathMissileCard = document.getElementById('card-math-missile');
    const mathMissileView = document.getElementById('math-missile-view');
    const gamesHubView = document.getElementById('games-hub-view');
    const backBtn = document.getElementById('back-to-hub-math-missile');

    const container = document.getElementById('math-missile-container');
    const startOverlay = document.getElementById('mm-start-overlay');
    const gameoverOverlay = document.getElementById('mm-gameover-overlay');
    const startBtn = document.getElementById('mm-start-btn');
    const retryBtn = document.getElementById('mm-retry-btn');

    const hud = document.getElementById('mm-hud');
    const scoreDisplay = document.getElementById('mm-score');
    const healthDisplay = document.getElementById('mm-health');
    const comboDisplay = document.getElementById('mm-combo');
    const finalScoreDisplay = document.getElementById('mm-final-score');
    const highScoreDisplay = document.getElementById('mm-highscore');
    const newRecordBadge = document.getElementById('mm-new-record');
    const goHighScoreDisplay = document.getElementById('mm-go-best');

    const hiddenInput = document.getElementById('mm-hidden-input');
    const inputDisplay = document.getElementById('mm-input-display');
    const typedTextDisplay = document.getElementById('mm-typed-text');

    if (!mathMissileCard) return;

    // --- High Score ---
    let highScore = parseInt(appStorage.getItem('mathMissileHighScore') || '0', 10);

    // --- Navigation ---
    mathMissileCard.addEventListener('click', () => {
        gamesHubView.classList.add('hidden');
        mathMissileView.classList.remove('hidden');
        const nb = document.querySelector(".nav-bar"); if (nb) nb.style.display = "none";
        initThreeJS();
    });

    backBtn.addEventListener('click', () => {
        mathMissileView.classList.add('hidden');
        gamesHubView.classList.remove('hidden');
        const nb = document.querySelector(".nav-bar"); if (nb) nb.style.display = "";
        stopGame();
        cleanupThreeJS();
    });

    // --- Game State ---
    let frameId = null;
    let isPlaying = false;
    let score = 0;
    let health = 5;
    let maxHealth = 5;
    let currentInput = '';
    let combo = 0;

    // Difficulty (starts VERY easy)
    let spawnInterval = 4000; // ms — slow at start
    let fallSpeed = 0.08;    // very slow start
    let lastSpawnTime = 0;
    let gameTime = 0; // seconds alive

    // Entity arrays
    let missiles = [];
    let particles = [];
    let beams = [];

    // Three.js core
    let scene, camera, renderer, clock;

    // Scene objects
    let turret, turretBarrel;
    let clouds = [];
    let grassPatches = [];

    // Flags
    let threeInitialized = false;
    let cameraShake = 0;

    // Mobile detection
    let isPortrait = false;
    let camDefaultPos = { x: 0, y: 25, z: 80 };
    let camLookAt = { x: 0, y: 20, z: 0 };

    function updateOrientation() {
        const W = container.clientWidth;
        const H = container.clientHeight;
        isPortrait = H > W;
        if (isPortrait) {
            // Phone portrait: keep a SIMILAR forward-facing angle as desktop
            // but pull camera closer and use wider FOV so narrow screen sees everything
            camDefaultPos = { x: 0, y: 18, z: 65 };
            camLookAt = { x: 0, y: 22, z: -10 };
        } else {
            // Desktop/landscape
            camDefaultPos = { x: 0, y: 25, z: 80 };
            camLookAt = { x: 0, y: 20, z: 0 };
        }
    }

    // ========================================================
    //  THREE.JS INITIALIZATION — Rich 3D World
    // ========================================================
    function initThreeJS() {
        if (threeInitialized) return;
        threeInitialized = true;

        const W = container.clientWidth;
        const H = container.clientHeight;

        updateOrientation();

        // Scene
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x87CEEB);
        scene.fog = new THREE.FogExp2(0xc8ddf0, isPortrait ? 0.004 : 0.003);

        // Camera — adapts to portrait vs landscape
        camera = new THREE.PerspectiveCamera(isPortrait ? 75 : 55, W / H, 0.1, 2000);
        camera.position.set(camDefaultPos.x, camDefaultPos.y, camDefaultPos.z);
        camera.lookAt(camLookAt.x, camLookAt.y, camLookAt.z);

        // Renderer
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(W, H);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = !isPortrait; // Skip shadows on mobile for perf
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.insertBefore(renderer.domElement, container.firstChild);

        clock = new THREE.Clock();

        // ---- LIGHTING ----
        const hemiLight = new THREE.HemisphereLight(0x87CEEB, 0x556B2F, 0.9);
        scene.add(hemiLight);

        const sunLight = new THREE.DirectionalLight(0xfff4d6, 1.2);
        sunLight.position.set(50, 100, 30);
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.width = 1024;
        sunLight.shadow.mapSize.height = 1024;
        sunLight.shadow.camera.near = 1;
        sunLight.shadow.camera.far = 300;
        sunLight.shadow.camera.left = -100;
        sunLight.shadow.camera.right = 100;
        sunLight.shadow.camera.top = 100;
        sunLight.shadow.camera.bottom = -100;
        scene.add(sunLight);

        // ---- SKY (Gradient Sphere) ----
        const skyGeo = new THREE.SphereGeometry(500, 32, 32);
        const skyMat = new THREE.ShaderMaterial({
            uniforms: {
                topColor: { value: new THREE.Color(0x0077ff) },
                bottomColor: { value: new THREE.Color(0x87CEEB) },
                offset: { value: 33 },
                exponent: { value: 0.4 }
            },
            vertexShader: `
                varying vec3 vWorldPosition;
                void main() {
                    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                    vWorldPosition = worldPosition.xyz;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 topColor;
                uniform vec3 bottomColor;
                uniform float offset;
                uniform float exponent;
                varying vec3 vWorldPosition;
                void main() {
                    float h = normalize(vWorldPosition + offset).y;
                    gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
                }
            `,
            side: THREE.BackSide
        });
        scene.add(new THREE.Mesh(skyGeo, skyMat));

        // ---- SUN ----
        const sunGeo = new THREE.SphereGeometry(12, 16, 16);
        const sunMat = new THREE.MeshBasicMaterial({ color: 0xFFDD44 });
        const sun = new THREE.Mesh(sunGeo, sunMat);
        sun.position.set(150, 200, -200);
        scene.add(sun);
        // Sun glow
        const glowGeo = new THREE.SphereGeometry(20, 16, 16);
        const glowMat = new THREE.MeshBasicMaterial({ color: 0xFFEE88, transparent: true, opacity: 0.3 });
        const glow = new THREE.Mesh(glowGeo, glowMat);
        glow.position.copy(sun.position);
        scene.add(glow);

        // ---- GROUND (grass) ----
        const groundGeo = new THREE.PlaneGeometry(600, 600, 30, 30);
        // Slightly bump the ground vertices for hills
        const posAttr = groundGeo.getAttribute('position');
        for (let i = 0; i < posAttr.count; i++) {
            const x = posAttr.getX(i);
            const y = posAttr.getY(i);
            posAttr.setZ(i, Math.sin(x * 0.02) * 3 + Math.cos(y * 0.03) * 2 + Math.random() * 0.5);
        }
        groundGeo.computeVertexNormals();
        const groundMat = new THREE.MeshLambertMaterial({ color: 0x4CAF50 });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = 0;
        ground.receiveShadow = true;
        scene.add(ground);

        // ---- MOUNTAINS (Background) ----
        createMountains();

        // ---- CLOUDS ----
        createClouds();

        // ---- TREES ----
        createTrees();

        // ---- TURRET / DEFENSE TOWER ----
        createTurret();

        // ---- Window resize ----
        window.addEventListener('resize', onWindowResize);

        // Start render  loop
        renderScene();
    }

    // ---- MOUNTAINS ----
    function createMountains() {
        const mountainColors = [0x5D7B6F, 0x6B8E7B, 0x4A6853, 0x7BA08B];
        for (let i = 0; i < 12; i++) {
            const h = 40 + Math.random() * 80;
            const r = 30 + Math.random() * 50;
            const geo = new THREE.ConeGeometry(r, h, 6 + Math.floor(Math.random() * 3));
            const mat = new THREE.MeshLambertMaterial({ color: mountainColors[i % mountainColors.length], flatShading: true });
            const m = new THREE.Mesh(geo, mat);
            const angle = (i / 12) * Math.PI * 2;
            m.position.set(
                Math.cos(angle) * (150 + Math.random() * 80),
                h / 2 - 5,
                Math.sin(angle) * (150 + Math.random() * 80) - 100
            );
            m.rotation.y = Math.random() * Math.PI;
            m.castShadow = true;
            scene.add(m);

            // Snow cap
            if (h > 70) {
                const snowGeo = new THREE.ConeGeometry(r * 0.3, h * 0.2, 6);
                const snowMat = new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true });
                const snow = new THREE.Mesh(snowGeo, snowMat);
                snow.position.set(m.position.x, m.position.y + h * 0.4, m.position.z);
                scene.add(snow);
            }
        }
    }

    // ---- CLOUDS ----
    function createClouds() {
        const count = isPortrait ? 10 : 15;
        for (let i = 0; i < count; i++) {
            const cloudGroup = new THREE.Group();
            const numPuffs = 3 + Math.floor(Math.random() * 4);
            for (let j = 0; j < numPuffs; j++) {
                const puffSize = isPortrait ? (3 + Math.random() * 5) : (5 + Math.random() * 8);
                const puffGeo = new THREE.SphereGeometry(puffSize, 8, 8);
                const puffMat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 });
                const puff = new THREE.Mesh(puffGeo, puffMat);
                puff.position.set(
                    (Math.random() - 0.5) * 15,
                    (Math.random() - 0.5) * 4,
                    (Math.random() - 0.5) * 8
                );
                puff.scale.y = 0.6;
                cloudGroup.add(puff);
            }
            // On mobile, bring clouds closer and lower so they're in the camera frustum
            const cloudY = isPortrait ? (35 + Math.random() * 40) : (60 + Math.random() * 80);
            const cloudX = isPortrait ? ((Math.random() - 0.5) * 150) : ((Math.random() - 0.5) * 400);
            const cloudZ = isPortrait ? ((Math.random() - 0.5) * 100 - 30) : ((Math.random() - 0.5) * 300 - 50);
            cloudGroup.position.set(cloudX, cloudY, cloudZ);
            cloudGroup.userData.speed = 0.02 + Math.random() * 0.05;
            scene.add(cloudGroup);
            clouds.push(cloudGroup);
        }
    }

    // ---- TREES (Low-poly) ----
    function createTrees() {
        const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        const leafMats = [
            new THREE.MeshLambertMaterial({ color: 0x228B22, flatShading: true }),
            new THREE.MeshLambertMaterial({ color: 0x2E8B57, flatShading: true }),
            new THREE.MeshLambertMaterial({ color: 0x3CB371, flatShading: true }),
        ];

        for (let i = 0; i < 40; i++) {
            const treeGroup = new THREE.Group();
            const trunkH = 3 + Math.random() * 4;
            const trunkGeo = new THREE.CylinderGeometry(0.4, 0.7, trunkH, 6);
            const trunk = new THREE.Mesh(trunkGeo, trunkMat);
            trunk.position.y = trunkH / 2;
            trunk.castShadow = true;
            treeGroup.add(trunk);

            // Foliage layers
            const layers = 2 + Math.floor(Math.random() * 2);
            for (let l = 0; l < layers; l++) {
                const leafR = 3 - l * 0.8 + Math.random();
                const leafH = 3 - l * 0.5;
                const leafGeo = new THREE.ConeGeometry(leafR, leafH, 6 + Math.floor(Math.random() * 3));
                const leaf = new THREE.Mesh(leafGeo, leafMats[Math.floor(Math.random() * leafMats.length)]);
                leaf.position.y = trunkH + l * 2;
                leaf.castShadow = true;
                treeGroup.add(leaf);
            }

            // Position trees around the scene but NOT in the center play area
            let x, z;
            do {
                x = (Math.random() - 0.5) * 200;
                z = (Math.random() - 0.5) * 200 - 20;
            } while (Math.abs(x) < 30 && Math.abs(z) < 30);

            treeGroup.position.set(x, 0, z);
            treeGroup.scale.setScalar(0.7 + Math.random() * 0.6);
            scene.add(treeGroup);
        }
    }

    // ---- TURRET (Player Defense Tower) ----
    function createTurret() {
        turret = new THREE.Group();

        // Base platform — hexagonal
        const baseGeo = new THREE.CylinderGeometry(5, 6, 3, 8);
        const baseMat = new THREE.MeshPhongMaterial({ color: 0x888888, flatShading: true });
        const base = new THREE.Mesh(baseGeo, baseMat);
        base.position.y = 1.5;
        base.castShadow = true;
        turret.add(base);

        // Middle body
        const bodyGeo = new THREE.CylinderGeometry(3, 4, 5, 8);
        const bodyMat = new THREE.MeshPhongMaterial({ color: 0x666666, flatShading: true });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 5.5;
        body.castShadow = true;
        turret.add(body);

        // Top dome
        const domeGeo = new THREE.SphereGeometry(3.5, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2);
        const domeMat = new THREE.MeshPhongMaterial({ color: 0x44aaff, flatShading: true, shininess: 100 });
        const dome = new THREE.Mesh(domeGeo, domeMat);
        dome.position.y = 8;
        dome.castShadow = true;
        turret.add(dome);

        // Barrel
        const barrelGeo = new THREE.CylinderGeometry(0.5, 0.5, 8, 8);
        const barrelMat = new THREE.MeshPhongMaterial({ color: 0x333333 });
        turretBarrel = new THREE.Mesh(barrelGeo, barrelMat);
        turretBarrel.position.set(0, 9, 0);
        turretBarrel.rotation.x = -Math.PI / 6; // Angled up
        turret.add(turretBarrel);

        // Antenna
        const antGeo = new THREE.CylinderGeometry(0.1, 0.1, 4, 4);
        const antMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const antenna = new THREE.Mesh(antGeo, antMat);
        antenna.position.y = 12;
        turret.add(antenna);
        // Antenna tip light
        const tipGeo = new THREE.SphereGeometry(0.3, 8, 8);
        const tipMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const tip = new THREE.Mesh(tipGeo, tipMat);
        tip.position.y = 14;
        turret.add(tip);

        turret.position.set(0, 0, 20);
        scene.add(turret);
    }

    // ---- ROCKET MESH BUILDER ----
    function createRocketMesh(color) {
        const rocket = new THREE.Group();

        // Nose cone
        const noseGeo = new THREE.ConeGeometry(1.2, 3, 8);
        const noseMat = new THREE.MeshPhongMaterial({ color: 0xff2222, flatShading: true, shininess: 80 });
        const nose = new THREE.Mesh(noseGeo, noseMat);
        nose.position.y = 4.5;
        rocket.add(nose);

        // Body
        const bodyGeo = new THREE.CylinderGeometry(1.2, 1.2, 5, 8);
        const bodyMat = new THREE.MeshPhongMaterial({ color: color, flatShading: true, shininess: 60 });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 1.5;
        rocket.add(body);

        // Stripe
        const stripeGeo = new THREE.CylinderGeometry(1.25, 1.25, 0.8, 8);
        const stripeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const stripe = new THREE.Mesh(stripeGeo, stripeMat);
        stripe.position.y = 2;
        rocket.add(stripe);

        // Fins (4 fins)
        for (let i = 0; i < 4; i++) {
            const finShape = new THREE.Shape();
            finShape.moveTo(0, 0);
            finShape.lineTo(2, 0);
            finShape.lineTo(0.5, 3);
            finShape.lineTo(0, 3);
            const finGeo = new THREE.ExtrudeGeometry(finShape, { depth: 0.15, bevelEnabled: false });
            const finMat = new THREE.MeshPhongMaterial({ color: 0xdd3333, flatShading: true });
            const fin = new THREE.Mesh(finGeo, finMat);
            fin.rotation.y = (i * Math.PI) / 2;
            fin.position.y = -1;
            const r = 1.1;
            fin.position.x = Math.cos((i * Math.PI) / 2) * r;
            fin.position.z = Math.sin((i * Math.PI) / 2) * r;
            rocket.add(fin);
        }

        // Engine nozzle
        const nozGeo = new THREE.CylinderGeometry(0.6, 1, 1.5, 8);
        const nozMat = new THREE.MeshPhongMaterial({ color: 0x333333 });
        const nozzle = new THREE.Mesh(nozGeo, nozMat);
        nozzle.position.y = -1.5;
        rocket.add(nozzle);

        // Exhaust flame (simple cone)
        const flameGeo = new THREE.ConeGeometry(0.8, 3, 8);
        const flameMat = new THREE.MeshBasicMaterial({ color: 0xff8800, transparent: true, opacity: 0.8 });
        const flame = new THREE.Mesh(flameGeo, flameMat);
        flame.position.y = -3.5;
        flame.rotation.x = Math.PI; // Point downward
        flame.name = 'flame';
        rocket.add(flame);

        // Inner flame
        const innerFlameGeo = new THREE.ConeGeometry(0.4, 2, 8);
        const innerFlameMat = new THREE.MeshBasicMaterial({ color: 0xffff00, transparent: true, opacity: 0.9 });
        const innerFlame = new THREE.Mesh(innerFlameGeo, innerFlameMat);
        innerFlame.position.y = -3;
        innerFlame.rotation.x = Math.PI;
        innerFlame.name = 'innerFlame';
        rocket.add(innerFlame);

        rocket.castShadow = true;

        // Rotate so the rocket points downward (falling)
        rocket.rotation.x = Math.PI;

        return rocket;
    }

    // ---- TEXT SPRITE (Equation label above rocket) ----
    function createEquationSprite(text) {
        const canvas = document.createElement('canvas');
        canvas.width = 320;
        canvas.height = 100;
        const ctx = canvas.getContext('2d');

        // Background pill
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(10, 10, 300, 80, 20);
        else { ctx.rect(10, 10, 300, 80); }
        ctx.fill();

        // Border
        ctx.strokeStyle = '#ff6b35';
        ctx.lineWidth = 3;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(10, 10, 300, 80, 20);
        else { ctx.rect(10, 10, 300, 80); }
        ctx.stroke();

        // Equation text
        ctx.font = 'bold 42px "JetBrains Mono", Courier, monospace';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, 160, 52);

        const texture = new THREE.CanvasTexture(canvas);
        const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
        const sprite = new THREE.Sprite(mat);
        sprite.scale.set(14, 4.5, 1);
        return sprite;
    }

    // ========================================================
    //  GAME LOGIC
    // ========================================================

    // startGame logic is handled by the inline listeners at the bottom of the file


    function stopGame() {
        isPlaying = false;
        document.removeEventListener('keydown', handleGlobalKeydown);
    }

    function gameOver() {
        stopGame();
        hud.style.display = 'none';
        inputDisplay.style.display = 'none';
        const numpad = document.getElementById('mm-numpad');
        if (numpad) numpad.style.display = 'none';
        gameoverOverlay.style.display = 'flex';
        finalScoreDisplay.textContent = score;

        // High score check
        const isNewRecord = score > highScore;
        if (isNewRecord) {
            highScore = score;
            appStorage.setItem('mathMissileHighScore', highScore.toString());
        }
        if (newRecordBadge) newRecordBadge.style.display = isNewRecord ? 'block' : 'none';
        if (goHighScoreDisplay) goHighScoreDisplay.textContent = highScore;

        // Big explosion at turret
        if (turret) {
            createExplosion(turret.position.clone().add(new THREE.Vector3(0, 10, 0)), 0xff4400, 80);
        }
        cameraShake = 2.0;
    }

    function clearEntities() {
        missiles.forEach(m => {
            scene.remove(m.group);
            scene.remove(m.sprite);
        });
        missiles = [];

        particles.forEach(p => scene.remove(p.mesh));
        particles = [];

        beams.forEach(b => scene.remove(b.mesh));
        beams = [];
    }

    function updateHUD() {
        scoreDisplay.textContent = score;
        typedTextDisplay.textContent = currentInput;
        if (highScoreDisplay) highScoreDisplay.textContent = Math.max(score, highScore);

        let hearts = '';
        for (let i = 0; i < maxHealth; i++) {
            hearts += (i < health) ? '❤️' : '🖤';
        }
        healthDisplay.textContent = hearts;

        if (combo > 1) {
            comboDisplay.style.display = 'block';
            comboDisplay.textContent = `🔥 COMBO x${combo}`;
        } else {
            comboDisplay.style.display = 'none';
        }

        if (health <= 0) {
            gameOver();
        }
    }

    // ---- EQUATION GENERATOR ----
    function generateEquation() {
        // Difficulty is based on gameTime (seconds)
        // 0-15s: Very easy (single digit + / -)
        // 15-40s: Medium (two digit + / -)
        // 40-80s: Multiplication introduced
        // 80s+: Harder mult, big numbers
        let num1, num2, op, answer;

        if (gameTime < 15) {
            // Very Easy
            op = Math.random() < 0.6 ? '+' : '-';
            num1 = Math.floor(Math.random() * 8) + 1;
            num2 = Math.floor(Math.random() * 8) + 1;
        } else if (gameTime < 40) {
            // Easy-Medium
            op = Math.random() < 0.5 ? '+' : '-';
            num1 = Math.floor(Math.random() * 20) + 5;
            num2 = Math.floor(Math.random() * 15) + 1;
        } else if (gameTime < 80) {
            // Medium — mult introduced
            const r = Math.random();
            if (r < 0.4) op = '+';
            else if (r < 0.7) op = '-';
            else op = '×';
            if (op === '×') {
                num1 = Math.floor(Math.random() * 8) + 2;
                num2 = Math.floor(Math.random() * 8) + 2;
            } else {
                num1 = Math.floor(Math.random() * 40) + 10;
                num2 = Math.floor(Math.random() * 25) + 5;
            }
        } else {
            // Hard
            const r = Math.random();
            if (r < 0.3) op = '+';
            else if (r < 0.55) op = '-';
            else op = '×';
            if (op === '×') {
                num1 = Math.floor(Math.random() * 12) + 3;
                num2 = Math.floor(Math.random() * 12) + 2;
            } else {
                num1 = Math.floor(Math.random() * 80) + 20;
                num2 = Math.floor(Math.random() * 50) + 10;
            }
        }

        // Ensure no negative answers
        if (op === '-' && num2 > num1) { let t = num1; num1 = num2; num2 = t; }

        if (op === '+') answer = num1 + num2;
        else if (op === '-') answer = num1 - num2;
        else answer = num1 * num2;

        return { text: `${num1} ${op} ${num2}`, answer };
    }

    // ---- SPAWN MISSILE ----
    const rocketColors = [0xeeeeee, 0xcccccc, 0xaaaacc, 0xddddaa, 0xbbccdd];

    function spawnMissile() {
        const eq = generateEquation();
        const color = rocketColors[Math.floor(Math.random() * rocketColors.length)];

        const rocketGroup = createRocketMesh(color);

        // Spawn positions — narrower on portrait but visible from the same forward angle
        const spreadX = isPortrait ? 30 : 80;
        const spreadZ = isPortrait ? 20 : 40;
        const spawnX = (Math.random() - 0.5) * spreadX;
        const spawnZ = (Math.random() - 0.5) * spreadZ - (isPortrait ? 5 : 10);
        const spawnY = (isPortrait ? 65 : 100) + Math.random() * 20;

        rocketGroup.position.set(spawnX, spawnY, spawnZ);
        rocketGroup.rotation.z = (Math.random() - 0.5) * 0.3;

        // Scale rockets slightly larger on mobile for visibility
        if (isPortrait) rocketGroup.scale.setScalar(1.2);

        scene.add(rocketGroup);

        // Equation sprite — larger on mobile
        const sprite = createEquationSprite(eq.text);
        sprite.position.copy(rocketGroup.position);
        sprite.position.y += 8;
        if (isPortrait) sprite.scale.set(16, 5, 1);
        scene.add(sprite);

        // Fall speed
        const speed = fallSpeed + Math.random() * 0.02;

        missiles.push({
            group: rocketGroup,
            sprite: sprite,
            answer: eq.answer,
            speed: speed,
            rotSpeed: (Math.random() - 0.5) * 0.02,
        });
    }

    // ---- BEAM EFFECT ----
    function createBeam(targetPos) {
        const start = turret ? turret.position.clone().add(new THREE.Vector3(0, 12, 0)) : new THREE.Vector3(0, 12, 20);
        const direction = targetPos.clone().sub(start);
        const dist = direction.length();

        const beamGeo = new THREE.CylinderGeometry(0.3, 0.3, dist, 6);
        beamGeo.translate(0, dist / 2, 0);
        beamGeo.rotateX(Math.PI / 2);

        const beamMat = new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.9 });
        const beamMesh = new THREE.Mesh(beamGeo, beamMat);
        beamMesh.position.copy(start);
        beamMesh.lookAt(targetPos);

        scene.add(beamMesh);
        beams.push({ mesh: beamMesh, life: 0.15 });
    }

    // ---- EXPLOSION PARTICLES ----
    function createExplosion(pos, colorHex, count) {
        for (let i = 0; i < count; i++) {
            const size = 0.3 + Math.random() * 0.7;
            const geo = new THREE.BoxGeometry(size, size, size);
            const c = (i % 3 === 0) ? 0xffaa00 : (i % 3 === 1) ? colorHex : 0xff4400;
            const mat = new THREE.MeshBasicMaterial({ color: c });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.copy(pos);

            const velocity = new THREE.Vector3(
                (Math.random() - 0.5) * 3,
                Math.random() * 3,
                (Math.random() - 0.5) * 3
            );

            scene.add(mesh);
            particles.push({ mesh, velocity, life: 1.0 });
        }
    }

    // ---- TYPING MECHANICS ----
    // Detect if touch device
    let isTouchDevice = false;

    function detectTouch() {
        isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    }
    detectTouch();

    // On desktop: use keydown ONLY (prevents double-input bug)
    // On mobile: use the numpad buttons (no hidden input needed)

    function handleGlobalKeydown(e) {
        if (!isPlaying) return;

        if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            clearInput();
            return;
        }
        if (e.key === 'Backspace') {
            e.preventDefault();
            currentInput = currentInput.slice(0, -1);
            updateHUD();
            return;
        }
        if (/^[0-9]$/.test(e.key)) {
            e.preventDefault();
            addDigit(e.key);
        }
    }

    // Unified digit handler
    function addDigit(digit) {
        currentInput += digit;
        updateHUD();
        checkAnswers();
    }

    function clearInput() {
        currentInput = '';
        updateHUD();
    }

    // ---- Mobile Numpad ----
    let mobileNumpadInitialized = false;
    let lastNumpadTime = 0;

    function setupMobileNumpad() {
        if (mobileNumpadInitialized) return;
        const numpad = document.getElementById('mm-numpad');
        if (!numpad) return;

        const handleNumpadInput = (e, btn) => {
            if (e.type === 'touchstart') e.preventDefault(); // Prevent synthetic click
            
            const now = performance.now();
            if (now - lastNumpadTime < 50) return; // Debounce 50ms
            lastNumpadTime = now;

            if (!isPlaying) return;
            
            const val = btn.dataset.val;
            if (val === 'C') {
                clearInput();
            } else {
                addDigit(val);
            }
            
            // Haptic feedback
            if (navigator.vibrate) navigator.vibrate(20);
            // btn press animation
            btn.style.transform = 'scale(0.9)';
            setTimeout(() => btn.style.transform = '', 100);
        };

        numpad.querySelectorAll('.mm-num-btn').forEach(btn => {
            btn.addEventListener('touchstart', (e) => handleNumpadInput(e, btn), { passive: false });
            btn.addEventListener('click', (e) => handleNumpadInput(e, btn));
        });

        mobileNumpadInitialized = true;
    }

    // ---- Visual Feedback Popups ----
    function showHitPopup(text, color) {
        const popup = document.createElement('div');
        popup.textContent = text;
        popup.style.cssText = `
            position: absolute; top: 40%; left: 50%; transform: translate(-50%, -50%) scale(0.5);
            font-size: 2.5rem; font-weight: 900; color: ${color};
            text-shadow: 0 2px 15px rgba(0,0,0,0.5);
            pointer-events: none; z-index: 300;
            transition: all 0.6s cubic-bezier(0.165, 0.84, 0.44, 1);
            font-family: 'JetBrains Mono', monospace;
        `;
        container.appendChild(popup);
        requestAnimationFrame(() => {
            popup.style.transform = 'translate(-50%, -120%) scale(1.2)';
            popup.style.opacity = '0';
        });
        setTimeout(() => popup.remove(), 700);
    }

    function flashScreen(color) {
        const flash = document.createElement('div');
        flash.style.cssText = `
            position: absolute; top: 0; left: 0; width: 100%; height: 100%;
            background: ${color}; pointer-events: none; z-index: 150;
            transition: opacity 0.3s ease-out;
        `;
        container.appendChild(flash);
        requestAnimationFrame(() => flash.style.opacity = '0');
        setTimeout(() => flash.remove(), 350);
    }

    // ---- CHECK ANSWERS ----
    function checkAnswers() {
        const idx = missiles.findIndex(m => m.answer.toString() === currentInput);
        if (idx !== -1) {
            const m = missiles[idx];

            // Fire beam
            createBeam(m.group.position.clone());

            // Explosion
            createExplosion(m.group.position, 0xff6600, 40);

            // Remove
            scene.remove(m.group);
            scene.remove(m.sprite);
            missiles.splice(idx, 1);

            // Scoring with combo
            combo++;
            const comboBonus = Math.min(combo, 10);
            const points = 10 * comboBonus;
            score += points;

            // AUTO-CLEAR input after a hit
            currentInput = '';
            cameraShake = 0.4;

            // Visual feedback
            flashScreen('rgba(0,255,100,0.15)');
            if (combo >= 3) {
                showHitPopup(`🔥 x${combo} COMBO! +${points}`, '#ffd700');
            } else {
                showHitPopup(`+${points}`, '#00ff88');
            }

            updateHUD();

            // Aim turret barrel at target direction
            if (turretBarrel && turret) {
                turretBarrel.lookAt(m.group.position);
            }

            // Haptic
            if (navigator.vibrate) navigator.vibrate(30);

        } else if (currentInput.length > 5) {
            clearInput();
        }
    }

    // ========================================================
    //  RENDER / UPDATE LOOP
    // ========================================================
    function renderScene() {
        if (!scene) return;
        frameId = requestAnimationFrame(renderScene);

        const delta = clock.getDelta();
        const elapsed = clock.getElapsedTime();

        if (isPlaying) {
            gameTime += delta;

            // ---- Gradual difficulty scaling ----
            spawnInterval = Math.max(1000, 4000 - gameTime * 25);
            fallSpeed = 0.08 + Math.min(gameTime * 0.0014, 0.17);

            // Spawn check
            const now = performance.now();
            if (now - lastSpawnTime > spawnInterval) {
                spawnMissile();
                lastSpawnTime = now;
            }

            // Update missiles
            for (let i = missiles.length - 1; i >= 0; i--) {
                const m = missiles[i];
                m.group.position.y -= m.speed;
                m.group.rotation.y += m.rotSpeed;

                // Animate flame flicker
                m.group.children.forEach(child => {
                    if (child.name === 'flame') {
                        child.scale.y = 0.8 + Math.sin(elapsed * 15 + i) * 0.3;
                        child.scale.x = 0.9 + Math.sin(elapsed * 20 + i * 2) * 0.15;
                    }
                    if (child.name === 'innerFlame') {
                        child.scale.y = 0.7 + Math.cos(elapsed * 18 + i) * 0.4;
                    }
                });

                // Update sprite position
                m.sprite.position.copy(m.group.position);
                m.sprite.position.y += 10;

                // Hit the ground
                if (m.group.position.y < 3) {
                    createExplosion(m.group.position, 0xff0000, 50);
                    cameraShake = 1.5;

                    scene.remove(m.group);
                    scene.remove(m.sprite);
                    missiles.splice(i, 1);

                    health--;
                    combo = 0;
                    currentInput = '';

                    // Red flash
                    flashScreen('rgba(255,0,0,0.25)');
                    showHitPopup('💥 MISS!', '#ff4444');

                    if (navigator.vibrate) navigator.vibrate([50, 30, 50]);

                    updateHUD();
                }
            }
        }

        // ---- Update particles ----
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.mesh.position.add(p.velocity);
            p.velocity.y -= 0.06;
            p.life -= delta * 2;
            p.mesh.scale.setScalar(Math.max(p.life, 0));
            if (p.life <= 0) {
                scene.remove(p.mesh);
                p.mesh.geometry.dispose();
                p.mesh.material.dispose();
                particles.splice(i, 1);
            }
        }

        // ---- Update beams ----
        for (let i = beams.length - 1; i >= 0; i--) {
            const b = beams[i];
            b.life -= delta;
            b.mesh.material.opacity = (b.life / 0.15) * 0.9;
            if (b.life <= 0) {
                scene.remove(b.mesh);
                b.mesh.geometry.dispose();
                b.mesh.material.dispose();
                beams.splice(i, 1);
            }
        }

        // ---- Animate clouds ----
        const cloudBound = isPortrait ? 80 : 250;
        clouds.forEach(c => {
            c.position.x += c.userData.speed;
            if (c.position.x > cloudBound) c.position.x = -cloudBound;
        });

        // ---- Turret idle animation ----
        if (turret) {
            const tip = turret.children[turret.children.length - 1];
            if (tip) tip.material.opacity = Math.sin(elapsed * 3) > 0 ? 1 : 0.2;
        }

        // ---- Camera shake ----
        if (cameraShake > 0) {
            camera.position.x = camDefaultPos.x + (Math.random() - 0.5) * cameraShake * 3;
            camera.position.y = camDefaultPos.y + (Math.random() - 0.5) * cameraShake * 3;
            cameraShake -= delta * 4;
            if (cameraShake < 0) {
                cameraShake = 0;
                camera.position.set(camDefaultPos.x, camDefaultPos.y, camDefaultPos.z);
            }
        }

        renderer.render(scene, camera);
    }

    function onWindowResize() {
        if (!camera || !renderer) return;
        const W = container.clientWidth;
        const H = container.clientHeight;
        updateOrientation();
        camera.fov = isPortrait ? 75 : 55;
        camera.aspect = W / H;
        camera.updateProjectionMatrix();
        camera.position.set(camDefaultPos.x, camDefaultPos.y, camDefaultPos.z);
        camera.lookAt(camLookAt.x, camLookAt.y, camLookAt.z);
        renderer.setSize(W, H);
    }

    // Show/hide mobile numpad
    function updateMobileUI() {
        const numpad = document.getElementById('mm-numpad');
        if (!numpad) return;
        detectTouch();
        if (isTouchDevice) {
            numpad.style.display = 'grid';
        } else {
            numpad.style.display = 'none';
        }
    }




    startBtn.addEventListener('click', () => {
        startOverlay.style.display = 'none';
        gameoverOverlay.style.display = 'none';
        hud.style.display = 'block';
        inputDisplay.style.display = 'block';

        score = 0;
        health = maxHealth;
        currentInput = '';
        combo = 0;
        gameTime = 0;
        spawnInterval = 4000;
        fallSpeed = 0.08;
        lastSpawnTime = 0;

        clearEntities();
        updateHUD();

        isPlaying = true;
        document.addEventListener('keydown', handleGlobalKeydown);
        updateMobileUI();
        setupMobileNumpad();
    });

    retryBtn.addEventListener('click', () => {
        startOverlay.style.display = 'none';
        gameoverOverlay.style.display = 'none';
        hud.style.display = 'block';
        inputDisplay.style.display = 'block';

        score = 0;
        health = maxHealth;
        currentInput = '';
        combo = 0;
        gameTime = 0;
        spawnInterval = 4000;
        fallSpeed = 0.08;
        lastSpawnTime = 0;

        clearEntities();
        updateHUD();

        isPlaying = true;
        document.addEventListener('keydown', handleGlobalKeydown);
        updateMobileUI();
        setupMobileNumpad();
    });

    function cleanupThreeJS() {
        if (!threeInitialized) return;
        window.removeEventListener('resize', onWindowResize);
        cancelAnimationFrame(frameId);
        if (renderer && renderer.domElement && renderer.domElement.parentNode) {
            renderer.domElement.parentNode.removeChild(renderer.domElement);
        }
        if (scene) {
            scene.traverse(obj => {
                if (obj.geometry) obj.geometry.dispose();
                if (obj.material) {
                    if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
                    else obj.material.dispose();
                }
            });
        }
        scene = null;
        camera = null;
        renderer = null;
        clock = null;
        turret = null;
        turretBarrel = null;
        clouds = [];
        missiles = [];
        particles = [];
        beams = [];
        threeInitialized = false;
    }
});


