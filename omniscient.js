/* =========================================================================
   OMNISCIENT: THE WORLD QUIZ GAME (3D) — V2 PREMIUM OVERHAUL
   - Stunning 3D scene with nebula, orbiting rings, particle bursts
   - Timer-based pressure system
   - Streak multipliers & 50/50 lifeline
   - 18 rotating API categories + 40 offline fallback questions
========================================================================= */

// ── CATEGORY MAP (OpenTDB IDs) ──
// Globally neutral categories (no US-biased Politics/Celebrities)
const OMN_CATEGORIES = [
    { id: 9, name: "General Knowledge", icon: "🌐" },
    { id: 9, name: "General Knowledge", icon: "🌐 " },
    { id: 21, name: "Sports", icon: "⚽" },
    { id: 17, name: "Science & Nature", icon: "🔬" },
    { id: 23, name: "History", icon: "📜" },
    { id: 22, name: "Geography", icon: "🗺️ " },
    { id: 11, name: "Film", icon: "🎬" },
    { id: 12, name: "Music", icon: "🎵" },
    { id: 27, name: "Animals", icon: "🐾" },
    { id: 25, name: "Art", icon: "🎨" },
    { id: 20, name: "Mythology", icon: "⚡" },
    { id: 10, name: "Books", icon: "📚" },
    { id: 19, name: "Math", icon: "🧮" },
    { id: 28, name: "Vehicles", icon: "🚗" },
    { id: 15, name: "Video Games", icon: "🎮" },
];

// ── GAME STATE ──
let omnState = {
    isActive: false,
    level: 1,
    score: 0,
    lives: 3,
    streak: 0,
    bestStreak: 0,
    questionsPool: [],
    currentQuestion: null,
    isFetching: false,
    questionsAnswered: 0,
    categoryIndex: 0,
    fiftyFiftyUsed: false,
    extraTimeUsed: false,
    skipUsed: false,
    hsScore: parseInt(appStorage.getItem("omnHsScore") || 0),
    hsLevel: parseInt(appStorage.getItem("omnHsLevel") || 1),

    // Timer
    timerMax: 20,      // seconds to answer
    timerLeft: 20,
    timerInterval: null,

    // Three.js
    scene: null, camera: null, renderer: null,
    globeMesh: null, cloudsMesh: null, atmosphereMesh: null,
    starsMesh: null, ringMesh: null, particleSystem: null,
    animationId: null,
    clock: null,
};

// ── DOM REFS (lazy-loaded on DOMContentLoaded) ──
let omnEl = {};

// ══════════════════════════════════════════════════════════
// DOPAMINE BANK — Ultra-obvious questions for Q1-12
// These are GUARANTEED to be served first. No API needed.
// They are so easy that every single person knows the answer.
// This builds momentum and makes the user feel smart.
// ══════════════════════════════════════════════════════════
const omnDopamineBank = [
    // --- Tier 1: Q1-6 — A literal child knows these ---
    { question: "What color is the sky on a clear day?", correct_answer: "Blue", incorrect_answers: ["Green", "Red", "Purple"], difficulty: "easy", category: "General Knowledge" },
    { question: "How many fingers do most people have?", correct_answer: "10", incorrect_answers: ["8", "12", "6"], difficulty: "easy", category: "General Knowledge" },
    { question: "What animal says 'Meow'?", correct_answer: "Cat", incorrect_answers: ["Dog", "Cow", "Duck"], difficulty: "easy", category: "Animals" },
    { question: "What do you drink when you are thirsty?", correct_answer: "Water", incorrect_answers: ["Sand", "Air", "Rocks"], difficulty: "easy", category: "General Knowledge" },
    { question: "What is 2 + 2?", correct_answer: "4", incorrect_answers: ["3", "5", "6"], difficulty: "easy", category: "Math" },
    { question: "Which is bigger: an elephant or a mouse?", correct_answer: "Elephant", incorrect_answers: ["Mouse", "They are equal", "It depends"], difficulty: "easy", category: "Animals" },
    { question: "What fruit is yellow and curved?", correct_answer: "Banana", incorrect_answers: ["Apple", "Grape", "Watermelon"], difficulty: "easy", category: "General Knowledge" },
    { question: "How many days are in a week?", correct_answer: "7", incorrect_answers: ["5", "6", "10"], difficulty: "easy", category: "General Knowledge" },
    { question: "What color is grass?", correct_answer: "Green", incorrect_answers: ["Blue", "Red", "White"], difficulty: "easy", category: "General Knowledge" },
    { question: "What planet do we live on?", correct_answer: "Earth", incorrect_answers: ["Mars", "Jupiter", "The Moon"], difficulty: "easy", category: "Science & Nature" },
    { question: "What do bees make?", correct_answer: "Honey", incorrect_answers: ["Milk", "Bread", "Cheese"], difficulty: "easy", category: "Animals" },
    { question: "Which is the hottest season?", correct_answer: "Summer", incorrect_answers: ["Winter", "Autumn", "Spring"], difficulty: "easy", category: "General Knowledge" },

    // --- Tier 2: Q7-12 — Very easy common sense ---
    { question: "What is the capital of France?", correct_answer: "Paris", incorrect_answers: ["London", "Rome", "Berlin"], difficulty: "easy", category: "Geography" },
    { question: "What sport is Cristiano Ronaldo famous for?", correct_answer: "Football (Soccer)", incorrect_answers: ["Basketball", "Tennis", "Swimming"], difficulty: "easy", category: "Sports" },
    { question: "What is frozen water called?", correct_answer: "Ice", incorrect_answers: ["Steam", "Fog", "Rain"], difficulty: "easy", category: "Science & Nature" },
    { question: "How many months are in a year?", correct_answer: "12", incorrect_answers: ["10", "14", "8"], difficulty: "easy", category: "General Knowledge" },
    { question: "Which ocean is the largest?", correct_answer: "Pacific Ocean", incorrect_answers: ["Atlantic Ocean", "Indian Ocean", "Arctic Ocean"], difficulty: "easy", category: "Geography" },
    { question: "What does a cow produce?", correct_answer: "Milk", incorrect_answers: ["Eggs", "Wool", "Silk"], difficulty: "easy", category: "Animals" },
    { question: "What shape is a football (soccer ball)?", correct_answer: "Sphere", incorrect_answers: ["Cube", "Triangle", "Rectangle"], difficulty: "easy", category: "Sports" },
    { question: "Who lives in a pineapple under the sea?", correct_answer: "SpongeBob", incorrect_answers: ["Batman", "Mickey Mouse", "Shrek"], difficulty: "easy", category: "Film" },
    { question: "What is the tallest animal in the world?", correct_answer: "Giraffe", incorrect_answers: ["Elephant", "Horse", "Bear"], difficulty: "easy", category: "Animals" },
    { question: "How many legs does a dog have?", correct_answer: "4", incorrect_answers: ["2", "6", "8"], difficulty: "easy", category: "Animals" },
    { question: "What color is a fire truck?", correct_answer: "Red", incorrect_answers: ["Blue", "Green", "Yellow"], difficulty: "easy", category: "General Knowledge" },
    { question: "What instrument has black and white keys?", correct_answer: "Piano", incorrect_answers: ["Guitar", "Drums", "Flute"], difficulty: "easy", category: "Music" },
];

// ── API-LEVEL FALLBACK QUESTIONS (used if API fails after Q12) ──
const omnApiFallbackQuestions = [
    // Medium
    { question: "Who painted the Mona Lisa?", correct_answer: "Leonardo da Vinci", incorrect_answers: ["Michelangelo", "Raphael", "Caravaggio"], difficulty: "medium", category: "Art" },
    { question: "Which country has the most World Cup titles in football?", correct_answer: "Brazil", incorrect_answers: ["Germany", "Italy", "Argentina"], difficulty: "medium", category: "Sports" },
    { question: "What is the hardest natural substance on Earth?", correct_answer: "Diamond", incorrect_answers: ["Gold", "Iron", "Quartz"], difficulty: "medium", category: "Science & Nature" },
    { question: "In which year did World War II end?", correct_answer: "1945", incorrect_answers: ["1944", "1946", "1943"], difficulty: "medium", category: "History" },
    { question: "Who was the first person to walk on the Moon?", correct_answer: "Neil Armstrong", incorrect_answers: ["Buzz Aldrin", "Yuri Gagarin", "John Glenn"], difficulty: "medium", category: "History" },
    { question: "What year did the Titanic sink?", correct_answer: "1912", incorrect_answers: ["1905", "1920", "1898"], difficulty: "medium", category: "History" },
    { question: "Which river is the longest in the world?", correct_answer: "Nile", incorrect_answers: ["Amazon", "Yangtze", "Mississippi"], difficulty: "medium", category: "Geography" },
    { question: "Which planet is closest to the Sun?", correct_answer: "Mercury", incorrect_answers: ["Venus", "Earth", "Mars"], difficulty: "medium", category: "Science & Nature" },
    { question: "What is the largest country in the world by area?", correct_answer: "Russia", incorrect_answers: ["Canada", "China", "USA"], difficulty: "medium", category: "Geography" },
    { question: "What language has the most native speakers?", correct_answer: "Mandarin Chinese", incorrect_answers: ["English", "Spanish", "Hindi"], difficulty: "medium", category: "General Knowledge" },
    // Hard
    { question: "Which ancient philosopher said 'I know that I know nothing'?", correct_answer: "Socrates", incorrect_answers: ["Plato", "Aristotle", "Pythagoras"], difficulty: "hard", category: "History" },
    { question: "What fundamental force is responsible for radioactive decay?", correct_answer: "Weak Nuclear Force", incorrect_answers: ["Strong Nuclear Force", "Electromagnetism", "Gravity"], difficulty: "hard", category: "Science & Nature" },
    { question: "Which treaty ended World War I?", correct_answer: "Treaty of Versailles", incorrect_answers: ["Treaty of Trianon", "Treaty of Paris", "Treaty of Ghent"], difficulty: "hard", category: "History" },
    { question: "What element has the atomic number 79?", correct_answer: "Gold", incorrect_answers: ["Silver", "Platinum", "Copper"], difficulty: "hard", category: "Science & Nature" },
    { question: "Who discovered penicillin?", correct_answer: "Alexander Fleming", incorrect_answers: ["Louis Pasteur", "Marie Curie", "Robert Koch"], difficulty: "hard", category: "Science & Nature" },
];

/* ================== QUESTION ENGINE ================== */

function decodeHTML(text) {
    const ta = document.createElement('textarea');
    ta.innerHTML = text;
    return ta.value;
}

function getNextCategory() {
    const cat = OMN_CATEGORIES[omnState.categoryIndex % OMN_CATEGORIES.length];
    omnState.categoryIndex++;
    return cat;
}

// Get AI difficulty based on questions answered
function getQuestionDifficulty() {
    const q = omnState.questionsAnswered;
    if (q < 20) return 'very easy';    // Q7-20: Gemini Very Easy
    if (q < 40) return 'medium';       // Q21-40: Gemini Medium
    return 'hard';                     // Q41+: Gemini Hard
}

// Fetch from Gemini AI — only used after question 6
async function fetchQuestionsBatch() {
    if (omnState.isFetching) return;
    omnState.isFetching = true;

    const fallback = () => {
        const diff = getQuestionDifficulty();
        const fallbackDiff = diff === 'very easy' ? 'easy' : diff;
        let pool = omnApiFallbackQuestions.filter(q => q.difficulty === fallbackDiff);
        if (pool.length < 3) pool = [...omnApiFallbackQuestions];
        omnState.questionsPool.push(...pool.sort(() => 0.5 - Math.random()).slice(0, 8));
        omnState.isFetching = false;
    };

    try {
        const cat = getNextCategory();
        const diff = getQuestionDifficulty();

        const res = await fetch('/.netlify/functions/quiz', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                difficulty: diff,
                category: cat.name,
                count: 5
            })
        });

        if (!res.ok) { fallback(); return; }
        const data = await res.json();

        if (data.questions && Array.isArray(data.questions) && data.questions.length > 0) {
            omnState.questionsPool.push(...data.questions.map(q => ({
                question: q.question,
                correct_answer: q.correct_answer,
                incorrect_answers: q.incorrect_answers,
                difficulty: q.difficulty || diff,
                category: q.category || cat.name
            })));
        } else {
            fallback();
        }
    } catch (e) {
        console.warn('Gemini quiz fetch failed, using fallback:', e);
        fallback();
    }
    finally { omnState.isFetching = false; }
}

// Smart question source selector
async function ensureQuestions() {
    const qa = omnState.questionsAnswered;

    // Q1-6: ONLY use the dopamine bank (no API at all)
    if (qa < 6 && omnState.questionsPool.length < 3) {
        // Shuffle and load from dopamine bank
        const shuffled = [...omnDopamineBank].sort(() => 0.5 - Math.random());
        omnState.questionsPool.push(...shuffled);
        return;
    }

    // Q7+: Use the API
    if (qa >= 6 && omnState.questionsPool.length < 5) {
        await fetchQuestionsBatch();
    }
}

/* ================== 3D ENGINE ================== */

function initOmn3D() {
    if (omnState.scene) destroyOmn3D();
    const w = window.innerWidth, h = window.innerHeight;

    omnState.clock = new THREE.Clock();
    omnState.scene = new THREE.Scene();
    omnState.scene.fog = new THREE.FogExp2(0x050510, 0.035);

    omnState.camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 1000);
    omnState.camera.position.set(0, 0.5, 4.5);

    omnState.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    omnState.renderer.setSize(w, h);
    omnState.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    omnState.renderer.setClearColor(0x050510);

    omnEl.canvasContainer.innerHTML = '';
    omnEl.canvasContainer.appendChild(omnState.renderer.domElement);

    // ── Starfield (deep space background) ──
    const starsGeo = new THREE.BufferGeometry();
    const sv = [];
    const sc = [];
    for (let i = 0; i < 2000; i++) {
        sv.push((Math.random() - 0.5) * 80, (Math.random() - 0.5) * 80, -Math.random() * 60 - 5);
        const brightness = 0.5 + Math.random() * 0.5;
        sc.push(brightness, brightness, brightness);
    }
    starsGeo.setAttribute('position', new THREE.Float32BufferAttribute(sv, 3));
    starsGeo.setAttribute('color', new THREE.Float32BufferAttribute(sc, 3));
    omnState.starsMesh = new THREE.Points(starsGeo, new THREE.PointsMaterial({
        size: 0.08, vertexColors: true, transparent: true, opacity: 0.9
    }));
    omnState.scene.add(omnState.starsMesh);

    // ── Nebula Glow (large colored sphere behind globe) ──
    const nebulaGeo = new THREE.SphereGeometry(8, 16, 16);
    const nebulaMat = new THREE.MeshBasicMaterial({
        color: 0x1a0a3a, side: THREE.BackSide, transparent: true, opacity: 0.6
    });
    const nebula = new THREE.Mesh(nebulaGeo, nebulaMat);
    omnState.scene.add(nebula);
    omnState._nebula = nebula;

    // ── Globe Core ──
    const globeGeo = new THREE.IcosahedronGeometry(1.2, 2);
    const globeMat = new THREE.MeshPhongMaterial({
        color: 0x6d28d9,
        emissive: 0x2e1065,
        shininess: 80,
        wireframe: true,
        transparent: true,
        opacity: 0.9
    });
    omnState.globeMesh = new THREE.Mesh(globeGeo, globeMat);
    omnState.scene.add(omnState.globeMesh);

    // ── Inner Core Glow ──
    const coreMat = new THREE.MeshBasicMaterial({
        color: 0x8b5cf6, transparent: true, opacity: 0.15
    });
    const core = new THREE.Mesh(new THREE.SphereGeometry(1.0, 16, 16), coreMat);
    omnState.scene.add(core);
    omnState._core = core;

    // ── Orbiting Rings ──
    const ringGeo = new THREE.TorusGeometry(1.8, 0.015, 8, 80);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xc4b5fd, transparent: true, opacity: 0.5 });
    omnState.ringMesh = new THREE.Mesh(ringGeo, ringMat);
    omnState.ringMesh.rotation.x = Math.PI / 3;
    omnState.scene.add(omnState.ringMesh);

    const ring2 = new THREE.Mesh(
        new THREE.TorusGeometry(2.1, 0.01, 8, 80),
        new THREE.MeshBasicMaterial({ color: 0x818cf8, transparent: true, opacity: 0.3 })
    );
    ring2.rotation.x = -Math.PI / 4;
    ring2.rotation.z = Math.PI / 6;
    omnState.scene.add(ring2);
    omnState._ring2 = ring2;

    // ── Floating Particle System (orbiting dots) ──
    const pGeo = new THREE.BufferGeometry();
    const pVerts = [], pColors = [];
    for (let i = 0; i < 200; i++) {
        const angle = Math.random() * Math.PI * 2;
        const r = 1.5 + Math.random() * 1.5;
        pVerts.push(Math.cos(angle) * r, (Math.random() - 0.5) * 2, Math.sin(angle) * r);
        const c = [0.55 + Math.random() * 0.4, 0.3 + Math.random() * 0.3, 0.9 + Math.random() * 0.1];
        pColors.push(...c);
    }
    pGeo.setAttribute('position', new THREE.Float32BufferAttribute(pVerts, 3));
    pGeo.setAttribute('color', new THREE.Float32BufferAttribute(pColors, 3));
    omnState.particleSystem = new THREE.Points(pGeo, new THREE.PointsMaterial({
        size: 0.04, vertexColors: true, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending
    }));
    omnState.scene.add(omnState.particleSystem);

    // ── Atmosphere Shell ──
    const atmoMat = new THREE.MeshBasicMaterial({
        color: 0x7c3aed, transparent: true, opacity: 0.08,
        side: THREE.BackSide, blending: THREE.AdditiveBlending
    });
    omnState.atmosphereMesh = new THREE.Mesh(new THREE.SphereGeometry(1.4, 32, 32), atmoMat);
    omnState.scene.add(omnState.atmosphereMesh);

    // ── Lighting ──
    omnState.scene.add(new THREE.AmbientLight(0x6366f1, 0.4));
    const key = new THREE.PointLight(0xffffff, 1.2);
    key.position.set(4, 3, 4);
    omnState.scene.add(key);
    const rim = new THREE.PointLight(0x8b5cf6, 0.8);
    rim.position.set(-3, -2, 2);
    omnState.scene.add(rim);

    window.addEventListener('resize', onOmnResize);
    animateOmn3D();
}

function destroyOmn3D() {
    cancelAnimationFrame(omnState.animationId);
    window.removeEventListener('resize', onOmnResize);
    if (omnEl.canvasContainer) omnEl.canvasContainer.innerHTML = '';
    omnState.scene = null;
    omnState.globeMesh = null;
    omnState.atmosphereMesh = null;
    omnState.ringMesh = null;
}

function onOmnResize() {
    if (!omnState.camera || !omnState.renderer) return;
    const w = window.innerWidth, h = window.innerHeight;
    omnState.renderer.setSize(w, h);
    omnState.camera.aspect = w / h;
    omnState.camera.updateProjectionMatrix();
}

function animateOmn3D() {
    if (!omnState.isActive) return;
    omnState.animationId = requestAnimationFrame(animateOmn3D);
    const t = omnState.clock ? omnState.clock.getElapsedTime() : 0;

    if (omnState.globeMesh) {
        omnState.globeMesh.rotation.y += 0.003;
        omnState.globeMesh.rotation.x = Math.sin(t * 0.2) * 0.15;
    }
    if (omnState._core) {
        omnState._core.rotation.y -= 0.002;
        omnState._core.material.opacity = 0.1 + Math.sin(t * 1.5) * 0.08;
    }
    if (omnState.ringMesh) {
        omnState.ringMesh.rotation.z += 0.004;
    }
    if (omnState._ring2) {
        omnState._ring2.rotation.z -= 0.003;
        omnState._ring2.rotation.y += 0.001;
    }
    if (omnState.particleSystem) {
        omnState.particleSystem.rotation.y += 0.002;
    }
    if (omnState.starsMesh) {
        omnState.starsMesh.rotation.y -= 0.0003;
    }
    if (omnState.atmosphereMesh) {
        omnState.atmosphereMesh.material.opacity = 0.05 + Math.sin(t * 0.8) * 0.05;
    }

    omnState.renderer.render(omnState.scene, omnState.camera);
}

// Evolve Globe
function evolveGlobe() {
    if (!omnState.globeMesh) return;
    const lvl = omnState.level;

    if (lvl >= 4) {
        omnState.globeMesh.material.wireframe = false;
        omnState.globeMesh.material.color.setHex(0x1e3a8a);
        omnState.globeMesh.material.emissive.setHex(0x1e1b4b);
    }
    if (lvl >= 8) {
        omnState.globeMesh.material.color.setHex(0x0284c7);
        omnState.globeMesh.material.emissive.setHex(0x0c4a6e);
        if (omnState.atmosphereMesh) {
            omnState.atmosphereMesh.material.color.setHex(0x0ea5e9);
            omnState.atmosphereMesh.material.opacity = 0.15;
        }
    }
    if (lvl >= 15) {
        omnState.globeMesh.material.color.setHex(0xf59e0b);
        omnState.globeMesh.material.emissive.setHex(0x92400e);
        if (omnState.atmosphereMesh) {
            omnState.atmosphereMesh.material.color.setHex(0xfcd34d);
            omnState.atmosphereMesh.material.opacity = 0.25;
        }
        if (omnState._nebula) omnState._nebula.material.color.setHex(0x3a1a0a);
    }
    if (lvl >= 25) {
        omnState.globeMesh.material.color.setHex(0xffffff);
        omnState.globeMesh.material.emissive.setHex(0xc4b5fd);
        if (omnState.ringMesh) omnState.ringMesh.material.color.setHex(0xfde68a);
    }
}

// Correct answer burst effect
function spawnCorrectBurst() {
    if (!omnState.globeMesh) return;
    omnState.globeMesh.scale.set(1.15, 1.15, 1.15);
    setTimeout(() => { if (omnState.globeMesh) omnState.globeMesh.scale.set(1, 1, 1); }, 250);
    if (omnState.atmosphereMesh) {
        omnState.atmosphereMesh.material.opacity = 0.3;
        setTimeout(() => { if (omnState.atmosphereMesh) omnState.atmosphereMesh.material.opacity = 0.08; }, 400);
    }
}

/* ================== TIMER ================== */

function startOmnTimer() {
    cancelAnimationFrame(omnState.timerInterval);
    // Timer gets tighter as levels increase
    omnState.timerMax = Math.max(8, 20 - Math.floor(omnState.level / 3));
    omnState.timerLeft = omnState.timerMax;
    updateTimerBar();

    let lastTime = performance.now();
    const tick = (now) => {
        if (!omnState.isActive) return;
        const dt = (now - lastTime) / 1000;
        lastTime = now;
        omnState.timerLeft -= dt;
        updateTimerBar();
        if (omnState.timerLeft <= 0) {
            handleTimeout();
        } else {
            omnState.timerInterval = requestAnimationFrame(tick);
        }
    };
    omnState.timerInterval = requestAnimationFrame(tick);
}

function updateTimerBar() {
    const bar = omnEl.timerBar;
    if (!bar) return;
    const pct = Math.max(0, omnState.timerLeft / omnState.timerMax) * 100;
    bar.style.width = pct + '%';

    // Color shift: green → yellow → red
    if (pct > 50) bar.style.background = 'linear-gradient(90deg, #2ed573, #7bed9f)';
    else if (pct > 25) bar.style.background = 'linear-gradient(90deg, #eccc68, #ffa502)';
    else bar.style.background = 'linear-gradient(90deg, #ff4757, #ff6b81)';
}

function handleTimeout() {
    // Treat as wrong answer
    omnEl.answerBtns.forEach(b => {
        b.disabled = true;
        if (b.dataset.correct === "true") {
            b.classList.add("omn-answer-correct");
        }
    });
    omnState.streak = 0;
    omnState.lives--;
    updateOmnHUD();

    if (omnEl.canvasContainer) {
        omnEl.canvasContainer.style.animation = "omnShake 0.4s ease";
        setTimeout(() => { if (omnEl.canvasContainer) omnEl.canvasContainer.style.animation = ""; }, 400);
    }

    if (omnState.lives <= 0) {
        setTimeout(() => endOmnGame(), 1500);
    } else {
        setTimeout(() => nextOmnQuestion(), 2000);
    }
}

/* ================== LIFELINES ================== */

// 1. 50/50 — Remove 2 wrong answers
function useFiftyFifty() {
    if (omnState.fiftyFiftyUsed || !omnState.isActive) return;
    omnState.fiftyFiftyUsed = true;
    disableLifelineBtn(omnEl.fiftyBtn);

    let wrongBtns = [];
    omnEl.answerBtns.forEach(b => {
        if (b.dataset.correct === "false" && b.style.display !== "none") wrongBtns.push(b);
    });
    wrongBtns.sort(() => 0.5 - Math.random());
    for (let i = 0; i < Math.min(2, wrongBtns.length); i++) {
        wrongBtns[i].style.opacity = "0.15";
        wrongBtns[i].style.pointerEvents = "none";
        wrongBtns[i].style.transform = "scale(0.9)";
    }
}

// 2. Extra Time — Add 10 seconds to the timer
function useExtraTime() {
    if (omnState.extraTimeUsed || !omnState.isActive) return;
    omnState.extraTimeUsed = true;
    disableLifelineBtn(omnEl.timeBtn);

    omnState.timerMax += 10;
    omnState.timerLeft += 10;
    updateTimerBar();

    // Flash effect
    if (omnEl.timerBar) {
        omnEl.timerBar.style.boxShadow = '0 0 20px rgba(46,213,115,0.8)';
        setTimeout(() => { if (omnEl.timerBar) omnEl.timerBar.style.boxShadow = ''; }, 500);
    }
}

// 3. Skip Question — Skip without penalty
function useSkip() {
    if (omnState.skipUsed || !omnState.isActive) return;
    omnState.skipUsed = true;
    disableLifelineBtn(omnEl.skipBtn);
    cancelAnimationFrame(omnState.timerInterval);
    nextOmnQuestion();
}

function disableLifelineBtn(btn) {
    if (!btn) return;
    btn.disabled = true;
}

/* ================== GAME LOGIC ================== */

function updateOmnHUD() {
    if (omnEl.levelDisplay) omnEl.levelDisplay.textContent = omnState.level;
    if (omnEl.scoreDisplay) omnEl.scoreDisplay.textContent = omnState.score;
    if (omnEl.livesDisplay) omnEl.livesDisplay.textContent = "❤️".repeat(omnState.lives) + "🖤".repeat(Math.max(0, 3 - omnState.lives));
    if (omnEl.streakDisplay) {
        if (omnState.streak >= 2) {
            omnEl.streakDisplay.textContent = `🔥 ${omnState.streak}x`;
            omnEl.streakDisplay.style.display = "block";
        } else {
            omnEl.streakDisplay.style.display = "none";
        }
    }
}

async function startOmnGame() {
    // Clean up any previous session
    cancelAnimationFrame(omnState.timerInterval);
    cancelAnimationFrame(omnState.animationId);
    if (omnState.scene) destroyOmn3D();

    // Re-fetch DOM refs (in case of stale refs after restart)
    omnEl.hubView = document.getElementById("games-hub-view");
    omnEl.gameView = document.getElementById("omniscient-game-view");
    omnEl.canvasContainer = document.getElementById("omn-canvas-container");
    omnEl.levelDisplay = document.getElementById("omn-level");
    omnEl.scoreDisplay = document.getElementById("omn-score");
    omnEl.livesDisplay = document.getElementById("omn-lives");
    omnEl.streakDisplay = document.getElementById("omn-streak");
    omnEl.questionText = document.getElementById("omn-question-text");
    omnEl.answerBtns = document.querySelectorAll(".omn-answer-btn");
    omnEl.gameOverModal = document.getElementById("omn-gameover-overlay");
    omnEl.goScore = document.getElementById("omn-go-score");
    omnEl.goLevel = document.getElementById("omn-go-level");
    omnEl.goStreak = document.getElementById("omn-go-streak");
    omnEl.timerBar = document.getElementById("omn-timer-bar");
    omnEl.categoryBadge = document.getElementById("omn-category-badge");
    omnEl.qCounter = document.getElementById("omn-q-counter");
    omnEl.fiftyBtn = document.getElementById("omn-fifty-btn");
    omnEl.timeBtn = document.getElementById("omn-time-btn");
    omnEl.skipBtn = document.getElementById("omn-skip-btn");

    omnState.isActive = true;
    omnState.level = 1;
    omnState.score = 0;
    omnState.lives = 3;
    omnState.streak = 0;
    omnState.bestStreak = 0;
    omnState.questionsAnswered = 0;
    omnState.questionsPool = [];
    omnState.fiftyFiftyUsed = false;
    omnState.extraTimeUsed = false;
    omnState.skipUsed = false;
    omnState.categoryIndex = Math.floor(Math.random() * OMN_CATEGORIES.length);

    updateOmnHUD();

    omnEl.hubView.classList.add("hidden");
    omnEl.gameView.classList.remove("hidden");
    omnEl.gameOverModal.classList.add("hidden");
    document.body.classList.add("game-active");
    const nb = document.querySelector(".nav-bar"); if (nb) nb.style.display = "none";

    // Reset all lifeline buttons
    [omnEl.fiftyBtn, omnEl.timeBtn, omnEl.skipBtn].forEach(btn => {
        if (btn) { btn.disabled = false; }
    });

    omnEl.questionText.textContent = "Connecting to the global databank...";
    omnEl.questionText.style.opacity = "1";
    omnEl.answerBtns.forEach(btn => {
        btn.textContent = "—";
        btn.disabled = true;
        btn.className = "omn-answer-btn omn-glass-panel";
        btn.style.pointerEvents = "auto";
        btn.style.opacity = "1";
        btn.style.transform = "";
        // Re-bind click handler (removes duplicates via clone trick)
    });

    // Re-bind answer click handlers
    omnEl.answerBtns.forEach(btn => {
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        newBtn.addEventListener("click", handleOmnAnswer);
    });
    // Update the ref after clone
    omnEl.answerBtns = document.querySelectorAll(".omn-answer-btn");

    initOmn3D();
    await ensureQuestions();
    nextOmnQuestion();
}

async function nextOmnQuestion() {
    if (!omnState.isActive) return;
    cancelAnimationFrame(omnState.timerInterval);

    // Level up every 5 correct answers
    if (omnState.questionsAnswered > 0 && omnState.questionsAnswered % 5 === 0) {
        omnState.level++;
        evolveGlobe();
    }

    // Clear pool at difficulty transitions so we fetch fresh questions at the new tier
    const qa = omnState.questionsAnswered;
    if (qa === 6 || qa === 20 || qa === 40) {
        omnState.questionsPool = [];
    }

    await ensureQuestions();
    updateOmnHUD();

    if (omnState.questionsPool.length === 0) {
        omnEl.questionText.textContent = "Re-syncing with global knowledge base...";
        setTimeout(() => ensureQuestions().then(() => nextOmnQuestion()), 1500);
        return;
    }

    omnState.currentQuestion = omnState.questionsPool.pop();

    // Animate transition
    omnEl.questionText.style.opacity = "0";
    omnEl.questionText.style.transform = "translateY(10px)";
    omnEl.answerBtns.forEach(b => { b.style.opacity = "0"; b.style.transform = "translateY(10px)"; });

    setTimeout(() => {
        renderOmnQuestion(omnState.currentQuestion);
        startOmnTimer();
    }, 350);
}

function renderOmnQuestion(q) {
    // Show category badge
    if (omnEl.categoryBadge) {
        const cat = OMN_CATEGORIES.find(c => q.category && q.category.includes(c.name));
        omnEl.categoryBadge.textContent = cat ? `${cat.icon} ${cat.name}` : `🌐 ${q.category || 'General'}`;
        omnEl.categoryBadge.style.display = "inline-block";
    }

    // Question counter
    if (omnEl.qCounter) {
        omnEl.qCounter.textContent = `Q${omnState.questionsAnswered + 1}`;
    }

    omnEl.questionText.textContent = q.question;
    omnEl.questionText.style.opacity = "1";
    omnEl.questionText.style.transform = "translateY(0)";

    const letters = ['A', 'B', 'C', 'D'];
    let answers = [...q.incorrect_answers, q.correct_answer].sort(() => Math.random() - 0.5);

    omnEl.answerBtns.forEach((btn, idx) => {
        if (idx < answers.length) {
            btn.innerHTML = `<span class="omn-letter">${letters[idx]}</span> <span class="omn-answer-text">${answers[idx]}</span>`;
            btn.style.display = "block";
            btn.dataset.correct = answers[idx] === q.correct_answer ? "true" : "false";
        } else {
            btn.style.display = "none";
        }
        btn.disabled = false;
        btn.className = "omn-answer-btn omn-glass-panel";
        btn.style.opacity = "1";
        btn.style.transform = "translateY(0)";
        btn.style.pointerEvents = "auto";
        btn.style.background = "";
        btn.style.boxShadow = "";
        btn.style.borderColor = "";
        btn.blur(); // Force-clear focus/hover state on mobile
    });
}

function handleOmnAnswer(e) {
    const btn = e.target.closest('.omn-answer-btn');
    if (!btn || btn.disabled) return;

    cancelAnimationFrame(omnState.timerInterval);
    omnEl.answerBtns.forEach(b => b.disabled = true);

    const isCorrect = btn.dataset.correct === "true";

    if (isCorrect) {
        btn.classList.add("omn-answer-correct");
        omnState.streak++;
        if (omnState.streak > omnState.bestStreak) omnState.bestStreak = omnState.streak;
        let points = 10;
        if (omnState.currentQuestion.difficulty === "medium") points = 20;
        if (omnState.currentQuestion.difficulty === "hard") points = 30;
        // Streak multiplier
        if (omnState.streak >= 3) points = Math.round(points * 1.5);
        if (omnState.streak >= 5) points = Math.round(points * 2);

        omnState.score += points;
        omnState.questionsAnswered++;

        // Show floating +points
        spawnFloatingPoints(points);
        spawnCorrectBurst();

        setTimeout(() => nextOmnQuestion(), 1200);
    } else {
        btn.classList.add("omn-answer-wrong");
        omnEl.answerBtns.forEach(b => {
            if (b.dataset.correct === "true") {
                b.classList.add("omn-answer-correct");
            }
        });
        omnState.streak = 0;
        omnState.lives--;
        updateOmnHUD();

        if (omnEl.canvasContainer) {
            omnEl.canvasContainer.style.animation = "omnShake 0.4s ease";
            setTimeout(() => { if (omnEl.canvasContainer) omnEl.canvasContainer.style.animation = ""; }, 400);
        }

        if (omnState.lives <= 0) {
            setTimeout(() => endOmnGame(), 1500);
        } else {
            setTimeout(() => nextOmnQuestion(), 2000);
        }
    }
}

function spawnFloatingPoints(pts) {
    const el = document.createElement('div');
    el.textContent = `+${pts}`;
    el.style.cssText = `
        position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
        font-size: 2.5rem; font-weight: 900; color: #2ed573;
        text-shadow: 0 0 20px rgba(46,213,115,0.8);
        pointer-events: none; z-index: 999;
        animation: omnPointsFloat 1s ease forwards;
    `;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1100);
}

function endOmnGame() {
    omnState.isActive = false;
    cancelAnimationFrame(omnState.timerInterval);
    cancelAnimationFrame(omnState.animationId);

    if (omnState.score > omnState.hsScore) {
        omnState.hsScore = omnState.score;
        appStorage.setItem("omnHsScore", omnState.score);
    }
    if (omnState.level > omnState.hsLevel) {
        omnState.hsLevel = omnState.level;
        appStorage.setItem("omnHsLevel", omnState.level);
    }

    omnEl.goScore.textContent = omnState.score;
    omnEl.goLevel.textContent = omnState.level;
    if (omnEl.goStreak) omnEl.goStreak.textContent = omnState.bestStreak;
    omnEl.gameOverModal.classList.remove("hidden");
    omnState.questionsPool = [];
}

/* ================== BINDINGS ================== */
document.addEventListener("DOMContentLoaded", () => {
    omnEl = {
        hubView: document.getElementById("games-hub-view"),
        gameView: document.getElementById("omniscient-game-view"),
        canvasContainer: document.getElementById("omn-canvas-container"),
        levelDisplay: document.getElementById("omn-level"),
        scoreDisplay: document.getElementById("omn-score"),
        livesDisplay: document.getElementById("omn-lives"),
        streakDisplay: document.getElementById("omn-streak"),
        questionText: document.getElementById("omn-question-text"),
        answerBtns: document.querySelectorAll(".omn-answer-btn"),
        gameOverModal: document.getElementById("omn-gameover-overlay"),
        goScore: document.getElementById("omn-go-score"),
        goLevel: document.getElementById("omn-go-level"),
        goStreak: document.getElementById("omn-go-streak"),
        timerBar: document.getElementById("omn-timer-bar"),
        categoryBadge: document.getElementById("omn-category-badge"),
        qCounter: document.getElementById("omn-q-counter"),
        fiftyBtn: document.getElementById("omn-fifty-btn"),
        timeBtn: document.getElementById("omn-time-btn"),
        skipBtn: document.getElementById("omn-skip-btn"),
    };

    document.getElementById("card-omniscient")?.addEventListener("click", startOmnGame);

    omnEl.answerBtns.forEach(btn => btn.addEventListener("click", handleOmnAnswer));

    document.getElementById("back-to-hub-omniscient")?.addEventListener("click", () => {
        document.body.classList.remove("game-active");
        omnEl.gameView.classList.add("hidden");
        omnEl.hubView.classList.remove("hidden");
        const nb = document.querySelector(".nav-bar"); if (nb) nb.style.display = "";
        if (omnState.isActive) endOmnGame();
        if (omnState.scene) destroyOmn3D();
    });

    document.getElementById("omn-play-again")?.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        startOmnGame();
    });

    document.getElementById("omn-fifty-btn")?.addEventListener("click", useFiftyFifty);
    document.getElementById("omn-time-btn")?.addEventListener("click", useExtraTime);
    document.getElementById("omn-skip-btn")?.addEventListener("click", useSkip);
});

