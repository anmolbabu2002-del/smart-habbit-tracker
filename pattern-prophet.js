/* =========================================================================
   PATTERN PROPHET — Addictive Sequence Prediction Game (V3 100% Logic)
   ========================================================================= */
document.addEventListener("DOMContentLoaded", () => {

    // ─── Hub Navigation ───
    const hubView = document.getElementById("games-hub-view");
    const ppView = document.getElementById("pattern-prophet-view");

    document.getElementById("card-pattern-prophet")?.addEventListener("click", () => {
        if (hubView) hubView.classList.add("hidden");
        if (ppView) ppView.classList.remove("hidden");
    });
    document.getElementById("back-to-hub-pattern")?.addEventListener("click", () => {
        if (ppView) ppView.classList.add("hidden");
        if (hubView) hubView.classList.remove("hidden");
        resetGame();
    });

    // ─── DOM Elements ───
    const startBtn = document.getElementById("pp-start-btn");
    const sequenceArea = document.getElementById("pp-sequence-area");
    const choicesArea = document.getElementById("pp-choices-area");
    const levelEl = document.getElementById("pp-level");
    const scoreEl = document.getElementById("pp-score");
    const highScoreEl = document.getElementById("pp-highscore");
    const highLevelEl = document.getElementById("pp-highlevel");
    const livesEl = document.getElementById("pp-lives");
    const streakEl = document.getElementById("pp-streak");
    const xpFill = document.getElementById("pp-xp-fill");
    const xpText = document.getElementById("pp-xp-text");
    const comboText = document.getElementById("pp-combo-text");
    const menuOverlay = document.getElementById("pp-menu-overlay");
    const gameOverOverlay = document.getElementById("pp-gameover-overlay");
    const goScoreEl = document.getElementById("pp-go-score");
    const goLevelEl = document.getElementById("pp-go-level");
    const goStreakEl = document.getElementById("pp-go-streak");
    const goNewRecord = document.getElementById("pp-go-newrecord");
    const playAgainBtn = document.getElementById("pp-play-again");
    const timerBar = document.getElementById("pp-timer-fill");
    const gameContainer = document.getElementById("pp-game-container");
    const particleLayer = document.getElementById("pp-particles");
    const bgGlow = document.getElementById("pp-bg-glow");

    if (!startBtn || !sequenceArea || !choicesArea) return;

    // ─── Pure Logic Themes (for structural patterns) ───
    const THEMES = [
        { name: "Shapes", emojis: ["🔴","🟦","🔺","🔶","🟢","🟣","🔲","💠"], bg: "linear-gradient(135deg, #1a0a2a, #2a1a3a)" },
        { name: "Faces", emojis: ["😀","😎","🤔","😴","🤯","🥶","😈","🤠"], bg: "linear-gradient(135deg, #0a2a3a, #1a3a4a)" },
        { name: "Animals", emojis: ["🐱","🐶","🦊","🐼","🦁","🐸","🐵","🐰"], bg: "linear-gradient(135deg, #0a2a0a, #1a4a1a)" },
        { name: "Sweets", emojis: ["🍬","🍭","🧁","🍩","🍰","🍫","🍪","🍦"], bg: "linear-gradient(135deg, #3a0a2a, #5a1a4a)" }
    ];

    // ─── Real-World Logical Progressions ───
    const LOGIC_POOLS = {
        numbers: ["0️⃣","1️⃣","2️⃣","3️⃣","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣","9️⃣","🔟"],
        clocks: ["🕛","🕐","🕑","🕒","🕓","🕔","🕕","🕖","🕗","🕘","🕙","🕚"],
        moons: ["🌑","🌒","🌓","🌔","🌕","🌖","🌗","🌘"],
        arrows: ["⬆️","↗️","➡️","↘️","⬇️","↙️","⬅️","↖️"]
    };

    const EVOLUTIONS = [
        ["🌱","🌿","🌳","🍎"],
        ["🥚","🐣","🐥","🐔"],
        ["☁️","🌥️","⛅","🌤️","☀️"],
        ["👶","👦","👨","👴"]
    ];

    // ─── State ───
    let state = {
        level: 1,
        score: 0,
        lives: 3,
        streak: 0,
        bestStreak: 0,
        xp: 0,
        xpToNext: 100,
        roundsPlayed: 0,
        isActive: false,
        currentPatternBg: "",
        highScore: parseInt(localStorage.getItem("ppHighScore") || 0),
        highLevel: parseInt(localStorage.getItem("ppHighLevel") || 1),
        bestStreakEver: parseInt(localStorage.getItem("ppBestStreak") || 0),
        timerRAF: null,
        timerStart: 0,
        timerDuration: 0,
    };

    // Init display
    if (highScoreEl) highScoreEl.textContent = state.highScore;
    if (highLevelEl) highLevelEl.textContent = state.highLevel;

    // ─── Difficulty is ALWAYS based on score, never resets ───
    function getDifficultyTier() {
        const s = state.score;
        if (s < 50)   return 1;
        if (s < 150)  return 2;
        if (s < 300)  return 3;
        if (s < 500)  return 4;
        if (s < 800)  return 5;
        if (s < 1200) return 6;
        if (s < 1800) return 7;
        return 8;
    }

    // ─── Combo Labels ───
    const COMBOS = [
        { min: 2, text: "Nice! 👍", color: "#2ed573" },
        { min: 4, text: "Great! 🔥", color: "#ffa502" },
        { min: 7, text: "On Fire! ⚡", color: "#ff6b35" },
        { min: 10, text: "INSANE! 🤯", color: "#e74c3c" },
        { min: 15, text: "UNSTOPPABLE! 💀", color: "#9b59b6" },
        { min: 20, text: "G O D L I K E 👑", color: "#f39c12" },
    ];

    function getComboData(streak) {
        let result = null;
        for (const c of COMBOS) {
            if (streak >= c.min) result = c;
        }
        return result;
    }

    // ─── Utility ───
    function pick(arr, exclude) {
        const filtered = exclude ? arr.filter(e => e !== exclude) : [...arr];
        return filtered[Math.floor(Math.random() * filtered.length)];
    }

    function pickN(arr, n) {
        const shuffled = [...arr].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, n);
    }

    function shuffle(arr) {
        const a = [...arr];
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }

    function pickTheme() {
        return THEMES[Math.floor(Math.random() * THEMES.length)];
    }

    function getStructuralChoices(answer, usedEmojis, theme) {
        const choices = new Set([answer]);
        usedEmojis.forEach(e => choices.add(e));
        let attempts = 0;
        while(choices.size < 4 && attempts < 50) {
            choices.add(pick(theme.emojis));
            attempts++;
        }
        return shuffle([...choices]);
    }

    // ─── Particle Effects ───
    function spawnParticles(x, y, count, emojis) {
        if (!particleLayer) return;
        const validEmojis = emojis && emojis.length ? emojis : THEMES[0].emojis;
        for (let i = 0; i < count; i++) {
            const p = document.createElement("div");
            p.className = "pp-particle";
            p.textContent = pick(validEmojis);
            const angle = (Math.PI * 2 / count) * i + (Math.random() * 0.5);
            const dist = 60 + Math.random() * 80;
            p.style.left = x + "px";
            p.style.top = y + "px";
            p.style.setProperty("--dx", Math.cos(angle) * dist + "px");
            p.style.setProperty("--dy", Math.sin(angle) * dist + "px");
            p.style.setProperty("--rot", (Math.random() * 360) + "deg");
            particleLayer.appendChild(p);
            setTimeout(() => p.remove(), 900);
        }
    }

    function spawnScreenParticles(emojis) {
        if (!particleLayer) return;
        const validEmojis = emojis && emojis.length ? emojis : THEMES[0].emojis;
        for (let i = 0; i < 12; i++) {
            const p = document.createElement("div");
            p.className = "pp-screen-particle";
            p.textContent = pick(validEmojis);
            p.style.left = (Math.random() * 100) + "%";
            p.style.animationDelay = (Math.random() * 0.3) + "s";
            particleLayer.appendChild(p);
            setTimeout(() => p.remove(), 1500);
        }
    }

    function flashBg(color, duration = 600) {
        if (!bgGlow) return;
        bgGlow.style.background = `radial-gradient(circle at center, ${color}40 0%, transparent 70%)`;
        bgGlow.style.opacity = "1";
        setTimeout(() => { bgGlow.style.opacity = "0"; }, duration);
    }

    // ─── 100% Logical Pattern Generators ───

    // Structural T1: ABABA -> B
    function genAlternating() {
        const theme = pickTheme();
        const [a, b] = pickN(theme.emojis, 2);
        const seq = [a, b, a, b, a];
        const answer = b;
        return { sequence: seq, answer, bg: theme.bg, choices: getStructuralChoices(answer, [a,b], theme), label: "Alternating" };
    }

    // Logic T1: Evolution
    function genEvolution() {
        const pool = pick(EVOLUTIONS);
        const seq = pool.slice(0, 3);
        const answer = pool[3];
        const choices = shuffle([...pool]); // The choices are exactly the 4 stages
        return { sequence: seq, answer, bg: THEMES[0].bg, choices, label: "Evolution" };
    }

    // Structural T2: ABCAB -> C
    function genTriple() {
        const theme = pickTheme();
        const [a, b, c] = pickN(theme.emojis, 3);
        const seq = [a, b, c, a, b];
        const answer = c;
        return { sequence: seq, answer, bg: theme.bg, choices: getStructuralChoices(answer, [a,b,c], theme), label: "Triple Cycle" };
    }

    // Logic T2/T4/T7: Step progressions (Moons, Clocks, Arrows, Numbers)
    function genLogicStep(step, label) {
        const keys = ["numbers", "clocks", "moons", "arrows"];
        const poolKey = pick(keys);
        const pool = LOGIC_POOLS[poolKey];
        const sequenceLen = 4;
        const start = Math.floor(Math.random() * pool.length);
        const seq = [];
        for(let i=0; i<sequenceLen; i++) {
            seq.push(pool[(start + i*step) % pool.length]);
        }
        const answer = pool[(start + sequenceLen*step) % pool.length];
        
        const choices = new Set([answer]);
        choices.add(seq[sequenceLen-1]); // add last item to trick
        while(choices.size < 4) choices.add(pick(pool));
        
        return { sequence: seq, answer, bg: THEMES[1].bg, choices: shuffle([...choices]), label: label };
    }

    function genStep1() { return genLogicStep(1, "Sequential"); }
    function genStep2() { return genLogicStep(2, "Skip 1"); }
    function genStep3() { return genLogicStep(3, "Skip 2"); }

    // Structural T3: AABBA -> A (A A B B A A -> B)
    function genPairs() {
        const theme = pickTheme();
        const [a, b] = pickN(theme.emojis, 2);
        const seq = [a, a, b, b, a];
        const answer = a;
        return { sequence: seq, answer, bg: theme.bg, choices: getStructuralChoices(answer, [a,b], theme), label: "Pairs" };
    }

    // Structural T5: ABBABB -> A
    function genOneTwo() {
        const theme = pickTheme();
        const [a, b] = pickN(theme.emojis, 2);
        const seq = [a, b, b, a, b, b];
        const answer = a;
        return { sequence: seq, answer, bg: theme.bg, choices: getStructuralChoices(answer, [a,b], theme), label: "One-Two" };
    }

    // Structural T6: ABCDCB -> A
    function genPalindrome() {
        const theme = pickTheme();
        const [a, b, c, d] = pickN(theme.emojis, 4);
        const seq = [a, b, c, d, c, b];
        const answer = a;
        return { sequence: seq, answer, bg: theme.bg, choices: getStructuralChoices(answer, [a,b,c,d], theme), label: "Mirror" };
    }

    // Logic T8: Fibonacci Numbers
    function genFib() {
        const pool = LOGIC_POOLS.numbers;
        const fibs = [0,1,1,2,3,5,8];
        const start = Math.floor(Math.random() * 2); // 0 or 1
        const seq = [ pool[fibs[start]], pool[fibs[start+1]], pool[fibs[start+2]], pool[fibs[start+3]], pool[fibs[start+4]] ];
        const answer = pool[fibs[start+5]];
        const choices = new Set([answer]);
        while(choices.size < 4) choices.add(pick(pool));
        return { sequence: seq, answer, bg: THEMES[3].bg, choices: shuffle([...choices]), label: "Fibonacci Sequence" };
    }

    // ─── Tier Selection ───
    const GENERATORS = [
        { tier: 1, fn: genAlternating },
        { tier: 1, fn: genEvolution },
        { tier: 2, fn: genTriple },
        { tier: 2, fn: genStep1 },
        { tier: 3, fn: genPairs },
        { tier: 4, fn: genStep2 },
        { tier: 5, fn: genOneTwo },
        { tier: 6, fn: genPalindrome },
        { tier: 7, fn: genStep3 },
        { tier: 8, fn: genFib },
    ];

    function getPatternForTier(tier) {
        const available = GENERATORS.filter(g => tier >= g.tier);
        const topPicks = available.slice(-Math.min(3, available.length));
        const gen = topPicks[Math.floor(Math.random() * topPicks.length)];
        return gen.fn();
    }

    // ─── Timer ───
    function getTimerDuration() {
        const tier = getDifficultyTier();
        if (tier <= 2) return 20000;
        if (tier <= 4) return 15000;
        if (tier <= 5) return 12000;
        if (tier <= 6) return 10000;
        if (tier <= 7) return 8000;
        return Math.max(5000, 8000 - (tier - 7) * 500); // bottoms at 5s
    }

    function startTimer() {
        state.timerDuration = getTimerDuration();
        state.timerStart = performance.now();
        if (timerBar) timerBar.style.width = "100%";

        function tick(now) {
            if (!state.isActive) return;
            const elapsed = now - state.timerStart;
            const pct = Math.max(0, 1 - elapsed / state.timerDuration);
            if (timerBar) {
                timerBar.style.width = (pct * 100) + "%";
                if (pct > 0.5) timerBar.style.background = "linear-gradient(90deg, #2ed573, #7bed9f)";
                else if (pct > 0.25) timerBar.style.background = "linear-gradient(90deg, #ffa502, #eccc68)";
                else timerBar.style.background = "linear-gradient(90deg, #ff4757, #ff6b81)";
            }
            if (pct <= 0) {
                handleWrong(null, null);
                return;
            }
            state.timerRAF = requestAnimationFrame(tick);
        }
        state.timerRAF = requestAnimationFrame(tick);
    }

    function stopTimer() {
        if (state.timerRAF) {
            cancelAnimationFrame(state.timerRAF);
            state.timerRAF = null;
        }
    }

    // ─── Display Update ───
    function updateUI() {
        if (levelEl) levelEl.textContent = state.level;
        if (scoreEl) scoreEl.textContent = state.score;
        if (livesEl) {
            livesEl.innerHTML = "";
            for (let i = 0; i < 3; i++) {
                const heart = document.createElement("span");
                heart.className = i < state.lives ? "pp-heart pp-heart-alive" : "pp-heart pp-heart-dead";
                heart.textContent = i < state.lives ? "❤️" : "🖤";
                livesEl.appendChild(heart);
            }
        }
        if (streakEl) {
            streakEl.textContent = state.streak;
            if (state.streak >= 5) {
                streakEl.classList.add("pp-streak-fire");
            } else {
                streakEl.classList.remove("pp-streak-fire");
            }
        }
        if (xpFill) xpFill.style.width = Math.min(100, (state.xp / state.xpToNext) * 100) + "%";
        if (xpText) xpText.textContent = `${state.xp} / ${state.xpToNext} XP`;

        const diffEl = document.getElementById("pp-difficulty");
        if (diffEl) {
            const tier = getDifficultyTier();
            const labels = ["", "Beginner", "Easy", "Normal", "Tricky", "Hard", "Expert", "Master", "Legendary"];
            diffEl.textContent = labels[tier] || "Legendary";
            diffEl.className = "pp-difficulty-badge pp-diff-" + tier;
        }
    }

    // ─── Render Sequence & Choices ───
    function renderRound() {
        const tier = getDifficultyTier();
        const pattern = getPatternForTier(tier);
        
        // Cache choices for particles
        state.currentPatternEmojis = Array.from(pattern.choices);

        // Update theme background
        if (gameContainer && pattern.bg) {
            gameContainer.style.background = pattern.bg;
        }

        // Show pattern type label
        const labelEl = document.getElementById("pp-pattern-label");
        if (labelEl) {
            labelEl.textContent = pattern.label;
            labelEl.classList.remove("pp-label-anim");
            void labelEl.offsetWidth;
            labelEl.classList.add("pp-label-anim");
        }

        // Render sequence tiles
        sequenceArea.innerHTML = "";
        const allItems = [...pattern.sequence, "❓"];
        allItems.forEach((emoji, i) => {
            const tile = document.createElement("div");
            tile.className = "pp-tile";
            if (emoji === "❓") {
                tile.classList.add("pp-tile-question");
                tile.innerHTML = '<span class="pp-q-mark">?</span>';
            } else {
                tile.innerHTML = `<span class="pp-tile-emoji">${emoji}</span>`;
            }
            tile.style.animationDelay = (i * 0.07) + "s";
            sequenceArea.appendChild(tile);
        });

        // Render choice buttons
        choicesArea.innerHTML = "";
        pattern.choices.forEach((emoji, i) => {
            const btn = document.createElement("button");
            btn.className = "pp-choice-btn";
            btn.innerHTML = `<span class="pp-choice-emoji">${emoji}</span>`;
            btn.style.animationDelay = (0.3 + i * 0.08) + "s";
            btn.addEventListener("click", () => {
                if (!state.isActive) return;
                state.isActive = false;
                stopTimer();
                if (emoji === pattern.answer) {
                    handleCorrect(emoji, btn);
                } else {
                    handleWrong(btn, pattern.answer);
                }
            });
            choicesArea.appendChild(btn);
        });

        startTimer();
        state.roundsPlayed++;
    }

    // ─── Correct Answer ───
    function handleCorrect(emoji, btn) {
        state.streak++;
        if (state.streak > state.bestStreak) state.bestStreak = state.streak;

        if (state.streak > state.bestStreakEver) {
            state.bestStreakEver = state.streak;
            localStorage.setItem("ppBestStreak", state.bestStreakEver);
        }

        const multiplier = Math.max(1, Math.floor(state.streak / 3) + 1);
        const points = (15 + getDifficultyTier() * 8) * multiplier;
        state.score += points;
        state.xp += points;

        while (state.xp >= state.xpToNext) {
            state.xp -= state.xpToNext;
            state.level++;
            state.xpToNext = Math.floor(state.xpToNext * 1.12);
            flashBg("#f39c12", 800);
        }

        if (state.score > state.highScore) {
            state.highScore = state.score;
            localStorage.setItem("ppHighScore", state.highScore);
            if (highScoreEl) highScoreEl.textContent = state.highScore;
        }
        if (state.level > state.highLevel) {
            state.highLevel = state.level;
            localStorage.setItem("ppHighLevel", state.highLevel);
            if (highLevelEl) highLevelEl.textContent = state.highLevel;
        }

        updateUI();

        // Fill in question mark
        const qTile = sequenceArea.querySelector(".pp-tile-question");
        if (qTile) {
            qTile.innerHTML = `<span class="pp-tile-emoji">${emoji}</span>`;
            qTile.classList.remove("pp-tile-question");
            qTile.classList.add("pp-tile-correct");
        }

        // Flash button
        if (btn) btn.classList.add("pp-choice-correct");

        // Green glow
        flashBg("#2ed573", 500);

        // Particle explosion
        if (btn && gameContainer) {
            const rect = btn.getBoundingClientRect();
            const containerRect = gameContainer.getBoundingClientRect();
            spawnParticles(
                rect.left - containerRect.left + rect.width / 2,
                rect.top - containerRect.top + rect.height / 2,
                8 + state.streak * 2,
                state.currentPatternEmojis
            );
        }

        // Big streaks = screen-wide particles
        if (state.streak >= 5) {
            spawnScreenParticles(state.currentPatternEmojis);
        }

        // Show points
        showPointsPopup(btn, `+${points}`);

        // Combo text
        const combo = getComboData(state.streak);
        if (comboText && combo) {
            comboText.textContent = combo.text;
            comboText.style.setProperty("--combo-color", combo.color);
            comboText.classList.remove("pp-combo-anim");
            void comboText.offsetWidth;
            comboText.classList.add("pp-combo-anim");
        }

        setTimeout(() => {
            state.isActive = true;
            renderRound();
        }, 750);
    }

    // ─── Points Popup ───
    function showPointsPopup(btn, text) {
        if (!btn || !gameContainer) return;
        const popup = document.createElement("div");
        popup.className = "pp-points-popup";
        popup.textContent = text;
        const rect = btn.getBoundingClientRect();
        const containerRect = gameContainer.getBoundingClientRect();
        popup.style.left = (rect.left - containerRect.left + rect.width / 2) + "px";
        popup.style.top = (rect.top - containerRect.top) + "px";
        gameContainer.appendChild(popup);
        setTimeout(() => popup.remove(), 1000);
    }

    // ─── Wrong Answer ───
    function handleWrong(btn, correctAnswer) {
        state.lives--;
        state.streak = 0; // Streak resets, difficulty stays tied to score
        updateUI();

        if (btn) btn.classList.add("pp-choice-wrong");

        if (correctAnswer) {
            const allBtns = choicesArea.querySelectorAll(".pp-choice-btn");
            allBtns.forEach(b => {
                if (b.querySelector(".pp-choice-emoji")?.textContent === correctAnswer) {
                    b.classList.add("pp-choice-reveal");
                }
            });
        }

        flashBg("#ff4757", 500);

        if (gameContainer) {
            gameContainer.classList.add("pp-shake");
            setTimeout(() => gameContainer.classList.remove("pp-shake"), 500);
        }

        if (comboText) {
            comboText.textContent = "";
            comboText.classList.remove("pp-combo-anim");
        }

        if (livesEl) {
            const hearts = livesEl.querySelectorAll(".pp-heart-dead");
            const lastDead = hearts[hearts.length - 1];
            if (lastDead) {
                lastDead.classList.add("pp-heart-break");
            }
        }

        if (state.lives <= 0) {
            setTimeout(() => showGameOver(), 800);
        } else {
            setTimeout(() => {
                state.isActive = true;
                renderRound();
            }, 1200);
        }
    }

    // ─── Game Over ───
    function showGameOver() {
        state.isActive = false;
        stopTimer();
        if (goScoreEl) goScoreEl.textContent = state.score;
        if (goLevelEl) goLevelEl.textContent = state.level;
        if (goStreakEl) goStreakEl.textContent = state.bestStreak;

        const bestStreakDisplay = document.getElementById("pp-go-best-streak-ever");
        if (bestStreakDisplay) bestStreakDisplay.textContent = state.bestStreakEver;

        if (goNewRecord && state.score >= state.highScore && state.score > 0) {
            goNewRecord.style.display = "block";
        } else if (goNewRecord) {
            goNewRecord.style.display = "none";
        }
        if (gameOverOverlay) gameOverOverlay.style.display = "flex";
    }

    // ─── Start Game ───
    function startGame() {
        state.level = 1;
        state.score = 0;
        state.lives = 3;
        state.streak = 0;
        state.bestStreak = 0;
        state.xp = 0;
        state.xpToNext = 100;
        state.roundsPlayed = 0;
        state.isActive = true;

        updateUI();
        if (menuOverlay) menuOverlay.style.display = "none";
        if (gameOverOverlay) gameOverOverlay.style.display = "none";
        renderRound();
    }

    // ─── Reset ───
    function resetGame() {
        state.isActive = false;
        stopTimer();
        if (menuOverlay) menuOverlay.style.display = "flex";
        if (gameOverOverlay) gameOverOverlay.style.display = "none";
        sequenceArea.innerHTML = "";
        choicesArea.innerHTML = "";
        if (comboText) {
            comboText.textContent = "";
            comboText.classList.remove("pp-combo-anim");
        }
        if (gameContainer) gameContainer.style.background = "";
    }

    // ─── Event Listeners ───
    startBtn.addEventListener("click", startGame);
    if (playAgainBtn) playAgainBtn.addEventListener("click", startGame);

});
