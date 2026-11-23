// Removed from script.js — the old Memory Matrix, Brain Clatter (Stroop) and Tug of War.
// Replaced by focus-gym.js.

// ==================== MEMORY MATRIX BRAIN GAME ====================
document.addEventListener("DOMContentLoaded", () => {
  const gridContainer = document.getElementById("matrix-grid-container");
  const startBtn = document.getElementById("start-matrix-btn");
  const levelDisplay = document.getElementById("matrix-level-display");
  const scoreDisplay = document.getElementById("matrix-score-display");
  const highscoreDisplay = document.getElementById("matrix-highscore-display");
  const livesDisplay = document.getElementById("matrix-lives-display");
  const feedbackText = document.getElementById("matrix-feedback");

  if (!gridContainer || !startBtn) return;

  let level = 1;
  let score = 0;
  let lives = 3;
  let activePattern = [];
  let userClicks = [];
  let isAcceptingInput = false;

  // Load Highscore
  const savedMatrixHigh = appStorage.getItem("matrixHighScore") || 0;
  highscoreDisplay.textContent = savedMatrixHigh;

  // Difficulty scaling (Grid Size, Active Tiles)
  const getLevelData = (lvl) => {
    if (lvl <= 2) return { grid: 3, tiles: 3 + (lvl - 1) }; // 3x3, 3-4 tiles
    if (lvl <= 5) return { grid: 4, tiles: 4 + (lvl - 3) }; // 4x4, 4-6 tiles
    if (lvl <= 9) return { grid: 5, tiles: 5 + (lvl - 6) }; // 5x5, 5-8 tiles
    return { grid: 6, tiles: Math.min(6 + (lvl - 10), 15) }; // 6x6 max 15 tiles
  };

  const updateLivesDisplay = () => {
    livesDisplay.textContent = "❤️".repeat(lives) + "🖤".repeat(3 - lives);
  };

  const showFeedback = (text, type = "success") => {
    feedbackText.textContent = text;
    feedbackText.style.color = type === "success" ? "var(--primary)" : "#ff4757";

    feedbackText.style.transform = "translate(-50%, -50%) scale(1)";
    feedbackText.style.opacity = "1";

    setTimeout(() => {
      feedbackText.style.transform = "translate(-50%, -50%) scale(0)";
      feedbackText.style.opacity = "0";
    }, 1200);
  };

  const generateGrid = (size) => {
    gridContainer.innerHTML = "";
    gridContainer.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
    gridContainer.style.gridTemplateRows = `repeat(${size}, 1fr)`;

    for (let i = 0; i < size * size; i++) {
      const tile = document.createElement("div");
      tile.className = "matrix-tile";
      tile.dataset.index = i;
      tile.addEventListener("click", () => handleTileClick(i, tile));
      gridContainer.appendChild(tile);
    }
  };

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const startLevel = async () => {
    isAcceptingInput = false;
    userClicks = [];
    levelDisplay.textContent = level;
    scoreDisplay.textContent = score;
    updateLivesDisplay();

    const { grid, tiles } = getLevelData(level);
    generateGrid(grid);

    // Generate random pattern
    activePattern = [];
    const totalCells = grid * grid;
    while (activePattern.length < tiles) {
      const r = Math.floor(Math.random() * totalCells);
      if (!activePattern.includes(r)) activePattern.push(r);
    }

    startBtn.disabled = true;
    startBtn.style.opacity = "0.5";

    await sleep(500); // small pause before showing

    // Flash pattern
    const allTiles = document.querySelectorAll(".matrix-tile");
    activePattern.forEach(idx => {
      allTiles[idx].classList.add("flash");
    });

    // Hide after 1.5 seconds (slightly less as it gets harder)
    const memoryTime = Math.max(1500 - (level * 50), 600);
    await sleep(memoryTime);

    activePattern.forEach(idx => {
      allTiles[idx].classList.remove("flash");
    });

    isAcceptingInput = true;
  };

  const handleTileClick = async (index, tileEl) => {
    if (!isAcceptingInput) return;

    // Prevent double clicking same tile
    if (userClicks.includes(index)) return;

    if (activePattern.includes(index)) {
      // Correct click
      tileEl.classList.add("correct");
      userClicks.push(index);

      // Win condition
      if (userClicks.length === activePattern.length) {
        isAcceptingInput = false;
        score += (level * 10);
        scoreDisplay.textContent = score;
        showFeedback("Level Up!");

        // Save Highscore mid-game if broken
        const currentHigh = parseInt(appStorage.getItem("matrixHighScore") || 0);
        if (score > currentHigh) {
          appStorage.setItem("matrixHighScore", score);
          highscoreDisplay.textContent = score;
        }

        level++;
        await sleep(1500);
        startLevel();
      }
    } else {
      // Wrong click
      tileEl.classList.add("wrong");
      lives--;
      updateLivesDisplay();
      isAcceptingInput = false; // pause input during shake/feedback

      if (lives <= 0) {
        // Game Over
        showFeedback("Game Over!", "error");

        // Reveal remaining
        const allTiles = document.querySelectorAll(".matrix-tile");
        activePattern.forEach(idx => {
          if (!userClicks.includes(idx)) allTiles[idx].classList.add("flash");
        });

        startBtn.disabled = false;
        startBtn.style.opacity = "1";
        startBtn.textContent = "Try Again";
      } else {
        showFeedback("Missed!", "error");
        const allTiles = document.querySelectorAll(".matrix-tile");
        activePattern.forEach(idx => allTiles[idx].classList.add("flash")); // reveal

        await sleep(1500);
        // Drop a level if failing, but stay at least level 1
        level = Math.max(1, level - 1);
        startLevel();
      }
    }
  };

  startBtn.addEventListener("click", () => {
    level = 1;
    score = 0;
    lives = 3;
    startBtn.textContent = "Training...";
    startLevel();
  });

  const splashOverlay = document.getElementById("matrix-splash-overlay");
  const splashStartBtn = document.getElementById("splash-start-matrix-btn");

  if (splashStartBtn && splashOverlay) {
    splashStartBtn.addEventListener("click", () => {
      splashOverlay.style.opacity = "0";
      setTimeout(() => {
        splashOverlay.style.display = "none";
        startBtn.click(); // triggers the main logic above
      }, 400);
    });
  }
});
// ==================== GAMES HUB NAVIGATION ====================
document.addEventListener("DOMContentLoaded", () => {
  const hubView = document.getElementById("games-hub-view");
  const matrixView = document.getElementById("matrix-game-view");
  const cbView = document.getElementById("stroop-game-view");
  const gameNavBar = document.querySelector(".nav-bar");

  function hideGameNav() { 
      if (gameNavBar) gameNavBar.style.display = "none"; 
      document.body.classList.add("game-active");
  }
  function showGameNav() { 
      if (gameNavBar) gameNavBar.style.display = ""; 
      document.body.classList.remove("game-active");
  }

  document.getElementById("card-memory-matrix")?.addEventListener("click", () => {
    if (hubView) hubView.classList.add("hidden");
    if (matrixView) matrixView.classList.remove("hidden");
    hideGameNav();
  });
  document.getElementById("card-stroop")?.addEventListener("click", () => {
    if (hubView) hubView.classList.add("hidden");
    if (cbView) cbView.classList.remove("hidden");
    hideGameNav();
    resetStroopMenu(); // ensure it starts fresh
  });
  document.getElementById("back-to-hub-matrix")?.addEventListener("click", () => {
    if (matrixView) matrixView.classList.add("hidden");
    if (hubView) hubView.classList.remove("hidden");
    showGameNav();
  });
  document.getElementById("back-to-hub-stroop")?.addEventListener("click", () => {
    if (cbView) cbView.classList.add("hidden");
    if (hubView) hubView.classList.remove("hidden");
    showGameNav();
    if (typeof endStroopGame === "function") endStroopGame(); // kill active timers
  });
});

// ==================== BRAIN CLATTER (STROOP TEST) ====================
let stroopState = {
  mode: "sprint", // "sprint" or "survival"
  score: 0,
  isActive: false,
  timerInt: null,
  timeLeft: 0,
  survivalDropRate: 0.05, // 5% drop per correct
  currentMaxTime: 3000,   // 3 seconds initially
  survivalStartTime: 0,
  rafId: null,
  currentColor: "",
  currentText: "",
  stats: {
    hsSprint: parseInt(appStorage.getItem("stroopHsSprint") || 0),
    hsSurvival: parseInt(appStorage.getItem("stroopHsSurvival") || 0),
  }
};

const STROOP_COLORS_BASE = [
  { name: "RED", hex: "#ff4757" },
  { name: "BLUE", hex: "#3498db" },
  { name: "GREEN", hex: "#2ed573" },
  { name: "YELLOW", hex: "#eccc68" }
];
const STROOP_COLORS_TIER2 = [...STROOP_COLORS_BASE, { name: "PURPLE", hex: "#9b59b6" }, { name: "ORANGE", hex: "#e67e22" }];
const STROOP_COLORS_TIER3 = [...STROOP_COLORS_TIER2, { name: "CYAN", hex: "#00cec9" }, { name: "PINK", hex: "#fd79a8" }];
document.addEventListener("DOMContentLoaded", () => {
  // Menu Init
  const sprintHS = document.getElementById("stroop-hs-sprint");
  const survivalHS = document.getElementById("stroop-hs-survival");
  if (sprintHS) sprintHS.textContent = stroopState.stats.hsSprint;
  if (survivalHS) survivalHS.textContent = stroopState.stats.hsSurvival;

  document.getElementById("btn-stroop-sprint")?.addEventListener("click", () => startStroop("sprint"));
  document.getElementById("btn-stroop-survival")?.addEventListener("click", () => startStroop("survival"));
  document.getElementById("stroop-play-again-btn")?.addEventListener("click", resetStroopMenu);

  // Color Buttons
  const btns = document.querySelectorAll(".stroop-btn");
  btns.forEach(btn => {
    btn.addEventListener("click", (e) => {
      if (!stroopState.isActive) return;
      const clickedColor = e.target.getAttribute("data-color");
      checkStroopMatch(clickedColor);
    });
  });
});

function resetStroopMenu() {
  stroopState.isActive = false;
  document.getElementById("stroop-end-modal")?.classList.add("hidden");
  document.getElementById("stroop-play-area")?.classList.add("hidden");
  document.getElementById("stroop-menu-area")?.classList.remove("hidden");

  // Update stats UI
  const sprintHS = document.getElementById("stroop-hs-sprint");
  const survivalHS = document.getElementById("stroop-hs-survival");
  if (sprintHS) sprintHS.textContent = stroopState.stats.hsSprint;
  if (survivalHS) survivalHS.textContent = stroopState.stats.hsSurvival;
}

function startStroop(mode) {
  stroopState.mode = mode;
  stroopState.score = 0;
  stroopState.isActive = true;

  document.getElementById("stroop-score-display").textContent = "0";
  document.getElementById("stroop-menu-area").classList.add("hidden");
  document.getElementById("stroop-end-modal").classList.add("hidden");
  document.getElementById("stroop-play-area").classList.remove("hidden");
  document.getElementById("stroop-new-hs-label").classList.add("hidden");

  // Reset button colors
  const btns = document.querySelectorAll(".stroop-btn");
  btns.forEach(btn => {
    btn.style.background = btn.getAttribute("data-color");
    btn.style.color = "white";
  });

  if (mode === "sprint") {
    stroopState.timeLeft = 60;
    document.getElementById("stroop-time-display").parentElement.style.display = "block";
    document.getElementById("stroop-time-display").textContent = "60";
    document.getElementById("stroop-timer-container").style.display = "none";

    stroopState.timerInt = setInterval(() => {
      stroopState.timeLeft--;
      document.getElementById("stroop-time-display").textContent = stroopState.timeLeft;
      if (stroopState.timeLeft <= 0) {
        endStroopGame("Time's Up! 🏁");
      }
    }, 1000);
  } else {
    // Survival
    document.getElementById("stroop-time-display").parentElement.style.display = "none";
    document.getElementById("stroop-timer-container").style.display = "block";
    stroopState.currentMaxTime = 3000;
    stroopState.survivalStartTime = performance.now();
    startSurvivalLoop();
  }

  renderNextStroopWord();
}

function renderNextStroopWord() {
  let activeColors = STROOP_COLORS_BASE;
  const btnContainer = document.querySelector(".stroop-buttons");

  // Scale Difficulty by unlocking colors and expanding the grid
  if (stroopState.score >= 5 || (stroopState.mode === "survival" && stroopState.score >= 5)) {
    activeColors = STROOP_COLORS_TIER2;
  }
  if (stroopState.score >= 10 || (stroopState.mode === "survival" && stroopState.score >= 10)) {
    activeColors = STROOP_COLORS_TIER3;
  }

  if (btnContainer) {
    if (activeColors.length === 4) {
      btnContainer.style.gridTemplateColumns = "1fr 1fr";
      Array.from(btnContainer.children).forEach(btn => {
        if (STROOP_COLORS_BASE.some(c => c.name === btn.textContent)) btn.classList.remove("hidden");
        else btn.classList.add("hidden");
      });
    } else if (activeColors.length === 6) {
      btnContainer.style.gridTemplateColumns = "repeat(3, 1fr)";
      Array.from(btnContainer.children).forEach(btn => {
        if (STROOP_COLORS_TIER2.some(c => c.name === btn.textContent)) btn.classList.remove("hidden");
        else btn.classList.add("hidden");
      });
    } else {
      btnContainer.style.gridTemplateColumns = "repeat(4, 1fr)";
      Array.from(btnContainer.children).forEach(btn => btn.classList.remove("hidden"));
    }
  }

  // 70% chance to mismatch color and text to force Stroop effect interference
  const isMismatch = Math.random() < 0.7;

  const textObj = activeColors[Math.floor(Math.random() * activeColors.length)];
  let colorObj = textObj;

  if (isMismatch) {
    const otherColors = activeColors.filter(c => c.name !== textObj.name);
    colorObj = otherColors[Math.floor(Math.random() * otherColors.length)];
  }

  stroopState.currentText = textObj.name;
  stroopState.currentColor = colorObj.hex;

  const wordEl = document.getElementById("stroop-word");
  if (!wordEl) return;

  wordEl.textContent = textObj.name;
  wordEl.style.setProperty("color", colorObj.hex, "important");

  // Sprint Difficulty Upgrades
  let transformStr = "scale(1)";
  if (stroopState.mode === "sprint") {
    if (stroopState.score >= 5) {
      // Level 2: Tilt the word dynamically to mess with reading speed
      const tilt = (Math.random() * 30 - 15) + "deg"; // -15 to 15 degrees
      transformStr = `scale(1) rotate(${tilt})`;
    }
    if (stroopState.score >= 10) {
      // Level 3: Shuffle the position of the color buttons to destroy muscle memory
      const btnContainer = document.querySelector(".stroop-buttons");
      if (btnContainer) {
        for (let i = btnContainer.children.length; i >= 0; i--) {
          btnContainer.appendChild(btnContainer.children[Math.random() * i | 0]);
        }
      }
    }
    if (stroopState.score >= 15) {
      // Level 4: Strip button background colors. They become uniform dark grey
      const btns = document.querySelectorAll(".stroop-btn");
      btns.forEach(btn => {
        btn.style.setProperty("background", "#2d3436", "important");
        btn.style.setProperty("color", btn.getAttribute("data-color"), "important");
      });
    }
    if (stroopState.score >= 20) {
      // Level 5: Randomly completely flip the word upside down
      if (Math.random() > 0.5) {
        transformStr += " rotateX(180deg)";
      }
    }
  }

  // Mini pop animation
  wordEl.style.transform = "scale(0.8)";
  setTimeout(() => { wordEl.style.transform = transformStr; }, 50);

  // Reset Survival timer
  if (stroopState.mode === "survival") {
    stroopState.survivalStartTime = performance.now();
  }
}

function checkStroopMatch(clickedHex) {
  if (!stroopState.isActive) return;

  if (clickedHex === stroopState.currentColor) {
    // Correct guess
    stroopState.score++;
    document.getElementById("stroop-score-display").textContent = stroopState.score;

    if (stroopState.mode === "survival") {
      // Drop max time by 5% but floor it at 800ms to keep it humanly possible
      stroopState.currentMaxTime = Math.max(800, stroopState.currentMaxTime * (1 - stroopState.survivalDropRate));
    }
    renderNextStroopWord();
  } else {
    // Wrong guess

    // Flash screen red briefly to indicate error
    const container = document.querySelector(".stroop-game-container");
    if (container) {
      container.style.boxShadow = "inset 0 0 50px rgba(255, 71, 87, 0.5)";
      setTimeout(() => { container.style.boxShadow = ""; }, 200);
    }

    // Instant Death on wrong tap for BOTH modes
    endStroopGame("Wrong Color! ❌");
  }
}

function startSurvivalLoop() {
  function tick(now) {
    if (!stroopState.isActive || stroopState.mode !== "survival") return;

    const elapsed = now - stroopState.survivalStartTime;
    const remainingStrpt = Math.max(0, 1 - (elapsed / stroopState.currentMaxTime));
    const timerBar = document.getElementById("stroop-timer-bar");

    if (timerBar) {
      timerBar.style.width = `${remainingStrpt * 100}%`;
    }

    if (remainingStrpt <= 0) {
      // Time ran out
      endStroopGame("Time's Up! 🏁");
      return;
    }

    stroopState.rafId = requestAnimationFrame(tick);
  }
  stroopState.rafId = requestAnimationFrame(tick);
}

function endStroopGame(reason = "Time's Up! 🏁") {
  stroopState.isActive = false;
  clearInterval(stroopState.timerInt);
  cancelAnimationFrame(stroopState.rafId);

  // Update End Modal Title
  const titleEl = document.getElementById("stroop-end-title");
  if (titleEl) titleEl.textContent = reason;

  // Check High Scores
  let isNewHS = false;
  if (stroopState.mode === "sprint") {
    if (stroopState.score > stroopState.stats.hsSprint) {
      stroopState.stats.hsSprint = stroopState.score;
      appStorage.setItem("stroopHsSprint", stroopState.score);
      isNewHS = true;
    }
  } else {
    if (stroopState.score > stroopState.stats.hsSurvival) {
      stroopState.stats.hsSurvival = stroopState.score;
      appStorage.setItem("stroopHsSurvival", stroopState.score);
      isNewHS = true;
    }
  }

  const finalScoreDisplay = document.getElementById("stroop-final-score");
  if (finalScoreDisplay) finalScoreDisplay.textContent = stroopState.score;

  const hsLabel = document.getElementById("stroop-new-hs-label");
  if (hsLabel) {
    if (isNewHS && stroopState.score > 0) {
      hsLabel.classList.remove("hidden");
    } else {
      hsLabel.classList.add("hidden");
    }
  }

  document.getElementById("stroop-end-modal")?.classList.remove("hidden");
}

// End of Stroop

/* =========================================================================
   SYNAPTIC TUG OF WAR (MATH DUEL) LOGIC
========================================================================= */

const tugState = {
  isActive: false,
  level: 1,
  streak: 0,
  ringPosition: 50, // 50 is center, >90 AI wins, <=10 player pushed back
  currentEq: { str: "", ans: 0 },
  playerInput: "",
  aiTimeout: null,
  hsStreak: parseInt(appStorage.getItem("tugHsStreak") || 0),
  hsLevel: parseInt(appStorage.getItem("tugHsLevel") || 1)
};

function initTugOfWar() {
  const hsDisplay = document.getElementById("tug-hs-streak");
  if (hsDisplay) hsDisplay.textContent = tugState.hsStreak;
  const hsLvlDisplay = document.getElementById("tug-hs-level");
  if (hsLvlDisplay) hsLvlDisplay.textContent = tugState.hsLevel;

  // Load saved avatars
  const savedPlayer = appStorage.getItem("tugPlayerAvatar");
  const savedAi = appStorage.getItem("tugAiAvatar");
  if (savedPlayer) {
    const pSelect = document.getElementById("tug-player-select");
    if (pSelect) pSelect.value = savedPlayer;
  }
  if (savedAi) {
    const aSelect = document.getElementById("tug-ai-select");
    if (aSelect) aSelect.value = savedAi;
  }

  document.getElementById("card-tug")?.addEventListener("click", () => {
    document.getElementById("games-hub-view").classList.add("hidden");
    document.getElementById("tug-game-view").classList.remove("hidden");
    document.body.classList.add("game-active");
    const nb = document.querySelector(".nav-bar"); if (nb) nb.style.display = "none";
  });

  document.getElementById("back-to-hub-tug")?.addEventListener("click", () => {
    document.getElementById("tug-game-view").classList.add("hidden");
    document.getElementById("games-hub-view").classList.remove("hidden");
    document.body.classList.remove("game-active");
    const nb = document.querySelector(".nav-bar"); if (nb) nb.style.display = "";
    if (tugState.isActive) endTugGame();
  });

  document.getElementById("btn-tug-start")?.addEventListener("click", startTugGame);
  document.getElementById("tug-play-again-btn")?.addEventListener("click", () => {
    document.getElementById("tug-end-modal").classList.add("hidden");
    startTugGame();
  });

  // Numpad Controls
  document.querySelectorAll(".tug-num-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      if (!tugState.isActive) return;
      const action = e.target.getAttribute("data-action");
      if (action === "clear") {
        tugState.playerInput = "";
        updateTugInputDisplay();
      } else if (action === "submit") {
        checkTugAnswer();
      } else {
        if (tugState.playerInput.length < 4) {
          tugState.playerInput += e.target.textContent;
          updateTugInputDisplay();
        }
      }
    });
  });

  // Keyboard support
  document.addEventListener("keydown", (e) => {
    if (!tugState.isActive) return;
    if (e.key >= "0" && e.key <= "9") {
      if (tugState.playerInput.length < 4) tugState.playerInput += e.key;
      updateTugInputDisplay();
    } else if (e.key === "Backspace") {
      tugState.playerInput = tugState.playerInput.slice(0, -1);
      updateTugInputDisplay();
    } else if (e.key === "Enter") {
      checkTugAnswer();
    } else if (e.key === "Escape" || e.key.toLowerCase() === "c") {
      tugState.playerInput = "";
      updateTugInputDisplay();
    }
  });
}

function startTugGame() {
  tugState.isActive = true;
  tugState.level = 1;
  tugState.streak = 0;
  tugState.ringPosition = 50;
  tugState.playerInput = "";

  // Apply chosen avatars
  const playerEmoji = document.getElementById("tug-player-select")?.value || "🙎‍♂️";
  const aiEmoji = document.getElementById("tug-ai-select")?.value || "🤖";

  const pAv = document.getElementById("tug-player-avatar");
  if (pAv) pAv.textContent = playerEmoji;

  const aAv = document.getElementById("tug-ai-avatar");
  if (aAv) aAv.textContent = aiEmoji;

  appStorage.setItem("tugPlayerAvatar", playerEmoji);
  appStorage.setItem("tugAiAvatar", aiEmoji);

  document.getElementById("tug-level-display").textContent = "1";
  document.getElementById("tug-streak-display").textContent = "0";

  document.getElementById("tug-menu-area").classList.add("hidden");
  document.getElementById("tug-end-modal").classList.add("hidden");
  document.getElementById("tug-play-area").classList.remove("hidden");

  updateTugRing();
  updateTugInputDisplay();
  nextTugRound();
}

function updateTugInputDisplay() {
  const el = document.getElementById("tug-answer-input");
  if (el) el.textContent = tugState.playerInput;
}

function updateTugRing() {
  const knot = document.getElementById("tug-knot");
  if (knot) {
    knot.style.left = `${tugState.ringPosition}%`;
  }
}

function nextTugRound() {
  let minT = 1, maxT = 10, ops = ["+"];
  if (tugState.level >= 2) { maxT = 20; ops = ["+", "-"]; }
  if (tugState.level >= 4) { minT = 5; maxT = 40; }
  if (tugState.level >= 6) { ops = ["+", "-", "*"]; maxT = 12; }
  if (tugState.level >= 10) { minT = 10; maxT = 100; ops = ["+", "-"]; }
  // Very hard scaling
  if (tugState.level >= 20) { minT = 20; maxT = 200; ops = ["*", "-", "+"]; }

  const op = ops[Math.floor(Math.random() * ops.length)];
  let n1 = Math.floor(Math.random() * (maxT - minT)) + minT;
  let n2 = Math.floor(Math.random() * (maxT - minT)) + minT;

  // Prevent negatives
  if (op === "-" && n1 < n2) [n1, n2] = [n2, n1];

  let ans = 0;
  if (op === "+") ans = n1 + n2;
  else if (op === "-") ans = n1 - n2;
  else if (op === "*") ans = n1 * n2;

  tugState.currentEq = { str: `${n1} ${op} ${n2}`, ans };
  document.getElementById("tug-equation").textContent = tugState.currentEq.str;

  tugState.playerInput = "";
  updateTugInputDisplay();

  clearTimeout(tugState.aiTimeout);

  // AI speed calculation (becomes brutal quickly)
  let aiBaseSpeed = Math.max(1200, 4500 - (tugState.level * 300));
  let aiRandomSpeed = aiBaseSpeed * (0.8 + Math.random() * 0.4);

  tugState.aiTimeout = setTimeout(() => {
    handleAiPull();
  }, aiRandomSpeed);
}

function handleAiPull() {
  if (!tugState.isActive) return;
  tugState.ringPosition += 15; // AI yanks the rope

  const eqCont = document.getElementById("tug-equation-container");
  if (eqCont) {
    eqCont.style.transform = "translateX(20px)";
    setTimeout(() => { eqCont.style.transform = ""; }, 200);
  }

  // Force player input wipe to disorient
  tugState.playerInput = "";
  updateTugInputDisplay();

  checkTugWinState();
  if (tugState.isActive) nextTugRound();
}

function checkTugAnswer() {
  const playerAns = parseInt(tugState.playerInput);
  if (isNaN(playerAns)) return;

  if (playerAns === tugState.currentEq.ans) {
    // Player wins the pull
    clearTimeout(tugState.aiTimeout);
    tugState.ringPosition -= 15;
    tugState.streak++;

    if (tugState.streak % 3 === 0) tugState.level++;

    document.getElementById("tug-streak-display").textContent = tugState.streak;
    document.getElementById("tug-level-display").textContent = tugState.level;

    const eqCont = document.getElementById("tug-equation-container");
    if (eqCont) {
      eqCont.style.transform = "scale(1.1) translateX(-20px)";
      setTimeout(() => { eqCont.style.transform = ""; }, 200);
    }

    checkTugWinState();
    if (tugState.isActive) nextTugRound();
  } else {
    // Wrong answer, immediate AI punishment pull
    clearTimeout(tugState.aiTimeout);
    handleAiPull();
  }
}

function checkTugWinState() {
  // If player pushes it past 10%, we clamp it there to create endless survival
  tugState.ringPosition = Math.max(10, Math.min(100, tugState.ringPosition));
  updateTugRing();

  // If AI pulls it to 90%, it's game over
  if (tugState.ringPosition >= 90) {
    endTugGame();
  }
}

function endTugGame() {
  tugState.isActive = false;
  clearTimeout(tugState.aiTimeout);

  if (tugState.streak > tugState.hsStreak) {
    tugState.hsStreak = tugState.streak;
    appStorage.setItem("tugHsStreak", tugState.hsStreak);
    document.getElementById("tug-hs-streak").textContent = tugState.hsStreak;
  }
  if (tugState.level > tugState.hsLevel) {
    tugState.hsLevel = tugState.level;
    appStorage.setItem("tugHsLevel", tugState.hsLevel);
    const lDisp = document.getElementById("tug-hs-level");
    if (lDisp) lDisp.textContent = tugState.hsLevel;
  }

  document.getElementById("tug-final-level").textContent = tugState.level;
  document.getElementById("tug-end-modal").classList.remove("hidden");
}

document.addEventListener("DOMContentLoaded", initTugOfWar);
