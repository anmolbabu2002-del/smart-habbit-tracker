// ==================== MEDITATION SESSION (UNIFIED) ====================
let currentBreathingMode = "478";
let breathingPhases = [
  { name: "Inhale", class: "in", duration: 4000 },
  { name: "Hold", class: "hold", duration: 7000 },
  { name: "Exhale", class: "out", duration: 8000 },
];
let breathingIndex = 0;
let breathingTimeout = null;
let breathingActive = false;
let meditationTimer = null;       // setInterval for countdown
let meditationDuration = 5;       // minutes chosen by user
let meditationSecondsLeft = 0;
let meditationRunning = false;
let breathingEnabled = false;     // toggle state
let unlockedMilestones = [];      // Persist unlocked achievements
let currentFocusTaskCheckbox = null; // Store reference to currently focused task
let currentFocusHabitIndex = null; // Store reference to currently focused habit

// ==================== VITALITY SCORE SYSTEM ====================
const VITALITY_FACTOR_POOL = [
  { id: "challenge",  emoji: "🎯", label: "Challenge",  desc: "Complete today's daily challenge", locked: true },
  { id: "tasks",      emoji: "📝", label: "Tasks",      desc: "Complete your daily tasks" },
  { id: "water",      emoji: "💧", label: "Water",      desc: "Hit your daily water goal" },
  { id: "meditation", emoji: "🪷", label: "Meditation", desc: "Complete a meditation session" },
  { id: "reading",    emoji: "📚", label: "Reading",    desc: "Read at least one page" },
  { id: "sleep",      emoji: "😴", label: "Sleep",      desc: "Log your sleep" },
  { id: "habits",     emoji: "🔄", label: "Habits",     desc: "Complete your daily habits" },
  { id: "journal",    emoji: "📔", label: "Journal",    desc: "Write a journal entry" },
  { id: "mood",       emoji: "🎭", label: "Mood",       desc: "Log your mood today" }
];

const DEFAULT_VITALITY_FACTORS = ["challenge", "tasks", "water", "meditation", "sleep"];

function loadVitalityConfig() {
  const raw = appStorage.getItem("vitalityConfig");
  if (raw) {
    try {
      const cfg = JSON.parse(raw);
      if (Array.isArray(cfg.factors) && cfg.factors.length >= 3 && cfg.factors.length <= 5) {
        return cfg;
      }
    } catch (e) {}
  }
  // Default config
  return { factors: [...DEFAULT_VITALITY_FACTORS], lastResetDate: new Date().toDateString() };
}

function saveVitalityConfig(cfg) {
  appStorage.setItem("vitalityConfig", JSON.stringify(cfg));
}

function getVitalityFactorScore(factorId) {
  const todayStr = new Date().toDateString();
  switch (factorId) {
    case "tasks": {
      const taskItems = document.querySelectorAll("#task li");
      const totalTasks = taskItems.length;
      const completedTasks = document.querySelectorAll("#task li input[type='checkbox']:checked").length;
      return totalTasks > 0 ? (completedTasks / totalTasks) : 0;
    }
    case "water": {
      const wConsumed = typeof waterConsumed !== "undefined" ? waterConsumed : 0;
      const wGoal = typeof waterGoal !== "undefined" && waterGoal > 0 ? waterGoal : 2000;
      return Math.min(wConsumed / wGoal, 1);
    }
    case "meditation": {
      const medDate = appStorage.getItem("meditationCompletedDate");
      return (medDate === todayStr) ? 1 : 0;
    }
    case "reading": {
      const readDate = appStorage.getItem("lastPageReadDate");
      return (readDate === todayStr) ? 1 : 0;
    }
    case "sleep": {
      if (typeof sleepLogs !== "undefined" && sleepLogs.length > 0) {
        const recent = sleepLogs[0];
        // Safely fallback to timestamp if the localized date string fails to parse
        const safeDateVal = recent.timestamp ? recent.timestamp : recent.date;
        const recentDateStr = new Date(safeDateVal).toDateString();
        const yesterdayStr = new Date(Date.now() - 86400000).toDateString();
        if (recentDateStr === todayStr || recentDateStr === yesterdayStr) return 1;
      }
      return 0;
    }
    case "habits": {
      const loadedHabits = JSON.parse(appStorage.getItem("userHabits") || "[]");
      const hbTotal = loadedHabits.length;
      const hbCompleted = loadedHabits.filter(h => h.completedToday).length;
      return hbTotal > 0 ? (hbCompleted / hbTotal) : 0;
    }
    case "journal": {
      const journalData = appStorage.getItem("journalEntries");
      if (journalData) {
        try {
          const entries = JSON.parse(journalData);
          const todayEntry = entries.find(e => new Date(e.date).toDateString() === todayStr);
          return todayEntry ? 1 : 0;
        } catch (e) {}
      }
      return 0;
    }
    case "mood": {
      // Always read from appStorage directly — not the in-memory variable
      // which may be stale after loadState() restores an older snapshot
      try {
        const raw = appStorage.getItem("moodHistory");
        const history = raw ? JSON.parse(raw) : [];
        if (history.length > 0) {
          const latest = history[0];
          const safeDateVal = latest.timestamp || latest.dateISO || latest.date;
          const latestDate = new Date(safeDateVal).toDateString();
          if (latestDate === todayStr) return 1;
        }
      } catch(e) {}
      return 0;
    }
    case "challenge": {
      // Check if today's daily challenge was completed (via localforage async, use cached flag)
      return window._dcCompletedToday ? 1 : 0;
    }
    default: return 0;
  }
}

function getVitalityScore() {
  const cfg = loadVitalityConfig();
  const n = cfg.factors.length;
  if (n === 0) return 0;
  const weightPer = 100 / n;
  let total = 0;
  cfg.factors.forEach(fId => {
    total += getVitalityFactorScore(fId) * weightPer;
  });
  return Math.round(total);
}

function tryVitalityStreak() {
  try {
    const todayStr = new Date().toDateString();
    
    // Already incremented today? Check guard flag
    const lastComp = appStorage.getItem("lastCompletionTime");
    if (lastComp) {
      try {
        const lastDate = new Date(parseInt(lastComp, 10)).toDateString();
        if (lastDate === todayStr) {
          console.log('[Vitality] Already completed today, skipping. count=' + count);
          // Still refresh UI
          updateVitalityUI();
          if (typeof updatePauseOverlay === 'function') updatePauseOverlay();
          return;
        }
      } catch(e) {
        // If parsing fails, don't block — clear the stale value and continue
        console.warn('[Vitality] Clearing corrupt lastCompletionTime');
        appStorage.removeItem("lastCompletionTime");
      }
    }

    const score = getVitalityScore();
    console.log('[Vitality] Score=' + score + ', count=' + count + ', threshold=80');
    
    if (score >= 80) {
      // If streak was paused, resume it
      if (streakPaused) {
        streakPaused = false;
        showNotification('⚡ Streak RESUMED! Welcome back!');
      }

      // ✅ INCREMENT STREAK — do count FIRST so it's guaranteed
      count += 1;
      console.log('[Vitality] ✅ Streak incremented to ' + count);
      
      // Now set the guard flag so we don't double-increment today
      appStorage.setItem("lastCompletionTime", Date.now().toString());
      appStorage.removeItem("lastStreakPenaltyTime");
      addCompletionDate();

      updateStreakDisplay();
      saveState();
      renderDashboard();

      showNotification('🔥 Vitality ' + score + '%! Streak extended to ' + count + ' days!');

      // Check if user earned a shield
      if (typeof earnShield === 'function') earnShield();

      // Update vitality UI
      updateVitalityUI();

      setTimeout(function() {
        if (typeof showStreakPage === 'function') showStreakPage();
      }, 1500);
    }

    // Always refresh the vitality display and pause overlay
    updateVitalityUI();
    if (typeof updatePauseOverlay === 'function') updatePauseOverlay();
  } catch(e) {
    console.error('[Vitality] tryVitalityStreak error:', e);
  }
}

function updateVitalityUI() {
  const score = getVitalityScore();
  const cfg = loadVitalityConfig();

  // Dashboard ring
  const vScoreText = document.getElementById("vitality-score-pct");
  const vRingFill = document.getElementById("vitality-ring-fill");
  if (vScoreText) vScoreText.textContent = `${score}%`;
  if (vRingFill) {
    const offset = 314 - (score / 100) * 314;
    vRingFill.style.strokeDashoffset = offset;
  }

  // Update dynamic breakdown
  const breakdownGrid = document.getElementById("vitality-breakdown-dynamic");
  if (breakdownGrid) {
    breakdownGrid.innerHTML = "";
    const n = cfg.factors.length;
    const weightPer = Math.round(100 / n);
    cfg.factors.forEach(fId => {
      const pool = VITALITY_FACTOR_POOL.find(p => p.id === fId);
      if (!pool) return;
      const rawScore = getVitalityFactorScore(fId);
      const pct = Math.round(rawScore * 100);
      const item = document.createElement("div");
      item.className = "vitality-item" + (pct >= 100 ? " vitality-complete" : "");
      item.innerHTML = `
        <div class="vitality-icon">${pool.emoji}</div>
        <div class="vitality-details">
          <span class="v-label">${pool.label}</span>
          <span class="v-value">${pct}%</span>
        </div>
        <div class="v-weight">${weightPer}%</div>
      `;
      breakdownGrid.appendChild(item);
    });
  }

  // Home streak card mini vitality bar
  const miniBar = document.getElementById("bloom-vitality-mini-fill");
  if (miniBar) miniBar.style.width = `${Math.min(score, 100)}%`;
  const miniLabel = document.getElementById("bloom-vitality-mini-label");
  if (miniLabel) miniLabel.textContent = `${score}%`;

  // Threshold glow
  const vSection = document.querySelector(".vitality-dashboard-section");
  if (vSection) vSection.classList.toggle("vitality-threshold-reached", score >= 80);

  // Streak page vitality indicator
  const streakVitality = document.getElementById("streak-vitality-score");
  if (streakVitality) streakVitality.textContent = `${score}%`;
}

// Legacy compatibility shim
function updateMeditationStatusUI() { updateVitalityUI(); }

const breathingModes = {
  "478": [
    { name: "Inhale", class: "in", duration: 4000 },
    { name: "Hold", class: "hold", duration: 7000 },
    { name: "Exhale", class: "out", duration: 8000 },
  ],
  "426": [
    { name: "Inhale", class: "in", duration: 4000 },
    { name: "Hold", class: "hold", duration: 2000 },
    { name: "Exhale", class: "out", duration: 6000 },
  ]
};

// ── helpers ──────────────────────────────────────────────
function formatMedTime(secs) {
  const m = Math.floor(secs / 60).toString().padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function updateMedCountdown() {
  const el = document.getElementById("med-countdown");
  const label = document.getElementById("med-countdown-label");
  if (el) el.textContent = formatMedTime(meditationSecondsLeft);
  if (label) {
    if (!meditationRunning) {
      label.textContent = "Ready to begin";
    } else {
      label.textContent = "Session in progress…";
    }
  }
}

function syncMedDurationDisplay() {
  const val = document.getElementById("med-dur-value");
  if (val) val.textContent = meditationDuration.toString();
  meditationSecondsLeft = meditationDuration * 60;
  if (!meditationRunning) updateMedCountdown();
}

// ── breathing animation ────────────────────────────────
function setBreathingPhase(index) {
  const circle = document.getElementById("breathing-circle");
  const text = document.getElementById("breathing-text");
  if (!circle || !text) return;
  const phase = breathingPhases[index];

  // Dynamically set the transition duration to match the phase duration
  // We use phase.duration / 1000 to convert ms to seconds
  // The subtle box-shadow transition stays fast (0.5s)
  circle.style.transition = `transform ${phase.duration / 1000}s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.5s`;

  circle.className = "breathing-circle " + phase.class;
  text.textContent = phase.name;
}

function resetBreathingVisual() {
  const circle = document.getElementById("breathing-circle");
  const text = document.getElementById("breathing-text");
  if (circle) circle.className = "breathing-circle";
  if (text) text.textContent = "Ready?";
}

// ==================== MEDITATION SOUNDS ====================
let currentMeditationAudio = null;
const meditationSoundUrls = {
  nature: "nature.mp3",
  deepfocus: "deepfocus.mp3",
  peaceful: "videoplayback.mp4",
  spiritual: "videoplayback.1773901315901.publer.com.mp4"
};

// Preload audio on first user interaction (mobile browsers require a gesture)
function preloadMeditationAudio() {
  if (window.preloadedMedAudio) return; // already done
  window.preloadedMedAudio = {};
  for (const [name, url] of Object.entries(meditationSoundUrls)) {
    const audio = new Audio();
    audio.preload = "auto";
    audio.loop = true;
    audio.src = url;
    audio.load();
    window.preloadedMedAudio[name] = audio;
  }
}

// Trigger preload on first touch/click anywhere on the page
(function () {
  function onFirstInteraction() {
    preloadMeditationAudio();
    document.removeEventListener("touchstart", onFirstInteraction);
    document.removeEventListener("click", onFirstInteraction);
  }
  document.addEventListener("touchstart", onFirstInteraction, { once: true, passive: true });
  document.addEventListener("click", onFirstInteraction, { once: true });
})();

function playMeditationSound(soundName) {
  if (currentMeditationAudio) { currentMeditationAudio.pause(); currentMeditationAudio.currentTime = 0; currentMeditationAudio = null; }
  if (soundName === "none" || !meditationSoundUrls[soundName]) return;
  // Ensure audio is cached (fallback if preload hasn't run yet)
  preloadMeditationAudio();
  const cachedAudio = window.preloadedMedAudio[soundName];
  if (cachedAudio) {
    cachedAudio.currentTime = 0;
    currentMeditationAudio = cachedAudio;
  } else {
    currentMeditationAudio = new Audio(meditationSoundUrls[soundName]);
  }
  currentMeditationAudio.loop = true;
  currentMeditationAudio.play().catch(e => console.error("Audio error:", e));
}

function stopMeditationSound() {
  if (currentMeditationAudio) { currentMeditationAudio.pause(); currentMeditationAudio.currentTime = 0; currentMeditationAudio = null; }
}

function breathingStep() {
  if (!breathingActive) return;
  setBreathingPhase(breathingIndex);
  breathingTimeout = setTimeout(() => {
    breathingIndex = (breathingIndex + 1) % breathingPhases.length;
    breathingStep();
  }, breathingPhases[breathingIndex].duration);
}

function startBreathingAnimation() {
  breathingActive = true;
  breathingIndex = 0;
  breathingStep();
}

function stopBreathingAnimation() {
  breathingActive = false;
  if (breathingTimeout) clearTimeout(breathingTimeout);
  breathingTimeout = null;
  resetBreathingVisual();
}

// ── main session control ────────────────────────────────
function startMeditationSession() {
  const overlay = document.getElementById("meditation-mood-overlay");
  if (!overlay) {
    startMeditationSessionImpl();
    return;
  }

  // Show pre-session checkin
  document.getElementById("med-mood-title").textContent = "Before we begin...";
  document.getElementById("med-mood-subtitle").textContent = "Take a deep breath. How are you feeling right now?";
  document.getElementById("med-mood-feedback").classList.add("hidden");

  const optionsWrapper = document.querySelector(".med-mood-options");
  if (optionsWrapper) optionsWrapper.style.display = "flex";

  // Clone to remove old listeners
  const options = document.querySelectorAll(".med-mood-btn");
  options.forEach(btn => {
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    newBtn.addEventListener("click", function () {
      window.preSessionMood = parseInt(this.getAttribute("data-val"));
      overlay.classList.remove("visible");
      overlay.classList.add("hidden");
      startMeditationSessionImpl();
    });
  });

  overlay.classList.remove("hidden");
  overlay.classList.add("visible");
}

function showPostMeditationCheckIn() {
  const overlay = document.getElementById("meditation-mood-overlay");
  if (!overlay || !window.preSessionMood) return;

  document.getElementById("med-mood-title").textContent = "Welcome back.";
  document.getElementById("med-mood-subtitle").textContent = "How are you feeling after that session?";
  document.getElementById("med-mood-feedback").classList.add("hidden");

  const optionsWrapper = document.querySelector(".med-mood-options");
  if (optionsWrapper) optionsWrapper.style.display = "flex";

  const options = document.querySelectorAll(".med-mood-btn");
  options.forEach(btn => {
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    newBtn.addEventListener("click", function () {
      const postMood = parseInt(this.getAttribute("data-val"));
      const diff = postMood - window.preSessionMood;

      const feedback = document.getElementById("med-mood-feedback");
      feedback.classList.remove("hidden");

      if (optionsWrapper) {
        optionsWrapper.style.display = "none";
      }

      if (diff > 0) {
        feedback.textContent = "I'm so glad you're feeling a bit better. Taking this time for yourself matters.";
      } else if (diff < 0) {
        if (window.preSessionMood >= 4 && postMood <= 2) {
          feedback.textContent = "Meditation can sometimes gently bring difficult thoughts to the surface. Be kind to yourself, you did the right thing by sitting with them.";
        } else {
          feedback.textContent = "It's okay to feel heavier sometimes. Consistency is key, and you showed up.";
        }
      } else {
        if (postMood >= 4) {
          feedback.textContent = "Staying peacefully centered is a beautiful thing. Thank you for taking a moment to breathe.";
        } else {
          feedback.textContent = "Sometimes simply sitting with how we feel is a victory. Thank you for making time.";
        }
      }

      setTimeout(() => {
        overlay.classList.remove("visible");
        overlay.classList.add("hidden");
        window.preSessionMood = null;
      }, 5000);
    });
  });

  overlay.classList.remove("hidden");
  overlay.classList.add("visible");
}

function startMeditationSessionImpl() {
  if (meditationRunning) return;
  meditationRunning = true;
  meditationSecondsLeft = meditationDuration * 60;

  // Intensify ambient background
  const medPage = document.getElementById("meditation-page");
  if (medPage) medPage.classList.add("med-session-active");

  // Button UI
  const startBtn = document.getElementById("start-breathing");
  const stopBtn = document.getElementById("stop-breathing");
  if (startBtn) startBtn.style.display = "none";
  if (stopBtn) stopBtn.style.display = "inline-block";

  // Start audio
  if (typeof playMeditationSound === "function") {
    const activeSoundBtn = document.querySelector(".sound-btn.active");
    const sound = activeSoundBtn ? activeSoundBtn.getAttribute("data-sound") : "none";
    playMeditationSound(sound);
  }

  // Start breathing if enabled
  if (breathingEnabled) startBreathingAnimation();

  // Countdown
  updateMedCountdown();
  meditationTimer = setInterval(() => {
    meditationSecondsLeft--;
    updateMedCountdown();
    if (meditationSecondsLeft <= 0) {
      endMeditationSession(true);
    }
  }, 1000);
}

function stopMeditationSession() {
  endMeditationSession(false);
}

function endMeditationSession(completed) {
  meditationRunning = false;
  if (meditationTimer) { clearInterval(meditationTimer); meditationTimer = null; }

  // Turn off ambient intensification
  const medPage = document.getElementById("meditation-page");
  if (medPage) medPage.classList.remove("med-session-active");

  stopBreathingAnimation();
  if (typeof stopMeditationSound === "function") stopMeditationSound();

  // Reset buttons
  const startBtn = document.getElementById("start-breathing");
  const stopBtn = document.getElementById("stop-breathing");
  if (startBtn) startBtn.style.display = "inline-block";
  if (stopBtn) stopBtn.style.display = "none";

  // Reset display
  meditationSecondsLeft = meditationDuration * 60;
  updateMedCountdown();

  if (completed) {
    // Record meditation completion date for daily streak
    appStorage.setItem("meditationCompletedDate", new Date().toDateString());
    if (typeof tryVitalityStreak === "function") tryVitalityStreak();
    if (typeof updateMeditationStatusUI === "function") updateMeditationStatusUI();
    if (typeof updateBloomWidgets === "function") updateBloomWidgets();

    setTimeout(showPostMeditationCheckIn, 1500);
    const un = getUserName();
    const nameStr = un ? ` ${un}` : "";
    showNotification(`🧘 Meditation complete! Well done${nameStr} — take a moment to notice how you feel.`);
  }
}


function getReminderPreferences() {
  const raw = appStorage.getItem("reminderPreferences");
  if (!raw) {
    return { taskReminders: false, waterReminders: false };
  }
  try {
    const parsed = JSON.parse(raw);
    return {
      taskReminders: !!parsed.taskReminders,
      waterReminders: !!parsed.waterReminders
    };
  } catch {
    return { taskReminders: false, waterReminders: false };
  }
}

function setReminderPreferences(prefs) {
  appStorage.setItem(
    "reminderPreferences",
    JSON.stringify({
      taskReminders: !!prefs.taskReminders,
      waterReminders: !!prefs.waterReminders
    })
  );
}

function runNotificationSetupIfNeeded() {
  if (!("Notification" in window)) return;
  if (appStorage.getItem("notificationSetupDone") === "1") return;

  const overlay = document.createElement("div");
  overlay.className = "notification-setup-overlay";

  overlay.innerHTML = `
    <div class="notification-setup-card" role="dialog" aria-modal="true">
      <div class="notification-setup-title">Enable reminders?</div>
      <div class="notification-setup-desc">
        If you allow notifications, I can remind you about unfinished tasks and your daily water goal.
      </div>
      <div class="notification-setup-options">
        <label class="notification-setup-option">
          <input type="checkbox" id="notif-task" checked>
          <div>
            <div style="font-weight: 700; color: #3a3a3a;">Task reminders</div>
            <div style="color: #6a7a8c;">Get notified if you still have incomplete tasks.</div>
          </div>
        </label>
        <label class="notification-setup-option">
          <input type="checkbox" id="notif-water" checked>
          <div>
            <div style="font-weight: 700; color: #3a3a3a;">Water reminders</div>
            <div style="color: #6a7a8c;">Every 3 hours: “Water time!” + how much is left.</div>
          </div>
        </label>
      </div>
      <div class="notification-setup-actions">
        <button type="button" class="notification-setup-btn secondary" id="notif-skip">Not now</button>
        <button type="button" class="notification-setup-btn primary" id="notif-enable">Enable</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const enableBtn = overlay.querySelector("#notif-enable");
  const skipBtn = overlay.querySelector("#notif-skip");
  const taskCb = /** @type {HTMLInputElement | null} */ (overlay.querySelector("#notif-task"));
  const waterCb = /** @type {HTMLInputElement | null} */ (overlay.querySelector("#notif-water"));

  const finalize = (prefs) => {
    setReminderPreferences(prefs);
    appStorage.setItem("notificationSetupDone", "1");
    overlay.remove();
  };

  if (skipBtn) {
    skipBtn.addEventListener("click", () => {
      finalize({ taskReminders: false, waterReminders: false });
    });
  }

  if (enableBtn) {
    enableBtn.addEventListener("click", async () => {
      const prefs = {
        taskReminders: !!(taskCb && taskCb.checked),
        waterReminders: !!(waterCb && waterCb.checked)
      };

      finalize(prefs);

      if (Notification.permission === "default") {
        try {
          const permission = await Notification.requestPermission();
          if (permission === "granted") {
            showNotification("✅ Notifications enabled.");
          } else if (permission === "denied") {
            showNotification("⚠️ Notifications blocked in your browser settings.");
          }
        } catch (e) {
          console.error("Notification permission error", e);
        }
      } else if (Notification.permission === "denied") {
        showNotification("⚠️ Notifications are blocked in your browser settings.");
      }
    });
  }
}

// --- Personalization ---
function getUserName() {
  return appStorage.getItem("userName") || "";
}

function updatePersonalizedInterface() {
  const userName = getUserName();
  if (!userName) return;

  const streakHeading = document.getElementById("streak-heading");
  if (streakHeading) streakHeading.textContent = `${userName}'s Streak Journey 🌟`;

  const journalHeading = document.getElementById("journal-heading");
  if (journalHeading) journalHeading.textContent = `📔 ${userName}'s Journal`;

  const moodHeading = document.getElementById("mood-heading");
  if (moodHeading) moodHeading.textContent = `🎭 ${userName}'s Mood`;

  const waterHeading = document.getElementById("water-heading");
  if (waterHeading) waterHeading.textContent = `💧 ${userName}'s Hydration`;
}

// --- Dynamic Greeting ---
function updateGreeting() {
  const greetingEl = document.getElementById("dynamic-greeting");
  const overlayEl = document.getElementById("name-registration-overlay");
  const nameInput = /** @type {HTMLInputElement} */ (document.getElementById("overlay-name-input"));
  const saveBtn = document.getElementById("overlay-save-name-btn");
  const errorMsg = document.getElementById("name-error-msg");
  if (!greetingEl) return;

  const now = new Date();
  const hour = now.getHours();
  let timeStr = "Good Evening";
  let emoji = "🌃";

  if (hour >= 5 && hour < 12) {
    timeStr = "Good Morning";
    emoji = "🌅";
  } else if (hour >= 12 && hour < 17) {
    timeStr = "Good Afternoon";
    emoji = "🌞";
  }

  const storedName = appStorage.getItem("userName");

  const textSpan = greetingEl.querySelector(".greeting-text");
  const emojiSpan = greetingEl.querySelector(".greeting-emoji");

  if (storedName) {
    if (textSpan) textSpan.textContent = `${timeStr}, ${storedName}`;
    if (emojiSpan) emojiSpan.textContent = emoji;
    if (overlayEl) overlayEl.classList.add("hidden");
  } else {
    if (textSpan) textSpan.textContent = timeStr;
    if (emojiSpan) emojiSpan.textContent = emoji;
    if (overlayEl) {
      overlayEl.classList.remove("hidden");

      // Wire up save listener once
      if (saveBtn && !saveBtn.dataset.listener) {
        saveBtn.dataset.listener = "true";

        const validateAndSave = () => {
          const nameStr = nameInput.value.trim();
          if (nameStr.length >= 3 && nameStr.length <= 10) {
            // Valid name
            nameInput.classList.remove("invalid");
            errorMsg.classList.remove("visible");
            appStorage.setItem("userName", nameStr);
            updateGreeting(); // Refresh instantly
            updatePersonalizedInterface();
          } else {
            // Invalid name
            nameInput.classList.add("invalid");
            errorMsg.classList.add("visible");
            // Remove animation class after it plays so it can be re-triggered
            setTimeout(() => nameInput.classList.remove("invalid"), 400);
          }
        };

        saveBtn.addEventListener("click", validateAndSave);
        nameInput.addEventListener("keydown", (e) => {
          if (e.key === "Enter") validateAndSave();
        });

        // Clear error styling on input
        nameInput.addEventListener("input", () => {
          nameInput.classList.remove("invalid");
          errorMsg.classList.remove("visible");
        });
      }
    }
  }
}

// Auto-update greeting every minute
setInterval(function () { updateGreeting(); if (typeof updateHeroTimeOfDay === 'function') updateHeroTimeOfDay(); }, 60000);

function resetBreathingVisual() {
  const circle = document.getElementById("breathing-circle");
  const text = document.getElementById("breathing-text");
  if (circle) circle.className = "breathing-circle";
  if (text) text.textContent = "Ready?";
}

function breathingStep() {
  if (!breathingActive) return;
  setBreathingPhase(breathingIndex);
  breathingTimeout = setTimeout(() => {
    breathingIndex = (breathingIndex + 1) % breathingPhases.length;
    breathingStep();
  }, breathingPhases[breathingIndex].duration);
}

function startBreathingAnimation() {
  breathingActive = true;
  breathingIndex = 0;
  breathingStep();

  // Show stop button, hide start button visually
  const stopBtn = document.getElementById("stop-breathing");
  const startBtn = document.getElementById("start-breathing");
  if (stopBtn) {
    stopBtn.classList.add("visible");
    stopBtn.style.display = "inline-block";
  }
  if (startBtn) {
    startBtn.classList.add("hidden-during-session");
    startBtn.style.display = "none";
  }
  // Timer is handled by startMeditationSessionImpl — no duplicate timer here
}

function stopBreathingAnimation() {
  breathingActive = false;
  if (breathingTimeout) clearTimeout(breathingTimeout);
  breathingTimeout = null;
  // Clean up any legacy duplicate timer
  if (window.dupModTimer) { clearInterval(window.dupModTimer); window.dupModTimer = null; }
  resetBreathingVisual();

  // Restore button states
  const stopBtn = document.getElementById("stop-breathing");
  const startBtn = document.getElementById("start-breathing");
  if (stopBtn) {
    stopBtn.classList.remove("visible");
    stopBtn.style.display = "none";
  }
  if (startBtn) {
    startBtn.classList.remove("hidden-during-session");
    startBtn.style.display = "block";
  }
}

// ==================== GLOBAL NAVIGATION FUNCTION ====================
function showPage(pageId) {
  const navButtons = document.querySelectorAll('.nav-btn');
  const pages = document.querySelectorAll('.page');

  pages.forEach(function (page) {
    if (page.id === pageId) {
      page.classList.add('active');
    } else {
      page.classList.remove('active');
    }
  });
  navButtons.forEach(function (btn) {
    if (btn.getAttribute('data-page') === pageId) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  // Special: stop meditation animation if leaving meditation page
  if (pageId !== 'meditation-page') stopBreathingAnimation();

  // Special: reset pomodoro heading and hide banner if leaving pomodoro page
  if (pageId !== 'pomodoro-page') {
    const banner = document.getElementById('focus-task-banner');
    if (banner) { banner.classList.add('hidden'); banner.style.opacity = "1"; banner.style.webkitMaskImage = "none"; banner.style.maskImage = "none"; }
    const heading = document.getElementById('pomodoro-heading');
    if (heading) { heading.textContent = `🍅 Pomodoro Timer`; heading.style.opacity = "1"; heading.style.webkitMaskImage = "none"; heading.style.maskImage = "none"; }
    currentFocusTaskCheckbox = null; // Clear focused task when leaving page
  }

  // Render dashboard when switched to it
  if (pageId === 'dashboard-page') renderDashboard();
  if (pageId === 'streak-page') renderStreakPage();
  if (pageId === 'journal-page') loadJournalEntries();
  if (pageId === 'sleep-page') updateSleepStats();
  if (pageId === 'library-page') {
    if (typeof renderReadingHistory === 'function') renderReadingHistory();
    if (typeof renderMyBooks === 'function') renderMyBooks();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  updatePersonalizedInterface();
  initSleepTracker();

  // Custom Theme Studio initialization
  const savedTheme = appStorage.getItem("appTheme");
  if (savedTheme === "custom") {
    loadCustomTheme();
    applyCtsStateToDom();
    const builder = document.getElementById("custom-theme-builder");
    if (builder) builder.classList.remove("hidden");
    applyCtsStateToUI();
  }

  // Navigation logic: only one page visible at a time
  const navButtons = document.querySelectorAll('.nav-btn');
  const pages = document.querySelectorAll('.page');

  navButtons.forEach(function (btn) {
    btn.addEventListener('click', function (event) {
      event.preventDefault();
      const pageId = this.getAttribute('data-page');
      if (pageId) showPage(pageId);
    });
  });

  // More drawer toggle
  const moreBtn = document.getElementById('more-nav-btn');
  const drawerOverlay = document.getElementById('more-drawer-overlay');
  if (moreBtn && drawerOverlay) {
    moreBtn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      drawerOverlay.classList.toggle('visible');
    });
    drawerOverlay.addEventListener('click', function (e) {
      if (e.target === drawerOverlay) {
        drawerOverlay.classList.remove('visible');
      }
    });
    document.querySelectorAll('.more-drawer-item').forEach(function (item) {
      item.addEventListener('click', function () {
        const pageId = this.getAttribute('data-page');
        if (pageId) {
          showPage(pageId);
          drawerOverlay.classList.remove('visible');
        }
      });
    });
  }


  // Dashboard Focus Logic
  const saveFocusBtn = document.getElementById("save-focus-btn");
  if (saveFocusBtn) {
    saveFocusBtn.addEventListener("click", saveDailyFocus);
  }
  const clearFocusBtn = document.getElementById("clear-focus-btn");
  if (clearFocusBtn) {
    clearFocusBtn.addEventListener("click", clearDailyFocus);
  }
  renderDashboard();
  updateDailyQuote();

  // ==================== MEDITATION PAGE WIRING ====================

  // Sound button clicks
  document.querySelectorAll(".sound-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".sound-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      if (meditationRunning) playMeditationSound(btn.getAttribute("data-sound") || "none");
    });
  });

  // --- Duration picker ---
  syncMedDurationDisplay();
  document.getElementById("med-dur-minus")?.addEventListener("click", () => {
    if (meditationRunning) return;
    if (meditationDuration > 1) { meditationDuration--; syncMedDurationDisplay(); }
    document.querySelectorAll(".med-quick-btn").forEach(b => b.classList.remove("active"));
  });
  document.getElementById("med-dur-plus")?.addEventListener("click", () => {
    if (meditationRunning) return;
    if (meditationDuration < 120) { meditationDuration++; syncMedDurationDisplay(); }
    document.querySelectorAll(".med-quick-btn").forEach(b => b.classList.remove("active"));
  });
  document.querySelectorAll(".med-quick-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      if (meditationRunning) return;
      document.querySelectorAll(".med-quick-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      meditationDuration = parseInt(btn.getAttribute("data-mins") || "5");
      syncMedDurationDisplay();
    });
  });

  // --- Breathing toggle ---
  document.getElementById("breath-enable-btn")?.addEventListener("click", () => {
    breathingEnabled = true;
    document.getElementById("breath-enable-btn")?.classList.add("active");
    document.getElementById("breath-disable-btn")?.classList.remove("active");
    document.getElementById("breathing-section")?.classList.remove("hidden");
  });
  document.getElementById("breath-disable-btn")?.addEventListener("click", () => {
    breathingEnabled = false;
    document.getElementById("breath-disable-btn")?.classList.add("active");
    document.getElementById("breath-enable-btn")?.classList.remove("active");
    document.getElementById("breathing-section")?.classList.add("hidden");
    if (meditationRunning) stopBreathingAnimation();
  });

  // --- Breathing mode buttons ---
  const breathingModeBtns = document.querySelectorAll(".breathing-mode-btn");
  const breathingInstructions = document.getElementById("breathing-instructions");
  breathingModeBtns.forEach(btn => {
    btn.addEventListener("click", function () {
      breathingModeBtns.forEach(b => b.classList.remove("active"));
      this.classList.add("active");
      currentBreathingMode = this.getAttribute("data-mode") || "478";
      if (breathingModes[currentBreathingMode]) breathingPhases = breathingModes[currentBreathingMode];
      if (breathingInstructions) {
        breathingInstructions.innerHTML = currentBreathingMode === "478"
          ? "<span>Inhale</span> <b>4s</b> &nbsp;&bull;&nbsp; <span>Hold</span> <b>7s</b> &nbsp;&bull;&nbsp; <span>Exhale</span> <b>8s</b><br><small>4-7-8 for relaxation and rest</small>"
          : "<span>Inhale</span> <b>4s</b> &nbsp;&bull;&nbsp; <span>Hold</span> <b>2s</b> &nbsp;&bull;&nbsp; <span>Exhale</span> <b>6s</b><br><small>4-2-6 for focus and calm</small>";
      }
      saveState();
    });
  });

  // --- Close meditation page ---
  document.getElementById("closeMeditation")?.addEventListener("click", () => {
    endMeditationSession(false);
    stopMeditationSound();
    showPage('main');
  });

  // --- Start / Stop session ---
  document.getElementById("start-breathing")?.addEventListener("click", () => {
    // The playMeditationSound will be called inside startMeditationSession now
    startMeditationSession();
  });
  document.getElementById("stop-breathing")?.addEventListener("click", () => {
    endMeditationSession(false);
    stopMeditationSound();
  });

  // Patch endMeditationSession so audio also stops on auto-complete
  const _origEnd = endMeditationSession;
  endMeditationSession = function (completed) {
    stopMeditationSound();
    _origEnd(completed);
  };

  // Patch showPage to stop meditation when navigating away
  const _origShowPage = showPage;
  showPage = function (pageId) {
    if (pageId !== 'meditation-page' && meditationRunning) {
      endMeditationSession(false);
      stopMeditationSound();
    }
    _origShowPage(pageId);
  };

  // Custom water log listener
  document.getElementById("add-custom-water-btn")?.addEventListener("click", () => {
    const input = document.getElementById("water-custom-amount");
    const amount = parseInt(input.value);
    if (!isNaN(amount) && amount > 0) {
      addWater(amount);
      input.value = "";
    }
  });

  // ==================== END WIRING ====================





  // Pomodoro Presets
  const presetBtns = document.querySelectorAll(".preset-btn");
  presetBtns.forEach(btn => {
    btn.addEventListener("click", function () {
      presetBtns.forEach(b => b.classList.remove("active"));
      this.classList.add("active");

      const work = this.getAttribute("data-work");
      const timeInput = /** @type {HTMLInputElement} */ (document.getElementById("pomodoro-time"));
      if (timeInput) {
        timeInput.value = work || "25";
        document.getElementById("pomodoro-duration-type").value = "minutes";
      }
    });
  });

  // Backup & Restore
  document.getElementById("export-btn")?.addEventListener("click", exportData);
  document.getElementById("import-btn")?.addEventListener("click", () => document.getElementById("import-file")?.click());
  document.getElementById("import-file")?.addEventListener("change", importData);

  // Hook into stopBreathingAnimation to stop sound too
  const originalStopBreathing = stopBreathingAnimation;
  stopBreathingAnimation = function () {
    originalStopBreathing();
    stopMeditationSound();
  }

  // Close button handlers for all pages
  const closeButtons = {
    'closeStreak': 'main',
    'closeJournal': 'main',
    'closeWater': 'main',
    'closePomodoro': 'main',
    'closeChatbot': 'main'
  };

  Object.entries(closeButtons).forEach(([buttonId, targetPage]) => {
    const btn = document.getElementById(buttonId);
    if (btn) {
      btn.addEventListener("click", () => {
        showPage(targetPage);
        // Ensure sounds stop if navigating away via other means (though showPage handles meditation special case)
      });
    }
  });

  // Set initial page
  showPage('main');

  // ==================== NEW FEATURES WIRING ====================

  // --- Task Stats ---
  document.getElementById("taskStatsBtn")?.addEventListener("click", () => {
    closeMenu();
    showTaskStats();
  });

  // --- Shuffle Tasks ---
  document.getElementById("shuffleTasksBtn")?.addEventListener("click", () => {
    closeMenu();
    shuffleTasks();
  });

  // --- Zen Mode ---
  document.getElementById("zenModeBtn")?.addEventListener("click", () => {
    closeMenu();
    toggleZenMode();
  });

  // ==================== DAILY TASK PLACEHOLDER ====================
  const taskPlaceholders = [
    "✨ What do you want to accomplish today?",
    "🎯 Let's crush a goal right now!",
    "🚀 Ready for takeoff? Enter your first task.",
    "💡 What's the big idea for today?",
    "🔥 Time to secure the win. What's next?",
    "⚡ What's the most impactful thing you can do?",
    "🌟 Turn your day into a masterpiece.",
    "📌 Pin down your top priority here.",
    "💪 Let's build some momentum!",
    "🛠️ What are we working on today?",
    "🏆 One step closer to greatness. What is it?",
    "🔥 Spark a new habit today.",
    "📝 Write it down, make it happen.",
    "🌱 Plant the seed for a productive day.",
    "🚀 Launch into action! Next task?",
    "🎯 Aim high. What's your target?",
    "✨ Make today count. What's on the agenda?",
    "💡 Brilliant minds stay organized.",
    "⚡ Power through your to-do list.",
    "🌟 Small steps lead to big victories.",
    "📌 Don't let your ideas escape. Jot them down.",
    "💪 You've got this! First task?",
    "🛠️ Construct a better tomorrow, starting today.",
    "🏆 Champions plan their day.",
    "🔥 Ignite your productivity.",
    "📝 Your future self will thank you.",
    "🌱 Grow your potential, one task at a time.",
    "🚀 Sky's the limit! What's your mission?",
    "🎯 Hit the bullseye on your goals.",
    "✨ Create magic today.",
    "💡 Let's turn thoughts into action.",
    "⚡ Supercharge your workflow.",
    "🌟 Shine bright! What's your focus?",
    "📌 Lock in your next move.",
    "💪 Flex those productivity muscles.",
    "🛠️ Time to get things done.",
    "🏆 Go for gold today.",
    "🔥 Keep the fire burning. Next task?",
    "📝 Document your journey to success.",
    "🌱 Cultivate focus and discipline.",
    "🚀 Boost your efficiency.",
    "🎯 Zero in on what matters.",
    "✨ Transform your day with a single task.",
    "💡 A clear mind starts with a clear list.",
    "⚡ Fast-track your progress.",
    "🌟 Unleash your potential.",
    "📌 Anchor your day with purpose.",
    "💪 Crush your to-dos like a pro.",
    "🛠️ Crafting a productive day.",
    "🏆 Victory belongs to the organized."
  ];

  function updateDailyPlaceholder() {
    const inputEl = document.getElementById("taskone");
    if (!inputEl) return;

    const todayStr = new Date().toDateString();
    const storedDate = appStorage.getItem("placeholderDate");
    let index = parseInt(appStorage.getItem("placeholderIndex") || "0", 10);

    if (storedDate !== todayStr) {
      // It's a new day, pick a new random sentence
      index = Math.floor(Math.random() * taskPlaceholders.length);
      appStorage.setItem("placeholderDate", todayStr);
      appStorage.setItem("placeholderIndex", index.toString());
    }

    inputEl.setAttribute("placeholder", taskPlaceholders[index]);
  }

  updateDailyPlaceholder();

  // Initial empty state check
  updateEmptyState();
});
// ==================== EMOJI MAPPING SYSTEM ====================
const emojiMap = {
  // Books & Reading
  'book': '📚', 'read': '📖', 'reading': '📖', 'page': '📄', 'pages': '📄', 'novel': '📕', 'library': '📚', 'textbook': '📘', 'magazine': '📓', 'comic': '🗯️', 'story': '📖', 'chapter': '🔖', 'journal': '📔', 'diary': '📓', 'writing': '✍️', 'write': '✍️',
  // Exercise & Fitness
  'exercise': '💪', 'workout': '🏋️', 'gym': '🏋️', 'run': '🏃', 'running': '🏃', 'jog': '🏃', 'walk': '🚶', 'walking': '🚶',
  'yoga': '🧘', 'stretch': '🤸', 'fitness': '💪', 'sport': '⚽', 'sports': '⚽', 'bike': '🚴', 'cycling': '🚴', 'swim': '🏊', 'swimming': '🏊', 'lift': '🏋️', 'weights': '🏋️', 'cardio': '🏃', 'pilates': '🧘', 'pushups': '💪', 'situps': '💪', 'squats': '🦵', 'basketball': '🏀', 'football': '🏈', 'soccer': '⚽', 'baseball': '⚾', 'tennis': '🎾', 'volleyball': '🏐', 'rugby': '🏉', 'golf': '⛳', 'marathon': '🏃', 'sprint': '🏃', 'bouldering': '🧗', 'climbing': '🧗', 'martial arts': '🥋', 'karate': '🥋', 'boxing': '🥊', 'skateboard': '🛹', 'surf': '🏄', 'ski': '🎿', 'snowboard': '🏂',
  // Food & Cooking
  'eat': '🍽️', 'food': '🍔', 'cook': '👨‍🍳', 'cooking': '👨‍🍳', 'meal': '🍽️', 'breakfast': '🍳', 'lunch': '🥗', 'dinner': '🍲',
  'snack': '🍪', 'fruit': '🍎', 'vegetable': '🥕', 'water': '💧', 'drink': '🥤', 'coffee': '☕', 'tea': '🍵', 'bake': '🧁', 'baking': '🧁', 'recipe': '📖', 'chef': '🧑‍🍳', 'kitchen': '🔪', 'groceries': '🛒', 'apple': '🍏', 'banana': '🍌', 'orange': '🍊', 'grape': '🍇', 'strawberry': '🍓', 'melon': '🍉', 'peach': '🍑', 'lemon': '🍋', 'pineapple': '🍍', 'coconut': '🥥', 'avocado': '🥑', 'tomato': '🍅', 'carrot': '🥕', 'corn': '🌽', 'potato': '🥔', 'onion': '🧅', 'garlic': '🧄', 'broccoli': '🥦', 'mushroom': '🍄', 'bread': '🍞', 'croissant': '🥐', 'baguette': '🥖', 'pretzel': '🥨', 'cheese': '🧀', 'egg': '🥚', 'meat': '🥩', 'chicken': '🍗', 'bacon': '🥓', 'hamburger': '🍔', 'fries': '🍟', 'pizza': '🍕', 'hotdog': '🌭', 'taco': '🌮', 'burrito': '🌯', 'sandwich': '🥪', 'pasta': '🍝', 'noodles': '🍜', 'soup': '🥣', 'salad': '🥗', 'sushi': '🍣', 'bento': '🍱', 'curry': '🍛', 'rice': '🍚', 'cake': '🍰', 'pie': '🥧', 'chocolate': '🍫', 'candy': '🍬', 'ice cream': '🍦', 'donut': '🍩', 'cookie': '🍪', 'honey': '🍯', 'milk': '🥛', 'juice': '🧃', 'beer': '🍺', 'wine': '🍷', 'cocktail': '🍹', 'champagne': '🍾',
  // Study & Learning
  'study': '📝', 'learn': '📚', 'learning': '📚', 'homework': '📝', 'exam': '📋', 'test': '📋', 'class': '🎓',
  'lesson': '📖', 'course': '📚', 'practice': '✏️', 'review': '📝', 'notes': '📝', 'school': '🏫', 'university': '🎓', 'college': '🎓', 'student': '🧑‍🎓', 'teacher': '🧑‍🏫', 'math': '➗', 'science': '🔬', 'history': '🏺', 'geography': '🌍', 'language': '🗣️', 'physics': '⚛️', 'chemistry': '🧪', 'biology': '🧬', 'art class': '🎨', 'music class': '🎵', 'assignment': '📑', 'essay': '📄', 'thesis': '📜', 'diploma': '📜', 'backpack': '🎒', 'pencil': '✏️', 'pen': '🖊️', 'ruler': '📏', 'calculator': '🧮',
  // Work & Productivity
  'work': '💼', 'meeting': '🤝', 'project': '📁', 'task': '✅', 'todo': '📋', 'deadline': '⏰', 'email': '📧',
  'code': '💻', 'coding': '💻', 'program': '💻', 'programming': '💻', 'develop': '💻', 'development': '💻', 'office': '🏢', 'job': '💼', 'career': '📈', 'business': '👔', 'presentation': '📊', 'report': '📄', 'document': '📝', 'interview': '🗣️', 'resume': '📄', 'colleague': '👥', 'boss': '🧑‍💼', 'manager': '🧑‍💼', 'client': '🤝', 'customer': '🛒', 'sale': '💰', 'marketing': '📈', 'design': '🎨', 'engineer': '👷', 'brainstorm': '🧠', 'focus': '🎯', 'plan': '📅', 'schedule': '🗓️', 'calendar': '📆', 'shift': '⏱️', 'overtime': '⏳',
  // Health & Wellness
  'meditate': '🧘', 'meditation': '🧘', 'sleep': '😴', 'rest': '😴', 'relax': '🧘', 'health': '🏥', 'doctor': '👨‍⚕️',
  'medicine': '💊', 'vitamin': '💊', 'supplement': '💊', 'therapy': '💆', 'massage': '💆', 'hospital': '🏥', 'clinic': '🏥', 'nurse': '👩‍⚕️', 'dentist': '🦷', 'checkup': '🩺', 'sick': '🤒', 'ill': '🤒', 'fever': '🌡️', 'pill': '💊', 'bandaid': '🩹', 'blood': '🩸', 'heart': '❤️', 'brain': '🧠', 'mindfulness': '🧘', 'breathe': '😮‍💨', 'spa': '🧖', 'skincare': '🧴', 'lotion': '🧴', 'sunscreen': '🧴', 'shower': '🚿', 'bath': '🛀', 'brush teeth': '🪥', 'hygiene': '🧼', 'mental health': '🧠', 'therapist': '🛋️',
  // Hobbies & Activities
  'music': '🎵', 'song': '🎵', 'sing': '🎤', 'guitar': '🎸', 'piano': '🎹', 'dance': '💃', 'dancing': '💃',
  'art': '🎨', 'draw': '🖌️', 'drawing': '🖌️', 'paint': '🎨', 'painting': '🎨', 'photo': '📷', 'photography': '📷',
  'game': '🎮', 'gaming': '🎮', 'play': '🎮', 'movie': '🎬', 'film': '🎬', 'watch': '📺', 'tv': '📺', 'cinema': '🍿', 'theater': '🎭', 'concert': '🎫', 'festival': '🎪', 'party': '🎉', 'club': '🪩', 'dj': '🎧', 'instrument': '🎷', 'violin': '🎻', 'drums': '🥁', 'craft': '🧶', 'sew': '🧵', 'knit': '🧶', 'diy': '🛠️', 'build': '🧱', 'woodwork': '🪚', 'pottery': '🏺', 'garden': '🌱', 'plant': '🪴', 'fish': '🎣', 'fishing': '🎣', 'camp': '⛺', 'camping': '⛺', 'hike': '🥾', 'magic': '🪄', 'puzzle': '🧩', 'boardgame': '🎲', 'chess': '♟️', 'cards': '🃏',
  // Shopping & Errands
  'shop': '🛒', 'shopping': '🛒', 'buy': '🛍️', 'store': '🏪', 'grocery': '🛒', 'market': '🏪', 'mall': '🏬', 'boutique': '👗', 'supermarket': '🛒', 'errand': '🏃', 'post office': '🏤', 'mail': '✉️', 'package': '📦', 'delivery': '🚚', 'bank': '🏦', 'pharmacy': '💊', 'laundry': '🧺', 'dryclean': '👔', 'tailor': '🧵', 'mechanic': '🔧', 'car wash': '🧽', 'haircut': '✂️', 'salon': '💇', 'barber': '💈',
  // Cleaning & Chores
  'clean': '🧹', 'cleaning': '🧹', 'wash': '🧽', 'laundry': '👕', 'dishes': '🍽️', 'vacuum': '🧹', 'organize': '📦', 'sweep': '🧹', 'mop': '🪣', 'dust': '🪄', 'trash': '🗑️', 'garbage': '🗑️', 'recycle': '♻️', 'tidy': '✨', 'fold': '👕', 'iron': '🧷', 'chore': '🧹', 'housework': '🏠', 'declutter': '📦',
  // Social & Communication
  'call': '📞', 'phone': '📱', 'message': '💬', 'text': '💬', 'chat': '💬', 'friend': '👫', 'family': '👨‍👩‍👧‍👦',
  'party': '🎉', 'celebration': '🎉', 'birthday': '🎂', 'event': '📅', 'meet': '🤝', 'meeting': '🤝', 'hangout': '🤙', 'date': '❤️', 'couple': '💑', 'wedding': '💒', 'anniversary': '🥂', 'baby': '👶', 'kids': '🧒', 'parents': '👪', 'network': '🌐', 'social': '📱', 'post': '📝', 'comment': '💬', 'share': '📤', 'like': '👍', 'follow': '👥', 'email': '📧', 'letter': '✉️',
  // Travel & Transportation
  'travel': '✈️', 'trip': '🧳', 'vacation': '🏖️', 'car': '🚗', 'drive': '🚗', 'bus': '🚌', 'train': '🚂', 'plane': '✈️', 'flight': '✈️', 'airport': '🛫', 'station': '🚉', 'subway': '🚇', 'taxi': '🚕', 'cab': '🚕', 'bike': '🚲', 'scooter': '🛴', 'boat': '⛵', 'ship': '🚢', 'ferry': '⛴️', 'cruise': '🚢', 'hotel': '🏨', 'motel': '🏨', 'resort': '🏖️', 'beach': '🏖️', 'mountain': '⛰️', 'island': '🏝️', 'city': '🏙️', 'country': '🏞️', 'tour': '🗺️', 'guide': '🧭', 'map': '🗺️', 'passport': '🛂', 'ticket': '🎟️', 'luggage': '🧳', 'pack': '🎒',
  // Finance & Money
  'money': '💰', 'pay': '💳', 'bill': '📄', 'budget': '💰', 'save': '💰', 'bank': '🏦', 'invest': '📈', 'cash': '💵', 'coin': '🪙', 'wallet': '👛', 'purse': '👜', 'credit card': '💳', 'debit': '💳', 'expense': '💸', 'income': '💹', 'salary': '💰', 'wage': '💰', 'tax': '🧾', 'invoice': '🧾', 'receipt': '🧾', 'debt': '📉', 'loan': '🏦', 'mortgage': '🏠', 'rent': '🏠', 'crypto': '₿', 'bitcoin': '₿', 'stock': '📈', 'trade': '💹', 'market': '📊', 'insurance': '🛡️',
  // Pets & Animals
  'pet': '🐾', 'dog': '🐕', 'cat': '🐱', 'walk dog': '🐕', 'feed': '🍽️', 'animal': '🐾', 'puppy': '🐶', 'kitten': '😺', 'bird': '🐦', 'parrot': '🦜', 'fish': '🐠', 'aquarium': '🐟', 'turtle': '🐢', 'rabbit': '🐰', 'bunny': '🐇', 'hamster': '🐹', 'mouse': '🐭', 'rat': '🐀', 'guinea pig': '🐹', 'ferret': '🦦', 'lizard': '🦎', 'snake': '🐍', 'frog': '🐸', 'horse': '🐎', 'ride': '🏇', 'farm': '🚜', 'cow': '🐄', 'pig': '🐖', 'sheep': '🐑', 'goat': '🐐', 'chicken': '🐔', 'duck': '🦆', 'zoo': '🦓', 'lion': '🦁', 'tiger': '🐯', 'bear': '🐻', 'elephant': '🐘', 'monkey': '🐒', 'vet': '🏥',
  // Nature & Outdoors
  'garden': '🌱', 'plant': '🌱', 'flower': '🌺', 'hike': '🥾', 'hiking': '🥾', 'outdoor': '🌳', 'park': '🌳', 'nature': '🌿', 'tree': '🌲', 'forest': '🌲', 'woods': '🌳', 'leaf': '🍃', 'grass': '🌱', 'sun': '☀️', 'moon': '🌙', 'star': '⭐', 'sky': '☁️', 'cloud': '☁️', 'rain': '🌧️', 'snow': '❄️', 'wind': '🌬️', 'storm': '⛈️', 'weather': '🌤️', 'landscape': '🏞️', 'river': '🏞️', 'lake': '🏞️', 'ocean': '🌊', 'sea': '🌊', 'beach': '🏖️', 'sand': '🏖️', 'mountain': '⛰️', 'valley': '🏞️', 'desert': '🏜️', 'volcano': '🌋', 'cave': '🕳️', 'season': '🍂', 'spring': '🌸', 'summer': '☀️', 'autumn': '🍁', 'fall': '🍂', 'winter': '❄️',
  // Technology
  'computer': '💻', 'laptop': '💻', 'internet': '🌐', 'website': '🌐', 'app': '📱', 'phone': '📱', 'smartphone': '📱', 'tablet': '📱', 'desktop': '🖥️', 'monitor': '🖥️', 'keyboard': '⌨️', 'mouse': '🖱️', 'printer': '🖨️', 'wifi': '📶', 'bluetooth': '🛜', 'battery': '🔋', 'charge': '🔌', 'plug': '🔌', 'cable': '🔌', 'hardware': '⚙️', 'software': '💾', 'update': '🔄', 'install': '⬇️', 'download': '⬇️', 'upload': '⬆️', 'cloud': '☁️', 'data': '📊', 'database': '🗄️', 'server': '🗄️', 'network': '🌐', 'security': '🔒', 'password': '🔑', 'login': '🔑', 'account': '👤', 'profile': '👤', 'settings': '⚙️', 'options': '⚙️',
  // Time & Schedule
  'morning': '🌅', 'afternoon': '☀️', 'evening': '🌆', 'night': '🌙', 'today': '📅', 'tomorrow': '📅', 'yesterday': '📅', 'day': '☀️', 'week': '📅', 'month': '📅', 'year': '📅', 'hour': '⌛', 'minute': '⏱️', 'second': '⏱️', 'time': '⌚', 'clock': '🕰️', 'watch': '⌚', 'timer': '⏲️', 'stopwatch': '⏱️', 'appointment': '📅', 'date': '📅', 'event': '📅', 'reminder': '⏰', 'alarm': '⏰', 'early': '🌅', 'late': '🌙', 'soon': '🔜', 'now': '⏳',
  // Emoticons & Feelings
  'happy': '😊', 'smile': '😊', 'joy': '😂', 'laugh': '😂', 'sad': '😢', 'cry': '😭', 'angry': '😠', 'mad': '😡', 'love': '❤️', 'heart': '❤️', 'kiss': '😘', 'hug': '🤗', 'surprise': '😲', 'shock': '😱', 'fear': '😨', 'scared': '😨', 'worry': '😟', 'anxious': '😰', 'stress': '😫', 'tired': '🥱', 'sleepy': '😪', 'bored': '😒', 'excited': '🤩', 'proud': '😌', 'confident': '😎', 'cool': '😎', 'shy': '😳', 'embarrassed': '😳', 'guilty': '😓', 'ashamed': '😔', 'disgust': '🤢', 'sick': '🤒', 'pain': '🤕', 'hurt': '🤕', 'relief': '😮‍💨', 'peace': '☮️', 'hope': '🤞', 'wish': '🌠',
  // Miscellaneous
  'goal': '🎯', 'target': '🎯', 'achieve': '🏆', 'success': '🏆', 'win': '🏆', 'challenge': '💪', 'habit': '🔄',
  'routine': '🔄', 'daily': '📅', 'weekly': '📅', 'monthly': '📅', 'idea': '💡', 'thought': '💭', 'dream': '💭', 'strategy': '♟️', 'vision': '👁️', 'mission': '🚀', 'purpose': '🎯', 'value': '💎', 'belief': '🙏', 'faith': '🙏', 'religion': '⛪', 'church': '⛪', 'mosque': '🕌', 'temple': '🛕', 'synagogue': '🕍', 'pray': '🙏', 'spirit': '👻', 'soul': '🤍', 'luck': '🍀', 'chance': '🎲', 'risk': '⚠️', 'danger': '⚠️', 'warning': '⚠️', 'error': '❌', 'fail': '❌', 'mistake': '❌', 'problem': '❓', 'issue': '❗', 'question': '❓', 'answer': '💡', 'solution': '✅', 'fix': '🔧', 'repair': '🛠️', 'create': '🎨', 'invent': '💡', 'discover': '🔍', 'explore': '🧭', 'search': '🔎', 'find': '🔍', 'lose': '📉', 'hide': '🙈', 'seek': '👀', 'show': '👁️', 'tell': '🗣️', 'speak': '🗣️', 'talk': '🗣️', 'listen': '👂', 'hear': '👂', 'look': '👀', 'see': '👁️', 'smell': '👃', 'taste': '👅', 'touch': '👇', 'feel': '❤️', 'think': '🤔', 'know': '🧠', 'understand': '💡', 'remember': '🧠', 'forget': '🤷', 'decide': '⚖️', 'choose': '🫵', 'select': '✅', 'sell': '💰', 'trade': '🔄', 'barter': '🤝', 'give': '🎁', 'take': '🖐️', 'receive': '🤲', 'send': '📤', 'deliver': '🚚', 'bring': '🎒', 'carry': '🎒', 'hold': '✊', 'drop': '🫳', 'throw': '🤾', 'catch': '🫴', 'push': '🫸', 'pull': '🫷', 'press': '👇', 'click': '🖱️', 'swipe': '👆', 'scroll': '📜', 'zoom': '🔍', 'open': '📂', 'close': '📁', 'start': '▶️', 'stop': '⏹️', 'pause': '⏸️', 'play': '▶️', 'record': '⏺️', 'save': '💾', 'delete': '🗑️', 'edit': '✏️', 'copy': '📋', 'paste': '📋', 'cut': '✂️', 'undo': '↩️', 'redo': '↪️', 'print': '🖨️', 'scan': '📠', 'fax': '📠', 'hangup': '☎️', 'mail': '📮', 'reply': '↩️', 'forward': '↪️', 'share': '📤', 'like': '👍', 'hate': '💔', 'wake': '🌅', 'wash': '🧼', 'teach': '🧑‍🏫', 'jump': '🤸', 'ride': '🏇', 'fly': '✈️', 'go': '🚶', 'come': '🚶', 'arrive': '📍', 'leave': '👋', 'stay': '🏠', 'wait': '⏳', 'hurry': '🏃', 'fast': '🚀', 'slow': '🐢', 'then': '🕰️', 'always': '♾️', 'never': '❌', 'sometimes': '🌗', 'often': '🌖', 'rarely': '🌘', 'maybe': '🤷', 'yes': '✅', 'no': '❌', 'ok': '👌', 'good': '👍', 'bad': '👎', 'great': '🌟', 'awful': '🗑️', 'best': '🏆', 'worst': '📉', 'right': '✅', 'wrong': '❌', 'true': '✅', 'false': '❌', 'real': '💯', 'fake': '🤥', 'new': '🆕', 'old': '🏚️', 'young': '👶', 'adult': '🧑', 'child': '🧒', 'baby': '🍼', 'boy': '👦', 'girl': '👧', 'man': '👨', 'woman': '👩', 'person': '👤', 'people': '👥', 'enemy': '🦹', 'parent': '🧑‍🍼', 'bug': '🐞', 'fire': '🔥', 'earth': '🌍', 'color': '🎨', 'red': '🔴', 'blue': '🔵', 'green': '🟢', 'yellow': '🟡', 'black': '⚫', 'white': '⚪', 'number': '🔢', 'one': '1️⃣', 'two': '2️⃣', 'three': '3️⃣', 'four': '4️⃣', 'five': '5️⃣', 'six': '6️⃣', 'seven': '7️⃣', 'eight': '8️⃣', 'nine': '9️⃣', 'ten': '🔟', 'first': '🥇', 'last': '🏁', 'all': '💯', 'some': '🌗', 'none': '🚫', 'many': '📈', 'few': '📉', 'more': '➕', 'less': '➖', 'big': '🐘', 'small': '🐜', 'tall': '🦒', 'short': '🤏', 'long': '📏', 'wide': '↔️', 'narrow': '↕️', 'heavy': '🏋️', 'light': '🪶', 'hot': '🔥', 'cold': '❄️', 'warm': '🧣', 'dry': '🏜️', 'wet': '💦', 'soft': '☁️', 'hard': '🪨', 'smooth': '🪞', 'rough': '🧗', 'loud': '🔊', 'quiet': '🤫', 'bright': '💡', 'dark': '🌑', 'sharp': '🔪', 'dull': '🥄', 'dirty': '💩', 'full': '🈵', 'empty': '🈳', 'left': '⬅️', 'right': '➡️', 'up': '⬆️', 'down': '⬇️', 'front': '⬆️', 'back': '⬇️', 'in': '📥', 'out': '📤', 'over': '🌈', 'under': '🕳️', 'between': '🥪', 'through': '🚪', 'around': '🔄', 'about': 'ℹ️', 'with': '🤝', 'without': '🚫', 'by': '📍', 'for': '🎁', 'from': '📤', 'to': '📥', 'at': '📍', 'on': '🔛', 'off': '📴', 'and': '➕', 'but': '🤔', 'or': '🔀', 'if': '❓', 'because': '💡', 'why': '❓', 'how': '❓', 'what': '❓', 'who': '👤', 'where': '📍', 'when': '⏱️'
};

function getEmojiForTask(taskText) {
  const lowerText = taskText.toLowerCase();
  for (const [keyword, emoji] of Object.entries(emojiMap)) {
    if (lowerText.includes(keyword)) {
      return emoji;
    }
  }
  return '✅'; // Default emoji
}

// ==================== COLOR SYSTEM FOR TASKS ====================
const taskColors = [
  'rgba(102, 126, 234, 0.8)',   // Purple
  'rgba(245, 87, 108, 0.8)',    // Pink
  'rgba(76, 175, 80, 0.8)',     // Green
  'rgba(33, 150, 243, 0.8)',    // Blue
  'rgba(255, 152, 0, 0.8)',     // Orange
  'rgba(156, 39, 176, 0.8)',    // Purple
  'rgba(0, 188, 212, 0.8)',     // Cyan
  'rgba(255, 87, 34, 0.8)',     // Deep Orange
];

let colorIndex = 0;
function getNextColor() {
  const color = taskColors[colorIndex % taskColors.length];
  colorIndex++;
  return color;
}

// ==================== MAIN VARIABLES ====================
let isSelectionMode = false;
const taskInput = /** @type {HTMLInputElement} */ (document.getElementById("taskone"));
const taskContainer = document.getElementById("task");
const plus = document.getElementById("plus");
let count = 0;

// ==================== DAILY STREAK CHECK (PAUSE SYSTEM) ====================
function checkDailyStreak() {
  if (count <= 0) return; // Nothing to protect

  const lastCompletion = appStorage.getItem("lastCompletionTime");
  if (!lastCompletion) return; // Never completed — nothing to protect

  const lastTime = parseInt(lastCompletion, 10);
  const lastDate = new Date(lastTime);
  const today = new Date();

  // Get yesterday's date
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // If last completion was today or yesterday, streak is safe — unpause
  const lastDateStr = lastDate.toDateString();
  if (lastDateStr === today.toDateString() || lastDateStr === yesterday.toDateString()) {
    if (streakPaused) {
      streakPaused = false;
      saveState();
      updateStreakDisplay();
    }
    return; // Streak is safe
  }

  // Check we haven't already applied pause for this gap
  const lastPenalty = appStorage.getItem("lastStreakPenaltyTime");
  if (lastPenalty) {
    const lastPenaltyTime = parseInt(lastPenalty, 10);
    if (lastPenaltyTime > lastTime) {
      // Already handled — but keep paused state if it was set
      if (streakPaused) updatePauseOverlay();
      return;
    }
  }

  // Calculate how many days were missed
  const msPerDay = 86400000;
  const lastMidnight = new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate()).getTime();
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const missedDays = Math.max(0, Math.floor((todayMidnight - lastMidnight) / msPerDay) - 1);

  // Try to cover missed days with shields (1 shield per missed day)
  if (streakShields > 0 && missedDays > 0) {
    const shieldsToUse = Math.min(streakShields, missedDays);
    for (let i = 0; i < shieldsToUse; i++) {
      useShield();
    }

    if (shieldsToUse >= missedDays) {
      // All missed days covered — streak survives
      appStorage.setItem("lastStreakPenaltyTime", Date.now().toString());
      appStorage.setItem("lastCompletionTime", (Date.now() - msPerDay).toString());
      showNotification(`🛡️ ${shieldsToUse} Shield${shieldsToUse > 1 ? 's' : ''} used to cover ${missedDays} missed day${missedDays > 1 ? 's' : ''}!`);
      return;
    }
    // Some shields used but not enough — fall through to pause
    showNotification(`🛡️ ${shieldsToUse} Shield${shieldsToUse > 1 ? 's' : ''} used, but ${missedDays - shieldsToUse} day${missedDays - shieldsToUse > 1 ? 's' : ''} uncovered!`);
  }

  // No shields or not enough — PAUSE the streak (NOT reset!)
  streakPaused = true;

  saveState();
  updateStreakDisplay();
  if (document.getElementById("streak-page")?.classList.contains("active")) {
    renderStreakPage();
  }
  showStreakPausedNotification();

  // Mark penalty as applied
  appStorage.setItem("lastStreakPenaltyTime", Date.now().toString());
}

function showStreakPausedNotification() {
  showNotification("⏸️ Streak paused! Complete your vitality factors to resume.");
  const streakEl = document.getElementById("streak");
  const streakNumber = document.getElementById("streak-number");

  // Shake animation
  [streakEl, streakNumber?.closest(".streak-count-display")].forEach(el => {
    if (!el) return;
    el.classList.add("streak-loss-shake");
    setTimeout(() => el.classList.remove("streak-loss-shake"), 800);
  });
}

function showStreakLossAnimation(lostCount) {
  const streakEl = document.getElementById("streak");
  const streakNumber = document.getElementById("streak-number");

  // Shake and red-flash the streak display
  [streakEl, streakNumber?.closest(".streak-count-display")].forEach(el => {
    if (!el) return;
    el.classList.add("streak-loss-shake");
    setTimeout(() => el.classList.remove("streak-loss-shake"), 800);
  });

  // Floating badge showing full reset
  const badge = document.createElement("div");
  badge.className = "streak-loss-badge";
  badge.textContent = lostCount ? `💀 -${lostCount} streak lost!` : "💀 Streak lost!";
  document.body.appendChild(badge);

  // Position near streak display
  const rect = streakEl?.getBoundingClientRect();
  if (rect) {
    badge.style.left = (rect.left + rect.width / 2) + "px";
    badge.style.top = rect.top + "px";
  }

  setTimeout(() => badge.remove(), 2500);
}


// ==================== PRIORITY SYSTEM ====================
const PRIORITY_CONFIG = {
  critical: { emoji: String.fromCodePoint(0x1F525), label: 'Critical', class: 'priority-badge-critical' },
  high: { emoji: String.fromCodePoint(0x26A1), label: 'High', class: 'priority-badge-high' },
  medium: { emoji: String.fromCodePoint(0x1F3AF), label: 'Medium', class: 'priority-badge-medium' },
  low: { emoji: String.fromCodePoint(0x1F33F), label: 'Low', class: 'priority-badge-low' },
  chill: { emoji: String.fromCodePoint(0x1F9CA), label: 'Chill', class: 'priority-badge-chill' }
};

let currentPriorityTarget = null;

function openPriorityModal(li) {
  currentPriorityTarget = li;
  const overlay = document.getElementById('priority-modal-overlay');
  const taskNameEl = document.getElementById('priority-modal-task-name');
  if (!overlay) return;
  const span = li.querySelector('span:not(.task-emoji):not(.task-tag):not(.task-priority-badge)');
  if (taskNameEl) taskNameEl.textContent = span ? span.textContent : '';

  // Highlight current priority
  const currentPrio = li.getAttribute('data-priority');
  document.querySelectorAll('#priority-levels .priority-level-btn').forEach(btn => {
    if (btn.getAttribute('data-priority') === currentPrio) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  overlay.classList.remove('hidden');
}

function closePriorityModal() {
  const overlay = document.getElementById('priority-modal-overlay');
  if (overlay) overlay.classList.add('hidden');
  currentPriorityTarget = null;
}

function setPriorityOnTask(li, priority) {
  li.classList.remove('priority-critical', 'priority-high', 'priority-medium', 'priority-low', 'priority-chill');
  li.setAttribute('data-priority', priority || '');
  const oldBadge = li.querySelector('.task-priority-badge, .task-priority-set-btn');
  if (oldBadge) oldBadge.remove();
  const focusBtn = li.querySelector('.task-focus-btn');
  if (priority && PRIORITY_CONFIG[priority]) {
    li.classList.add('priority-' + priority);
    const cfg = PRIORITY_CONFIG[priority];
    const badge = document.createElement('span');
    badge.className = 'task-priority-badge ' + cfg.class;
    badge.textContent = cfg.emoji;
    badge.title = cfg.label + ' — Click to change';
    badge.addEventListener('click', function (e) {
      e.stopPropagation();
      openPriorityModal(li);
    });
    if (focusBtn) li.insertBefore(badge, focusBtn);
    else li.appendChild(badge);
  } else {
    const setBtn = document.createElement('button');
    setBtn.className = 'task-priority-set-btn';
    setBtn.textContent = '⚡ Set Priority';
    setBtn.title = 'Set task priority';
    setBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      openPriorityModal(li);
    });
    if (focusBtn) li.insertBefore(setBtn, focusBtn);
    else li.appendChild(setBtn);
  }
}

document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('#priority-levels .priority-level-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (!currentPriorityTarget) return;
      const priority = this.getAttribute('data-priority');
      setPriorityOnTask(currentPriorityTarget, priority);
      closePriorityModal();
      saveState();
    });
  });
  document.getElementById('priority-clear-btn')?.addEventListener('click', function () {
    if (currentPriorityTarget) {
      setPriorityOnTask(currentPriorityTarget, null);
      closePriorityModal();
      saveState();
    }
  });
  document.getElementById('priority-cancel-btn')?.addEventListener('click', closePriorityModal);
  document.getElementById('priority-modal-overlay')?.addEventListener('click', function (e) {
    if (e.target === this) closePriorityModal();
  });

  // ==================== VITALITY CONFIG PANEL ====================
  initVitalityConfigUI();

  // Streak Settings Collapsible Panel
  const streakSettingsBtn = document.getElementById("streakSettingsBtn");
  const streakSettingsPanel = document.getElementById("streak-settings-panel");
  if (streakSettingsBtn && streakSettingsPanel) {
    streakSettingsBtn.addEventListener("click", () => {
      streakSettingsPanel.classList.toggle("hidden");
      if (!streakSettingsPanel.classList.contains("hidden")) {
        renderVitalityConfigCards();
      }
    });
  }
});

function initVitalityConfigUI() {
  renderVitalityConfigCards();
}

function renderVitalityConfigCards() {
  const grid = document.getElementById("vitality-config-grid");
  if (!grid) return;

  const cfg = loadVitalityConfig();
  grid.innerHTML = "";

  // Check if DC is enabled (sync check from localStorage cache)
  const dcEnabled = window._dcEnabledCache !== false;

  // Ensure 'challenge' is in factors when DC is on, removed when off
  if (dcEnabled && !cfg.factors.includes("challenge")) {
    cfg.factors.unshift("challenge");
    if (cfg.factors.length > 5) cfg.factors = cfg.factors.slice(0, 5);
    saveVitalityConfig(cfg);
  } else if (!dcEnabled && cfg.factors.includes("challenge")) {
    cfg.factors = cfg.factors.filter(f => f !== "challenge");
    saveVitalityConfig(cfg);
  }

  VITALITY_FACTOR_POOL.forEach(factor => {
    // Hide challenge factor when DC is disabled
    if (factor.id === "challenge" && !dcEnabled) return;

    const isActive = cfg.factors.includes(factor.id);
    const isLocked = factor.id === "challenge" && dcEnabled;
    const card = document.createElement("div");
    card.className = `vitality-factor-card ${isActive ? "active" : ""}${isLocked ? " vf-locked" : ""}`;
    card.innerHTML = `
      <div class="vf-icon">${factor.emoji}</div>
      <div class="vf-info">
        <span class="vf-label">${factor.label}${isLocked ? " 🔒" : ""}</span>
        <span class="vf-desc">${factor.desc}</span>
      </div>
      <div class="vf-toggle-indicator">${isActive ? "✓" : ""}</div>
    `;

    if (isLocked) {
      card.addEventListener("click", () => {
        showNotification("🔒 Daily Challenge is a mandatory factor! Disable it in Settings to remove.");
        card.classList.add("vf-shake");
        setTimeout(() => card.classList.remove("vf-shake"), 500);
      });
    } else {
      card.addEventListener("click", () => {
        const currentCfg = loadVitalityConfig();
        const idx = currentCfg.factors.indexOf(factor.id);
        if (idx > -1) {
          // Removing — count non-locked factors
          if (currentCfg.factors.length <= 3) {
            showNotification("⚠️ Minimum 3 factors required!");
            card.classList.add("vf-shake");
            setTimeout(() => card.classList.remove("vf-shake"), 500);
            return;
          }
          currentCfg.factors.splice(idx, 1);
        } else {
          // Adding
          if (currentCfg.factors.length >= 5) {
            showNotification("⚠️ Maximum 5 factors allowed!");
            card.classList.add("vf-shake");
            setTimeout(() => card.classList.remove("vf-shake"), 500);
            return;
          }
          currentCfg.factors.push(factor.id);
        }
        saveVitalityConfig(currentCfg);
        renderVitalityConfigCards();
        updateVitalityUI();
        if (typeof updateBloomWidgets === "function") updateBloomWidgets();
      });
    }

    grid.appendChild(card);
  });

  // Update counter
  const counter = document.getElementById("vitality-factor-counter");
  if (counter) counter.textContent = `${cfg.factors.length}/5 selected (min 3)`;
}

// ==================== TASK CREATION WITH EMOJI AND COLOR ====================
function createTaskItem(textValue, completed, taskColor, taskEmoji, taskPriority) {
  const li = document.createElement("li");
  li.className = "task-item";

  const text = document.createElement("span");
  text.className = "task-text";

  // Get emoji and color
  const emoji = taskEmoji || getEmojiForTask(textValue);
  const color = taskColor || getNextColor();

  // Create selection checkbox (hidden by default)
  const selectCb = document.createElement("input");
  selectCb.type = "checkbox";
  selectCb.className = "task-select-cb";
  selectCb.addEventListener("change", updateSelectedCount);

  // Create emoji badge
  const emojiBadge = document.createElement("span");
  emojiBadge.className = "task-emoji";
  emojiBadge.textContent = emoji;

  text.textContent = textValue;
  text.style.cssText = "flex: 1 1 0; min-width: 0; overflow-wrap: break-word; word-break: normal; display: block; font-weight: 600; font-size: 0.9rem; line-height: 1.4;";

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = !!completed;

  checkbox.addEventListener("change", function () {
    const focusBtnEl = li.querySelector(".task-focus-btn");
    const setPriorityBtnEl = li.querySelector(".task-priority-set-btn");
    if (checkbox.checked) {
      li.classList.add("completed");
      li.classList.add("celebrate");
      setTimeout(() => li.classList.remove("celebrate"), 600);
      // Fade out the focus button
      if (focusBtnEl) {
        focusBtnEl.style.transition = "opacity 0.4s ease, transform 0.4s ease";
        focusBtnEl.style.opacity = "0";
        focusBtnEl.style.transform = "scale(0.8)";
        focusBtnEl.style.pointerEvents = "none";
      }
      if (setPriorityBtnEl) {
        setPriorityBtnEl.style.transition = "opacity 0.4s ease, transform 0.4s ease";
        setPriorityBtnEl.style.opacity = "0";
        setPriorityBtnEl.style.transform = "scale(0.8)";
        setPriorityBtnEl.style.pointerEvents = "none";
      }
    } else {
      li.classList.remove("completed");
      // Fade the focus button back in
      if (focusBtnEl) {
        focusBtnEl.style.transition = "opacity 0.4s ease, transform 0.4s ease";
        focusBtnEl.style.opacity = "1";
        focusBtnEl.style.transform = "scale(1)";
        focusBtnEl.style.pointerEvents = "auto";
      }
      if (setPriorityBtnEl) {
        setPriorityBtnEl.style.transition = "opacity 0.4s ease, transform 0.4s ease";
        setPriorityBtnEl.style.opacity = "1";
        setPriorityBtnEl.style.transform = "scale(1)";
        setPriorityBtnEl.style.pointerEvents = "auto";
      }
    }
    allchecked();
    saveState();
  });

  if (completed) {
    li.classList.add("completed");
  }

  li.addEventListener("dblclick", function () {
    if (isSelectionMode) return;
    const newtext = prompt("Edit task:", text.textContent);
    if (newtext === null || newtext.trim() === "") return;
    text.textContent = newtext;
    const newEmoji = getEmojiForTask(newtext);
    emojiBadge.textContent = newEmoji;
    saveState();
  });

  li.appendChild(selectCb);
  li.appendChild(checkbox);
  li.appendChild(emojiBadge);
  li.appendChild(text);

  // Priority badge or set-btn
  setPriorityOnTask(li, taskPriority);

  // Focus button — click to start a Pomodoro session for this task
  const focusBtn = document.createElement("button");
  focusBtn.className = "task-focus-btn";
  focusBtn.textContent = "▶";
  focusBtn.title = `Start a Pomodoro focus session for this task`;
  focusBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    startFocusSession(textValue, checkbox);
  });
  li.appendChild(focusBtn);

  // If task is already completed on load, hide the focus button immediately
  if (completed) {
    const setPriorityBtnEl = li.querySelector(".task-priority-set-btn");
    if (setPriorityBtnEl) {
      setPriorityBtnEl.style.opacity = "0";
      setPriorityBtnEl.style.transform = "scale(0.8)";
      setPriorityBtnEl.style.pointerEvents = "none";
    }
    focusBtn.style.opacity = "0";
    focusBtn.style.transform = "scale(0.8)";
    focusBtn.style.pointerEvents = "none";
  }

  taskContainer.appendChild(li);
  updateEmptyState();

  li.style.opacity = "0";
  li.style.transform = "translateX(-30px)";
  setTimeout(() => {
    li.style.transition = "all 0.4s ease-out";
    li.style.opacity = "1";
    li.style.transform = "translateX(0)";
  }, 10);

  return { emoji, color };
}

// Start a focused Pomodoro session for a specific task
function startFocusSession(taskName, checkboxElement = null) {
  // Navigate to Pomodoro page
  showPage('pomodoro-page');

  // Store the checkbox reference so we can auto-complete it later
  currentFocusTaskCheckbox = checkboxElement;

  // Keep the main heading generic
  const heading = document.getElementById('pomodoro-heading');
  if (heading) {
    heading.textContent = `🍅 Pomodoro Timer`;
  }

  // Show the special focus banner
  const banner = document.getElementById('focus-task-banner');
  if (banner) {
    const emojiMatch = taskName.match(/^([\uD800-\uDBFF][\uDC00-\uDFFF]|\p{Emoji_Presentation}|\p{Extended_Pictographic})/gu);
    let emoji = "🎯";
    let text = taskName;

    // If the task starts with an emoji, extract it for the big display
    if (emojiMatch && emojiMatch[0]) {
      emoji = emojiMatch[0];
      text = taskName.replace(emoji, "").trim();
    } else {
      // Try to get an emoji from our utility function
      emoji = getEmojiForTask(taskName);
    }

    banner.innerHTML = `
      <div class="focus-banner-label">CURRENTLY FOCUSING ON</div>
      <span class="focus-banner-emoji">${emoji}</span>
      <div class="focus-banner-task">${text}</div>
    `;
    banner.classList.remove('hidden');

    let inst = document.getElementById('pomodoro-inst-text');
    if (!inst) {
      inst = document.createElement('div');
      inst.id = 'pomodoro-inst-text';
      inst.style.cssText = 'text-align: center; font-size: 0.95rem; color: var(--text-main); font-weight: 600; background: rgba(102, 126, 234, 0.1); border: 1px dashed var(--primary); padding: 12px; border-radius: 10px; margin-bottom: 15px; margin-top: 5px; transition: opacity 1s ease;';
      banner.insertAdjacentElement('afterend', inst);
    }
    inst.textContent = "Choose your pomodoro style, set the timer and start it... till completion to make the task fade away and it will be ticked automatically.";
    inst.style.display = "block";
    inst.style.opacity = "1";

    if (window.pomodoroInstTimeout) clearTimeout(window.pomodoroInstTimeout);
    window.pomodoroInstTimeout = setTimeout(() => {
      inst.style.opacity = "0";
      setTimeout(() => { if (inst.style.opacity === "0") inst.style.display = "none"; }, 1000);
    }, 25000);
  }

  showNotification(`🎯 Focus mode for "${taskName}". Set your duration and press Start!`);
}

function addTask() {
  if (taskInput.value.trim() === "") return;

  plus.style.transform = "scale(0.9)";
  setTimeout(() => {
    plus.style.transform = "scale(1)";
  }, 150);

  createTaskItem(taskInput.value.trim(), false, null, null, null);
  taskInput.value = "";
  taskInput.focus();
  allchecked();
  saveState();
}

plus.addEventListener("click", addTask);
taskInput.addEventListener("keypress", function (e) {
  if (e.key === "Enter") {
    addTask();
  }
});


// ==================== TASK COMPLETION CHECK ====================
const donebtn = document.getElementById("alldone");
let all = document.getElementById("all");
let streak = document.getElementById("streak");

function allchecked() {
  /** @type {NodeListOf<HTMLInputElement>} */
  let checkboxes = document.querySelectorAll("#task input[type='checkbox']:not(.task-select-cb)");
  updateEmptyState();
  if (checkboxes.length === 0) {
    donebtn.style.display = "none";
    return;
  }
  const check = Array.from(checkboxes).every(cb => cb.checked);

  if (check) {
    donebtn.style.display = "block";
    const tasksDoneDate = appStorage.getItem("tasksCompletedDate");
    const todayStr = new Date().toDateString();

    if (tasksDoneDate === todayStr) {
      donebtn.textContent = "✅ All Tasks Completed!";
      donebtn.disabled = true;
      donebtn.classList.add("alldone-completed");
    } else {
      donebtn.textContent = "🎉 All Tasks Completed!";
      donebtn.disabled = false;
      donebtn.classList.remove("alldone-completed");
    }
  } else {
    donebtn.style.display = "none";
  }

  // Always update vitality
  if (typeof updateVitalityUI === "function") updateVitalityUI();
}

// ==================== CLOSE MENU HELPER ====================
function closeMenu() {
  document.getElementById("menuDropdown")?.classList.add("hidden");
}

// ==================== EMPTY STATE ====================
function updateEmptyState() {
  const emptyState = document.getElementById("empty-state");
  const taskList = document.getElementById("task");
  if (!emptyState || !taskList) return;
  const hasTasks = taskList.children.length > 0;
  emptyState.style.display = hasTasks ? "none" : "flex";
}

// ==================== TASK STATS ====================
function showTaskStats() {
  const allItems = document.querySelectorAll("#task .task-item");
  const completedItems = document.querySelectorAll("#task .task-item.completed");
  const total = allItems.length;
  const completed = completedItems.length;
  const pending = total - completed;
  const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

  const overlay = document.createElement("div");
  overlay.className = "stats-modal-overlay";
  overlay.innerHTML = `
    <div class="stats-modal">
      <h3>📊 Task Stats</h3>
      <div class="stats-grid-mini">
        <div class="stat-mini-card">
          <span class="stat-mini-value">${total}</span>
          <span class="stat-mini-label">Total Tasks</span>
        </div>
        <div class="stat-mini-card">
          <span class="stat-mini-value">${completed}</span>
          <span class="stat-mini-label">Completed</span>
        </div>
        <div class="stat-mini-card">
          <span class="stat-mini-value">${pending}</span>
          <span class="stat-mini-label">Pending</span>
        </div>
        <div class="stat-mini-card">
          <span class="stat-mini-value">${rate}%</span>
          <span class="stat-mini-label">Completion</span>
        </div>
      </div>
      <button class="stats-close-btn" id="close-stats-modal">Close</button>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector("#close-stats-modal").addEventListener("click", () => overlay.remove());
  overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.remove(); });
}

// ==================== SHUFFLE TASKS ====================
function shuffleTasks() {
  const taskList = document.getElementById("task");
  if (!taskList || taskList.children.length < 2) {
    showNotification("✨ Add more tasks to shuffle!");
    return;
  }
  const items = Array.from(taskList.children);
  // Fisher-Yates shuffle
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  // Re-append in shuffled order with staggered animation
  items.forEach((item, idx) => {
    item.style.transition = "none";
    item.style.opacity = "0";
    item.style.transform = "translateX(-20px)";
    taskList.appendChild(item);
    setTimeout(() => {
      item.style.transition = "all 0.4s ease-out";
      item.style.opacity = "1";
      item.style.transform = "translateX(0)";
    }, idx * 80);
  });
  saveState();
  showNotification("🎲 Tasks shuffled!");
}

// ==================== ZEN MODE ====================
function toggleZenMode() {
  document.body.classList.toggle("zen-mode");
  const isZen = document.body.classList.contains("zen-mode");
  const zenBtn = document.getElementById("zenModeBtn");
  if (zenBtn) {
    zenBtn.textContent = isZen ? "☀️ Exit Zen Mode" : "🌙 Zen Mode";
  }
  if (isZen) {
    showNotification("🌙 Zen Mode activated — focus on your tasks!");
  } else {
    showNotification("☀️ Zen Mode deactivated");
  }
}

let lastCastleStage = -1;

const CASTLE_STAGES = [
  { min: 0, name: '🪨 Foundation', sky: 'stage-dawn', next: 'Walls', nextAt: 4 },
  { min: 4, name: '🧱 Walls', sky: 'stage-day', next: 'Cottage', nextAt: 10 },
  { min: 10, name: '🏠 Cottage', sky: 'stage-afternoon', next: 'Tower', nextAt: 20 },
  { min: 20, name: '🗼 Tower', sky: 'stage-sunset', next: 'Castle', nextAt: 35 },
  { min: 35, name: '🏰 Castle', sky: 'stage-dusk', next: 'Grand Castle', nextAt: 60 },
  { min: 60, name: '🏯 Grand Castle', sky: 'stage-twilight', next: 'Kingdom', nextAt: 100 },
  { min: 100, name: '✨ Kingdom', sky: 'stage-night', next: 'Sky Castle', nextAt: 200 },
  { min: 200, name: '☁️ Sky Castle', sky: 'stage-magic', next: null, nextAt: null }
];

function getCastleStageIndex(days) {
  for (let i = CASTLE_STAGES.length - 1; i >= 0; i--) {
    if (days >= CASTLE_STAGES[i].min) return i;
  }
  return 0;
}

function getCastleHTML(stageIdx) {
  switch (stageIdx) {
    case 0: // Foundation
      return `<div class="castle-block" style="display:flex;align-items:flex-end;justify-content:center;">
        <div class="c-foundation"></div>
      </div>`;
    case 1: // Walls
      return `<div class="castle-block" style="display:flex;align-items:flex-end;justify-content:center;gap:2px;">
        <div class="c-wall" style="width:20px;height:30px;"></div>
        <div class="c-wall" style="width:30px;height:25px;"></div>
        <div class="c-wall" style="width:20px;height:30px;"></div>
      </div>`;
    case 2: // Cottage
      return `<div class="castle-block" style="display:flex;flex-direction:column;align-items:center;">
        <div style="width:0;height:0;border-left:30px solid transparent;border-right:30px solid transparent;border-bottom:18px solid #8D6E63;"></div>
        <div class="c-wall" style="width:50px;height:35px;display:flex;align-items:center;justify-content:center;gap:6px;">
          <div class="c-window"></div>
          <div class="c-door"></div>
        </div>
      </div>`;
    case 3: // Tower
      return `<div class="castle-block" style="display:flex;flex-direction:column;align-items:center;">
        <div class="c-tower-roof" style="border-left-width:16px;border-right-width:16px;border-bottom-width:18px;"></div>
        <div class="c-tower" style="width:28px;height:55px;display:flex;flex-direction:column;align-items:center;justify-content:space-around;padding:4px;">
          <div class="c-window"></div>
          <div class="c-window"></div>
        </div>
        <div class="c-wall" style="width:60px;height:25px;display:flex;align-items:center;justify-content:center;">
          <div class="c-door"></div>
        </div>
      </div>`;
    case 4: // Castle
      return `<div class="castle-block" style="display:flex;align-items:flex-end;gap:0;">
        <div style="display:flex;flex-direction:column;align-items:center;">
          <div class="c-tower-roof" style="border-left-width:12px;border-right-width:12px;border-bottom-width:14px;"></div>
          <div class="c-tower" style="width:22px;height:45px;display:flex;flex-direction:column;align-items:center;justify-content:space-around;padding:3px;">
            <div class="c-window"></div><div class="c-window"></div>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:center;">
          <div class="c-wall" style="width:50px;height:35px;display:flex;align-items:flex-end;justify-content:center;padding-bottom:2px;">
            <div class="c-gate"></div>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:center;">
          <div class="c-tower-roof" style="border-left-width:12px;border-right-width:12px;border-bottom-width:14px;"></div>
          <div class="c-tower" style="width:22px;height:45px;display:flex;flex-direction:column;align-items:center;justify-content:space-around;padding:3px;">
            <div class="c-window"></div><div class="c-window"></div>
          </div>
        </div>
      </div>`;
    case 5: // Grand Castle
      return `<div class="castle-block" style="display:flex;align-items:flex-end;gap:0;position:relative;">
        <div class="c-banner" style="position:absolute;top:-20px;left:10px;"></div>
        <div class="c-banner" style="position:absolute;top:-20px;right:10px;"></div>
        <div style="display:flex;flex-direction:column;align-items:center;">
          <div class="c-tower-roof" style="border-left-width:10px;border-right-width:10px;border-bottom-width:12px;"></div>
          <div class="c-tower" style="width:18px;height:50px;display:flex;flex-direction:column;align-items:center;justify-content:space-around;padding:2px;">
            <div class="c-window"></div><div class="c-window"></div><div class="c-window"></div>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:center;">
          <div class="c-tower-roof" style="border-left-width:14px;border-right-width:14px;border-bottom-width:16px;border-bottom-color:#FFD54F;"></div>
          <div class="c-tower" style="width:26px;height:60px;display:flex;flex-direction:column;align-items:center;justify-content:space-around;padding:3px;">
            <div class="c-window"></div><div class="c-window"></div>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:center;">
          <div class="c-wall" style="width:40px;height:40px;display:flex;align-items:flex-end;justify-content:center;padding-bottom:2px;">
            <div class="c-gate"></div>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:center;">
          <div class="c-tower-roof" style="border-left-width:14px;border-right-width:14px;border-bottom-width:16px;border-bottom-color:#FFD54F;"></div>
          <div class="c-tower" style="width:26px;height:60px;display:flex;flex-direction:column;align-items:center;justify-content:space-around;padding:3px;">
            <div class="c-window"></div><div class="c-window"></div>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:center;">
          <div class="c-tower-roof" style="border-left-width:10px;border-right-width:10px;border-bottom-width:12px;"></div>
          <div class="c-tower" style="width:18px;height:50px;display:flex;flex-direction:column;align-items:center;justify-content:space-around;padding:2px;">
            <div class="c-window"></div><div class="c-window"></div><div class="c-window"></div>
          </div>
        </div>
        <div class="c-moat" style="position:absolute;bottom:-8px;left:-5px;right:-5px;"></div>
      </div>`;
    case 6: // Kingdom
      return `<div class="castle-block" style="display:flex;align-items:flex-end;gap:0;position:relative;">
        <div class="c-lantern" style="top:-30px;left:15px;">🏮</div>
        <div class="c-lantern" style="top:-25px;right:20px;animation-delay:2s;">🏮</div>
        <div class="c-lantern" style="top:-35px;left:50%;animation-delay:4s;">🏮</div>
        <div style="display:flex;flex-direction:column;align-items:center;">
          <div class="c-tower-roof" style="border-left-width:10px;border-right-width:10px;border-bottom-width:12px;border-bottom-color:#FFD54F;"></div>
          <div class="c-tower" style="width:18px;height:55px;background:linear-gradient(135deg,#FFE082,#FFD54F);display:flex;flex-direction:column;align-items:center;justify-content:space-around;padding:2px;">
            <div class="c-window"></div><div class="c-window"></div><div class="c-window"></div>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:center;">
          <div class="c-tower-roof" style="border-left-width:16px;border-right-width:16px;border-bottom-width:20px;border-bottom-color:#FFD54F;"></div>
          <div class="c-tower" style="width:30px;height:70px;background:linear-gradient(135deg,#FFE082,#FFD54F);display:flex;flex-direction:column;align-items:center;justify-content:space-around;padding:3px;">
            <div class="c-window" style="width:10px;height:12px;"></div><div class="c-window" style="width:10px;height:12px;"></div>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:center;">
          <div class="c-wall" style="width:35px;height:45px;background:linear-gradient(135deg,#FFE082,#FFCC80);display:flex;align-items:flex-end;justify-content:center;padding-bottom:2px;">
            <div class="c-gate" style="background:#5D4037;"></div>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:center;">
          <div class="c-tower-roof" style="border-left-width:16px;border-right-width:16px;border-bottom-width:20px;border-bottom-color:#FFD54F;"></div>
          <div class="c-tower" style="width:30px;height:70px;background:linear-gradient(135deg,#FFE082,#FFD54F);display:flex;flex-direction:column;align-items:center;justify-content:space-around;padding:3px;">
            <div class="c-window" style="width:10px;height:12px;"></div><div class="c-window" style="width:10px;height:12px;"></div>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:center;">
          <div class="c-tower-roof" style="border-left-width:10px;border-right-width:10px;border-bottom-width:12px;border-bottom-color:#FFD54F;"></div>
          <div class="c-tower" style="width:18px;height:55px;background:linear-gradient(135deg,#FFE082,#FFD54F);display:flex;flex-direction:column;align-items:center;justify-content:space-around;padding:2px;">
            <div class="c-window"></div><div class="c-window"></div><div class="c-window"></div>
          </div>
        </div>
        <div class="c-moat" style="position:absolute;bottom:-8px;left:-10px;right:-10px;background:linear-gradient(90deg,#7C4DFF,#B388FF,#7C4DFF);"></div>
      </div>`;
    case 7: // Sky Castle
      return `<div class="castle-block" style="display:flex;align-items:flex-end;gap:0;position:relative;">
        <div class="c-aura"></div>
        <div class="c-lantern" style="top:-40px;left:5px;">✨</div>
        <div class="c-lantern" style="top:-35px;right:10px;animation-delay:1.5s;">✨</div>
        <div class="c-lantern" style="top:-45px;left:45%;animation-delay:3s;">⭐</div>
        <div class="c-lantern" style="top:-30px;left:70%;animation-delay:4.5s;">✨</div>
        <div style="display:flex;flex-direction:column;align-items:center;">
          <div class="c-tower-roof" style="border-left-width:12px;border-right-width:12px;border-bottom-width:14px;border-bottom-color:#E1BEE7;"></div>
          <div class="c-tower" style="width:22px;height:60px;background:linear-gradient(135deg,#E1BEE7,#CE93D8);display:flex;flex-direction:column;align-items:center;justify-content:space-around;padding:3px;">
            <div class="c-window" style="background:#B388FF;box-shadow:0 0 6px rgba(179,136,255,0.8);"></div>
            <div class="c-window" style="background:#B388FF;box-shadow:0 0 6px rgba(179,136,255,0.8);"></div>
            <div class="c-window" style="background:#B388FF;box-shadow:0 0 6px rgba(179,136,255,0.8);"></div>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:center;">
          <div style="font-size:14px;margin-bottom:-4px;">👑</div>
          <div class="c-tower-roof" style="border-left-width:18px;border-right-width:18px;border-bottom-width:22px;border-bottom-color:#E1BEE7;"></div>
          <div class="c-tower" style="width:34px;height:80px;background:linear-gradient(135deg,#E1BEE7,#CE93D8);display:flex;flex-direction:column;align-items:center;justify-content:space-around;padding:4px;">
            <div class="c-window" style="width:12px;height:14px;background:#B388FF;box-shadow:0 0 8px rgba(179,136,255,0.9);"></div>
            <div class="c-window" style="width:12px;height:14px;background:#B388FF;box-shadow:0 0 8px rgba(179,136,255,0.9);"></div>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:center;">
          <div class="c-wall" style="width:40px;height:50px;background:linear-gradient(135deg,#E1BEE7,#CE93D8);display:flex;align-items:flex-end;justify-content:center;padding-bottom:2px;">
            <div class="c-gate" style="background:#7B1FA2;border-color:#6A1B9A;"></div>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:center;">
          <div style="font-size:14px;margin-bottom:-4px;">👑</div>
          <div class="c-tower-roof" style="border-left-width:18px;border-right-width:18px;border-bottom-width:22px;border-bottom-color:#E1BEE7;"></div>
          <div class="c-tower" style="width:34px;height:80px;background:linear-gradient(135deg,#E1BEE7,#CE93D8);display:flex;flex-direction:column;align-items:center;justify-content:space-around;padding:4px;">
            <div class="c-window" style="width:12px;height:14px;background:#B388FF;box-shadow:0 0 8px rgba(179,136,255,0.9);"></div>
            <div class="c-window" style="width:12px;height:14px;background:#B388FF;box-shadow:0 0 8px rgba(179,136,255,0.9);"></div>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:center;">
          <div class="c-tower-roof" style="border-left-width:12px;border-right-width:12px;border-bottom-width:14px;border-bottom-color:#E1BEE7;"></div>
          <div class="c-tower" style="width:22px;height:60px;background:linear-gradient(135deg,#E1BEE7,#CE93D8);display:flex;flex-direction:column;align-items:center;justify-content:space-around;padding:3px;">
            <div class="c-window" style="background:#B388FF;box-shadow:0 0 6px rgba(179,136,255,0.8);"></div>
            <div class="c-window" style="background:#B388FF;box-shadow:0 0 6px rgba(179,136,255,0.8);"></div>
            <div class="c-window" style="background:#B388FF;box-shadow:0 0 6px rgba(179,136,255,0.8);"></div>
          </div>
        </div>
      </div>`;
    default:
      return `<div class="c-foundation"></div>`;
  }
}

function updateCastleVisual() {
  const scene = document.getElementById("castle-scene");
  const sky = document.getElementById("castle-sky");
  const stageLabel = document.getElementById("castle-stage-label");
  const progressFill = document.getElementById("castle-progress-fill");
  const nextLabel = document.getElementById("castle-next-label");
  const starsContainer = document.getElementById("castle-stars");
  if (!scene || !sky) return;

  const stageIdx = getCastleStageIndex(count);
  const stage = CASTLE_STAGES[stageIdx];

  // Use 3D castle if available
  if (typeof window.updateCastle3D === "function") {
    window.updateCastle3D(stageIdx);
  } else {
    // Fallback: old CSS art
    sky.className = "castle-sky " + stage.sky;
    if ((stage.sky === "stage-night" || stage.sky === "stage-magic") && starsContainer && starsContainer.children.length === 0) {
      for (let i = 0; i < 25; i++) {
        const star = document.createElement("div");
        star.className = "castle-star";
        star.style.left = Math.random() * 100 + "%";
        star.style.top = Math.random() * 80 + "%";
        star.style.animationDelay = Math.random() * 2 + "s";
        star.style.width = (2 + Math.random() * 2) + "px";
        star.style.height = star.style.width;
        starsContainer.appendChild(star);
      }
    }
    scene.innerHTML = getCastleHTML(stageIdx);
  }

  // Update labels
  if (stageLabel) stageLabel.textContent = stage.name;

  // Progress bar
  if (progressFill && stage.next) {
    const prevMin = stage.min;
    const nextMin = stage.nextAt;
    const progress = ((count - prevMin) / (nextMin - prevMin)) * 100;
    progressFill.style.width = Math.min(progress, 100) + '%';
  } else if (progressFill) {
    progressFill.style.width = '100%';
    progressFill.style.background = 'linear-gradient(90deg, #B388FF, #7C4DFF, #E040FB)';
  }

  if (nextLabel) {
    nextLabel.textContent = stage.next
      ? `Next: ${stage.next} (${stage.nextAt} days)`
      : '🏆 Max Level Reached!';
  }
  // Level up celebration
  // Update days-left display
  const daysLeftEl = document.getElementById("castle-days-left");
  if (daysLeftEl) {
    if (stage.next) {
      const remaining = stage.nextAt - count;
      daysLeftEl.textContent = remaining + ' day' + (remaining !== 1 ? 's' : '') + ' left for the next stage';
    } else {
      daysLeftEl.textContent = '\u{1F3C6} You built the Sky Castle! Maximum level!';
    }
  }

  // Level up celebration
  if (lastCastleStage !== -1 && stageIdx > lastCastleStage) {
    triggerCastleParticles(25);
  }
  lastCastleStage = stageIdx;
}

function triggerCastleParticles(amount) {
  const container = document.getElementById("castle-particles");
  if (!container) return;
  const emojis = ['✨', '⭐', '🏰', '🎉', '💎', '🌟'];
  for (let i = 0; i < amount; i++) {
    const p = document.createElement("div");
    p.className = "castle-particle";
    p.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    p.style.left = Math.random() * 90 + 5 + '%';
    p.style.top = Math.random() * 40 + 50 + '%';
    p.style.animationDelay = Math.random() * 0.6 + 's';
    container.appendChild(p);
    setTimeout(() => { if (p.parentNode) p.remove(); }, 2500);
  }
}

// Castle click interaction
document.getElementById("castle-container")?.addEventListener("click", () => {
  triggerCastleParticles(8);
  const container = document.getElementById("castle-container");
  if (container) {
    container.style.animation = "none";
    container.offsetHeight;
    container.style.animation = "castleWobble 0.5s ease-in-out";
    setTimeout(() => { container.style.animation = ""; }, 600);
  }
});

function updateStreakDisplay() {
  // Update main streak text (legacy — element may not exist)
  if (streak) streak.innerText = count + " days streak 🌟 ";

  // Update hero display
  const streakNumber = document.getElementById("streak-number");
  if (streakNumber) {
    streakNumber.textContent = count;
  }

  // Update Bloom dashboard streak widget
  const bloomStreak = document.getElementById("bloom-streak-count");
  if (bloomStreak) {
    bloomStreak.textContent = count;
  }

  // Update home card mini-indicators (rank, shield, personal best)
  const bloomRankMini = document.getElementById("bloom-rank-mini");
  if (bloomRankMini) {
    const rank = getRankForStreak(count);
    bloomRankMini.textContent = `${rank.icon} ${rank.title}`;
  }
  const bloomShieldMini = document.getElementById("bloom-shield-count-mini");
  if (bloomShieldMini) {
    bloomShieldMini.textContent = streakShields;
  }
  const bloomPbMini = document.getElementById("bloom-pb-value-mini");
  if (bloomPbMini) {
    bloomPbMini.textContent = personalBest;
  }

  // Update castle builder
  updateCastleVisual();

  // Update milestones
  updateMilestones();
}

// Premium Sports Medal Achievement System
const ACHIEVEMENT_TIERS = [
  { days: 0,   name: "Participant",   tier: "participant", emoji: "🎗️", tagline: "The journey begins" },
  { days: 4,   name: "Bronze",        tier: "bronze",      emoji: "🥉", tagline: "First real victory" },
  { days: 10,  name: "Silver",        tier: "silver",      emoji: "🥈", tagline: "Serious contender" },
  { days: 20,  name: "Gold",          tier: "gold",        emoji: "🥇", tagline: "Champion mindset" },
  { days: 35,  name: "Platinum",      tier: "platinum",    emoji: "🏆", tagline: "Elite performer" },
  { days: 60,  name: "Diamond Cup",   tier: "diamond",     emoji: "💎", tagline: "Unbreakable willpower" },
  { days: 100, name: "Hall of Fame",  tier: "halloffame",  emoji: "⭐", tagline: "Written in history" },
  { days: 200, name: "G.O.A.T.",      tier: "goat",        emoji: "👑", tagline: "Greatest Of All Time" }
];

// Rank Title System
const RANK_TITLES = [
  { min: 0,   title: "Newcomer",     icon: "🌱" },
  { min: 3,   title: "Apprentice",   icon: "🌿" },
  { min: 7,   title: "Dedicated",    icon: "⚡" },
  { min: 14,  title: "Warrior",      icon: "⚔️" },
  { min: 30,  title: "Legend",       icon: "🏛️" },
  { min: 60,  title: "Master",       icon: "🔱" },
  { min: 100, title: "Grandmaster",  icon: "💎" },
  { min: 200, title: "Mythic",       icon: "👑" }
];

let personalBest = 0;
let streakShields = 0;
let streakPaused = false;

function updateMilestones() {
  updateAchievementCards();
  updateEngagementUI();
}

// ==================== ACHIEVEMENT CARDS ====================
function updateAchievementCards() {
  const currentStreak = count;
  const cards = document.querySelectorAll(".achievement-card");
  let changed = false;

  cards.forEach((card) => {
    const requiredDays = parseInt(card.getAttribute("data-days") || "0");

    if (currentStreak >= requiredDays || unlockedMilestones.includes(requiredDays)) {
      if (!card.classList.contains("unlocked")) {
        card.classList.remove("locked");
        card.classList.add("unlocked");

        // New unlock celebration
        if (!unlockedMilestones.includes(requiredDays)) {
          unlockedMilestones.push(requiredDays);
          changed = true;
          if (requiredDays > 0) {
            const tier = ACHIEVEMENT_TIERS.find(t => t.days === requiredDays);
            if (tier) celebrateAchievementUnlock(tier, card);
          }
        }
      }
    } else {
      card.classList.add("locked");
      card.classList.remove("unlocked");
    }

    // Pause state
    if (streakPaused) {
      card.classList.add("paused");
    } else {
      card.classList.remove("paused");
    }
  });

  if (changed) saveState();
}

function celebrateAchievementUnlock(tier, cardEl) {
  // Add dramatic "just-unlocked" class for burst animation
  cardEl.classList.add("just-unlocked");
  setTimeout(() => cardEl.classList.remove("just-unlocked"), 1500);

  // Spawn floating particles around the card
  spawnAchievementParticles(cardEl, tier);

  // Show notification
  showNotification(`🏆 ${tier.emoji} ${tier.name} Unlocked! "${tier.tagline}"`);
}

function spawnAchievementParticles(cardEl, tier) {
  const particleContainer = cardEl.querySelector(".achievement-particles");
  if (!particleContainer) return;

  const emojis = ['✨', '⭐', '💫', tier.emoji, '🎉', '🌟'];
  for (let i = 0; i < 12; i++) {
    const p = document.createElement("div");
    p.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    p.style.cssText = `
      position: absolute;
      font-size: ${8 + Math.random() * 12}px;
      left: ${Math.random() * 90}%;
      top: ${Math.random() * 90}%;
      opacity: 0;
      pointer-events: none;
      animation: achieveParticleFly ${1 + Math.random() * 1.5}s ease-out ${Math.random() * 0.4}s forwards;
    `;
    particleContainer.appendChild(p);
    setTimeout(() => { if (p.parentNode) p.remove(); }, 3000);
  }
}

// Add particle animation keyframes dynamically
if (!document.getElementById("achieve-particle-style")) {
  const style = document.createElement("style");
  style.id = "achieve-particle-style";
  style.textContent = `
    @keyframes achieveParticleFly {
      0% { opacity: 0; transform: translate(0,0) scale(0); }
      30% { opacity: 1; transform: translate(${Math.random()>0.5?'':'-'}10px, -15px) scale(1.2); }
      100% { opacity: 0; transform: translate(${Math.random()>0.5?'':'-'}30px, -60px) scale(0.3); }
    }
  `;
  document.head.appendChild(style);
}

// ==================== ENGAGEMENT UI ====================
function updateEngagementUI() {
  updateRankTitle();
  updatePersonalBestDisplay();
  updateShieldDisplay();
  updateMilestoneCountdown();
  updatePauseOverlay();
}

// --- Rank Title ---
function getRankForStreak(streakCount) {
  for (let i = RANK_TITLES.length - 1; i >= 0; i--) {
    if (streakCount >= RANK_TITLES[i].min) return RANK_TITLES[i];
  }
  return RANK_TITLES[0];
}

function updateRankTitle() {
  const rank = getRankForStreak(count);
  const titleEl = document.getElementById("streak-rank-title");
  const iconEl = document.querySelector(".rank-icon");
  if (titleEl) titleEl.textContent = rank.title;
  if (iconEl) iconEl.textContent = rank.icon;
}

// --- Personal Best ---
function updatePersonalBestDisplay() {
  // Track personal best
  if (count > personalBest) {
    const wasBest = personalBest;
    personalBest = count;
    if (wasBest > 0 && count > wasBest) {
      showNotification(`🏆 NEW PERSONAL BEST! ${count} days! 🎉`);
    }
  }
  const pbEl = document.getElementById("streak-pb-value");
  if (pbEl) pbEl.textContent = personalBest;
}

// --- Shield System ---
function updateShieldDisplay() {
  const shieldCountEl = document.getElementById("streak-shield-count");
  if (shieldCountEl) shieldCountEl.textContent = streakShields;
}

function earnShield() {
  // Earn 1 shield every 7 consecutive days (max 3)
  if (count > 0 && count % 7 === 0 && streakShields < 3) {
    streakShields++;
    updateShieldDisplay();
    showNotification(`🛡️ Streak Shield earned! You now have ${streakShields} shield(s).`);
    saveState();
  }
}

function useShield() {
  if (streakShields > 0) {
    streakShields--;
    updateShieldDisplay();
    showNotification("🛡️ Shield activated! Your streak is protected for today.");
    saveState();
    return true;
  }
  return false;
}

// --- Milestone Countdown ---
function updateMilestoneCountdown() {
  const textEl = document.getElementById("milestone-countdown-text");
  const fillEl = document.getElementById("milestone-countdown-fill");
  if (!textEl || !fillEl) return;

  // Find next achievement tier
  let nextTier = null;
  let prevMin = 0;
  for (const tier of ACHIEVEMENT_TIERS) {
    if (count < tier.days) {
      nextTier = tier;
      break;
    }
    prevMin = tier.days;
  }

  if (nextTier) {
    const remaining = nextTier.days - count;
    const progress = ((count - prevMin) / (nextTier.days - prevMin)) * 100;
    textEl.textContent = `${remaining} day${remaining !== 1 ? 's' : ''} until ${nextTier.name} ${nextTier.emoji}`;
    fillEl.style.width = `${Math.min(progress, 100)}%`;
  } else {
    textEl.textContent = "🏆 All achievements unlocked!";
    fillEl.style.width = "100%";
  }
}

// --- Pause Overlay ---
function updatePauseOverlay() {
  const overlay = document.getElementById("streak-paused-overlay");
  const factorsContainer = document.getElementById("streak-paused-factors");
  if (!overlay) return;

  if (streakPaused) {
    overlay.classList.remove("hidden");

    // Show factor status
    if (factorsContainer) {
      factorsContainer.innerHTML = "";
      const cfg = loadVitalityConfig();
      cfg.factors.forEach(fId => {
        const pool = VITALITY_FACTOR_POOL.find(p => p.id === fId);
        if (!pool) return;
        const score = getVitalityFactorScore(fId);
        const complete = score >= 1;
        const div = document.createElement("div");
        div.className = `streak-paused-factor ${complete ? 'complete' : 'incomplete'}`;
        div.innerHTML = `<span>${pool.emoji}</span> <span>${pool.label}</span> <span>${complete ? '✅' : '❌'}</span>`;
        factorsContainer.appendChild(div);
      });
    }

    // Apply paused state to castle and day boxes
    const castle = document.getElementById("castle-container");
    if (castle) castle.classList.add("paused");
  } else {
    overlay.classList.add("hidden");
    const castle = document.getElementById("castle-container");
    if (castle) castle.classList.remove("paused");
  }
}

// ==================== VITALITY FACTOR COMPLETION CHECK ====================
function areAllVitalityFactorsComplete() {
  const cfg = loadVitalityConfig();
  for (const fId of cfg.factors) {
    const score = getVitalityFactorScore(fId);
    if (score < 1) return false;
  }
  return true;
}


donebtn.addEventListener("click", function () {
  // Mark tasks as completed today
  appStorage.setItem("tasksCompletedDate", new Date().toDateString());

  all.textContent = "🎉 Congrats! You have completed all your tasks! 🎉";
  all.style.color = "#92400e";
  all.style.fontSize = "20px";
  all.style.fontWeight = "bold";
  all.style.marginLeft = "20px";
  all.style.marginTop = "20px";
  all.style.marginBottom = "20px";
  all.style.backgroundColor = "rgba(245, 158, 11, 0.12)";
  all.style.borderRadius = "10px";
  all.style.padding = "10px";
  all.classList.add("celebrate");

  donebtn.textContent = "✅ All Tasks Completed!";
  donebtn.disabled = true;
  donebtn.classList.add("alldone-completed");

  setTimeout(() => {
    all.textContent = "";
    all.classList.remove("celebrate");
  }, 8000);

  saveState();
  renderDashboard();

  // Try vitality streak
  if (typeof tryVitalityStreak === "function") tryVitalityStreak();
});

// Legacy shim
function tryCompleteStreak() {
  if (typeof tryVitalityStreak === "function") tryVitalityStreak();
}


// ==================== STREAK COOLDOWN (MIDNIGHT RESET) ====================
function canCompleteToday() {
  const lastCompletion = appStorage.getItem("lastCompletionTime");
  if (!lastCompletion) return true;
  const lastTime = parseInt(lastCompletion, 10);
  const lastDate = new Date(lastTime);
  const today = new Date();
  // Compare calendar dates — resets at midnight
  return lastDate.toDateString() !== today.toDateString();
}

function scheduleMidnightReset() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0); // Next midnight
  const msUntilMidnight = midnight.getTime() - now.getTime();

  setTimeout(() => {
    // Reset button state at midnight
    allchecked();

    // Reset Water Tracker at midnight
    waterConsumed = 0;
    waterDrinkLog = [];
    saveWaterState();
    updateWaterDisplay();

    // Reset meditation streak status indicator for new day
    if (typeof updateMeditationStatusUI === "function") updateMeditationStatusUI();

    saveState();
    renderDashboard();

    // Schedule next midnight reset
    scheduleMidnightReset();
  }, msUntilMidnight);
}

// Start the midnight reset scheduler
scheduleMidnightReset();

function getCompletionDates() {
  const datesStr = appStorage.getItem("completionDates");
  if (!datesStr) return [];
  try {
    return JSON.parse(datesStr);
  } catch {
    return [];
  }
}

function addCompletionDate() {
  const dates = getCompletionDates();
  const today = new Date().toDateString();
  if (!dates.includes(today)) {
    dates.push(today);
    appStorage.setItem("completionDates", JSON.stringify(dates));
  }
}

// ==================== STATE MANAGEMENT ====================
function saveState() {
  const items = Array.from(taskContainer.querySelectorAll("li"));
  const tasks = items.map(function (li) {
    const cb = /** @type {HTMLInputElement} */ (li.querySelector("input[type='checkbox']:not(.task-select-cb)"));
    const span = /** @type {HTMLSpanElement} */ (li.querySelector("span:not(.task-emoji):not(.task-tag)"));
    const emojiBadge = li.querySelector(".task-emoji");
    const priorityVal = li.getAttribute('data-priority') || null;
    return {
      text: span ? span.textContent || "" : "",
      completed: cb ? cb.checked : false,
      emoji: emojiBadge ? emojiBadge.textContent : getEmojiForTask(span ? span.textContent : ""),
      color: span ? span.style.backgroundColor : null,
      priority: priorityVal
    };
  });

  const state = {
    tasks: tasks,
    count: count,
    waterConsumed: waterConsumed,
    waterGoal: waterGoal,
    sleepLogs: sleepLogs,
    completionDates: getCompletionDates(),
    unlockedMilestones: unlockedMilestones,
    // Engagement
    personalBest: personalBest,
    streakShields: streakShields,
    streakPaused: streakPaused,
    // Preferences
    breathingMode: currentBreathingMode,
    pomodoroWork: workDuration,
    pomodoroBreak: breakDuration,
    timerType: currentTimerType,
    lastSaveDate: new Date().toDateString()
  };

  appStorage.setItem("habitAppState", JSON.stringify(state));
}

function loadState() {
  // Check and apply stored theme globally
  const savedTheme = appStorage.getItem("appTheme") || "classic";
  document.body.className = `theme-${savedTheme}`;
  document.querySelectorAll(".theme-btn").forEach(btn => {
    btn.classList.toggle("active", btn.getAttribute("data-theme") === savedTheme);
  });

  if (savedTheme === "custom") {
    const savedColors = JSON.parse(appStorage.getItem("customThemeColors") || "{}");
    if (savedColors.bg) document.documentElement.style.setProperty('--bg-base', savedColors.bg);
    if (savedColors.primary) document.documentElement.style.setProperty('--primary', savedColors.primary);
    if (savedColors.text) document.documentElement.style.setProperty('--text-main', savedColors.text);

    // Also show builder if settings happens to be open
    const builder = document.getElementById("custom-theme-builder");
    if (builder) {
      builder.classList.remove("hidden");
      if (savedColors.bg) document.getElementById("custom-bg-color").value = savedColors.bg;
      if (savedColors.primary) document.getElementById("custom-primary-color").value = savedColors.primary;
      if (savedColors.text) document.getElementById("custom-text-color").value = savedColors.text;
    }
  }

  const raw = appStorage.getItem("habitAppState");
  if (!raw) {
    checkDailyStreak();
    updateDailyQuote();
    return;
  }
  try {
    const state = JSON.parse(raw);
    const todayStr = new Date().toDateString();
    let isNewDay = false;
    if (state.lastSaveDate && state.lastSaveDate !== todayStr) {
      isNewDay = true;
    }

    if (isNewDay) {
        appStorage.removeItem("dailyFocus");
    }

    taskContainer.innerHTML = "";
    if (Array.isArray(state.tasks)) {
      state.tasks.forEach(function (t) {
        if (!t || typeof t.text !== "string") return;
        const completeStatus = isNewDay ? false : !!t.completed;
        createTaskItem(t.text, completeStatus, t.color, t.emoji, t.priority || null);
      });
    }
    if (typeof state.count === "number") {
      count = state.count;
    }

    // --- WATER DATE CHECK LOGIC ---
    let waterNeedsReset = false;

    // Check the dedicated water save date
    const savedWaterRaw = appStorage.getItem("waterData");
    if (savedWaterRaw) {
      try {
        const data = JSON.parse(savedWaterRaw);
        if (data.saveDate !== todayStr) waterNeedsReset = true;
        if (data.saveDate === todayStr && Array.isArray(data.drinkLog)) waterDrinkLog = data.drinkLog;
      } catch (e) { }
    } else {
      // If we don't have waterData, assume we need a reset if the habitAppState date isn't today
      if (state.lastSaveDate && state.lastSaveDate !== todayStr) {
        waterNeedsReset = true;
      }
    }

    if (waterNeedsReset) {
      waterConsumed = 0;
      waterDrinkLog = [];
    } else {
      if (typeof state.waterConsumed === "number") waterConsumed = state.waterConsumed;
    }

    if (typeof state.waterGoal === "number") waterGoal = state.waterGoal;
    if (Array.isArray(state.sleepLogs)) sleepLogs = state.sleepLogs;
    if (Array.isArray(state.unlockedMilestones)) unlockedMilestones = state.unlockedMilestones;
    if (Array.isArray(state.completionDates)) {
      appStorage.setItem("completionDates", JSON.stringify(state.completionDates));
    }
    // Restore engagement state
    if (typeof state.personalBest === "number") personalBest = state.personalBest;
    if (typeof state.streakShields === "number") streakShields = state.streakShields;
    if (typeof state.streakPaused === "boolean") streakPaused = state.streakPaused;

    // Restore preferences
    if (typeof state.breathingMode === "string" && breathingModes[state.breathingMode]) {
      currentBreathingMode = state.breathingMode;
      breathingPhases = breathingModes[currentBreathingMode];
      // Update UI: mark correct breathing mode button active
      document.querySelectorAll(".breathing-mode-btn").forEach(btn => {
        btn.classList.toggle("active", btn.getAttribute("data-mode") === currentBreathingMode);
      });
    }
    if (typeof state.pomodoroWork === "number") workDuration = state.pomodoroWork;
    if (typeof state.pomodoroBreak === "number") breakDuration = state.pomodoroBreak;
    if (typeof state.timerType === "string") switchTimerType(state.timerType);


    all.textContent = "";
    all.classList.remove("celebrate");
    if (streak) {
      streak.style.cursor = "pointer";
      streak.addEventListener("click", showStreakPage);
    }

    // Sync all UI displays with the restored state
    updateStreakDisplay(); // Hero streak number + milestones + legacy text
    allchecked();          // Show/hide the "Mark Complete" button
    updateWaterDisplay();  // Water tracker UI
    renderMoodHistory();   // Mood history list
    updateSleepStats();    // Sleep averages
    renderDashboard();     // Dashboard widget values
    updateDailyFocusHighlights(); // Restore highlight for the chosen task

    checkDailyStreak();    // Apply any pending streak penalty
    updateDailyQuote();    // Fetch and display daily quote
    updateBloomWidgets();  // Bloom dashboard card widgets
  } catch (e) {
    console.error("Failed to load saved state", e);
    checkDailyStreak();
    updateDailyQuote();
  }
}

// ==================== BLOOM DASHBOARD WIDGETS ====================
function updateBloomWidgets() {
  const todayStr = new Date().toDateString();

  // 1. Tasks & Habits (40% Combined)
  const taskItems = document.querySelectorAll("#task li");
  const totalTasks = taskItems.length;
  const completedTasks = document.querySelectorAll("#task li input[type='checkbox']:checked").length;
  const pct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  
  let completeSum = completedTasks;
  let totalSum = totalTasks;
  const loadedHabits = JSON.parse(appStorage.getItem("userHabits") || "[]");
  const hbCompleted = loadedHabits.filter(h => h.completedToday).length;
  const hbTotal = loadedHabits.length;
  if (hbTotal > 0) {
      completeSum += hbCompleted;
      totalSum += hbTotal;
  }
  const taskScore = totalSum > 0 ? (completeSum / totalSum) * 40 : 0;

  // ── Home Page Task Progress Strip ──
  const progressLabel = document.getElementById("bloom-progress-label");
  const progressPct = document.getElementById("bloom-progress-pct");
  const progressFill = document.getElementById("bloom-progress-fill");

  if (progressLabel) progressLabel.textContent = `Tasks: ${completedTasks}/${totalTasks}`;
  if (progressPct) progressPct.textContent = `${pct}%`;
  if (progressFill) progressFill.style.width = `${pct}%`;

  // 2. Water (20%)
  const wConsumed = typeof waterConsumed !== "undefined" ? waterConsumed : 0;
  const wGoal = typeof waterGoal !== "undefined" && waterGoal > 0 ? waterGoal : 2000;
  const waterScore = Math.min((wConsumed / wGoal) * 20, 20);

  // 3. Meditation (20%)
  const medDate = appStorage.getItem("meditationCompletedDate");
  const medScore = (medDate === todayStr) ? 20 : 0;

  // 4. Reading (10%)
  const readDate = appStorage.getItem("lastPageReadDate");
  const readScore = (readDate === todayStr) ? 10 : 0;

  // 5. Sleep (10%)
  let sleepScore = 0;
  let sleepValStr = "No";
  if (typeof sleepLogs !== "undefined" && sleepLogs.length > 0) {
      const recent = sleepLogs[0];
      const recentDateStr = new Date(recent.date).toDateString();
      const yesterdayStr = new Date(Date.now() - 86400000).toDateString();
      // Check if logged today or yesterday (since sleep is for the night)
      if (recentDateStr === todayStr || recentDateStr === yesterdayStr) {
          sleepScore = 10;
          sleepValStr = `${recent.hours}h`;
      }
  }

  // ── Dashboard Page Vitality Score (dynamic) ──
  updateVitalityUI();

  // ── Water Widget ──
  const bloomWaterAmount = document.getElementById("bloom-water-amount");
  const bloomWaterCups = document.getElementById("bloom-water-cups");
  const bloomWaterWave = document.getElementById("bloom-water-wave");

  if (bloomWaterAmount && typeof waterConsumed !== "undefined" && typeof waterGoal !== "undefined") {
    bloomWaterAmount.textContent = `${waterConsumed} / ${waterGoal}`;
  }
  if (bloomWaterCups && typeof waterConsumed !== "undefined") {
    const cups = Math.floor(waterConsumed / 250);
    bloomWaterCups.textContent = `${cups} cups`;
  }
  if (bloomWaterWave && typeof waterConsumed !== "undefined" && typeof waterGoal !== "undefined") {
    const waterPct = waterGoal > 0 ? Math.min(100, (waterConsumed / waterGoal) * 100) : 0;
    bloomWaterWave.style.height = `${waterPct}%`;
  }

  // ── Meditation Widget ──
  const bloomMedTime = document.getElementById("bloom-med-time");
  if (bloomMedTime) {
    if (typeof meditationSecondsLeft !== "undefined" && meditationSecondsLeft > 0) {
      bloomMedTime.textContent = formatMedTime(meditationSecondsLeft);
    } else if (typeof meditationDuration !== "undefined") {
      bloomMedTime.textContent = formatMedTime(meditationDuration * 60);
    }
  }

  // ── Mood Widget (update SVG line from recent mood data) ──
  const moodLine = document.getElementById("bloom-mood-line");
  if (moodLine && typeof moodHistory !== "undefined" && moodHistory.length > 0) {
    const recent = moodHistory.slice(-7);
    const pts = recent.map((m, i) => {
      const x = recent.length > 1 ? (i / (recent.length - 1)) * 120 : 60;
      const val = m.mood || m.value || 3;
      const y = 40 - ((val / 5) * 35);
      return `${x},${y}`;
    }).join(" ");
    moodLine.setAttribute("points", pts);
  }

  // ── Mood Time ──
  const bloomMoodTime = document.getElementById("bloom-mood-time");
  if (bloomMoodTime) {
    const now = new Date();
    bloomMoodTime.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // ── Journal Preview ──
  const bloomJournalPreview = document.getElementById("bloom-journal-preview");
  if (bloomJournalPreview) {
    try {
      const journalData = appStorage.getItem("journalEntries");
      if (journalData) {
        const entries = JSON.parse(journalData);
        if (entries.length > 0) {
          const latest = entries[entries.length - 1];
          const text = latest.text || latest.content || "Today's Reflection...";
          bloomJournalPreview.textContent = text.substring(0, 120) + (text.length > 120 ? "…" : "");
        }
      }
    } catch (e) { /* silent */ }
  }

  // ── Tasks Time ──
  const bloomTasksTime = document.getElementById("bloom-tasks-time");
  if (bloomTasksTime) {
    const now = new Date();
    bloomTasksTime.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // ── Library & Sleep Card Updates ──
  const bloomLibStat = document.getElementById("bloom-lib-stat");
  if (bloomLibStat) {
    try {
      const books = JSON.parse(appStorage.getItem("epubLibrary") || "[]");
      bloomLibStat.textContent = books.length > 0 ? `${books.length} Books` : "Read seamlessly";
    } catch (e) { }
  }

  const bloomSleepStat = document.getElementById("bloom-sleep-stat");
  const dashSleepVal = document.getElementById("dash-sleep-val");
  const dashSleepBarFill = document.getElementById("dash-sleep-bar-fill");
  
  if (bloomSleepStat && typeof sleepLogs !== "undefined") {
    if (sleepLogs.length > 0) {
      const recent = sleepLogs[0];
      bloomSleepStat.textContent = `Quality: ${recent.quality || 'Good'}`;
      if (dashSleepVal) dashSleepVal.textContent = `${recent.hours}h`;
      
      if (dashSleepBarFill && typeof sleepGoalHours !== "undefined") {
        const pct = Math.min(100, Math.round((recent.hours / sleepGoalHours) * 100));
        dashSleepBarFill.style.width = `${pct}%`;
      }
    } else {
      bloomSleepStat.textContent = "Log your sleep";
      if (dashSleepVal) dashSleepVal.textContent = "--";
      if (dashSleepBarFill) dashSleepBarFill.style.width = "0%";
    }
  }
}

// Auto-update Bloom widgets on task changes (observe task list)
const _bloomTaskObserver = new MutationObserver(() => {
  setTimeout(updateBloomWidgets, 100);
});
const _bloomTaskList = document.getElementById("task");
if (_bloomTaskList) {
  _bloomTaskObserver.observe(_bloomTaskList, { childList: true, subtree: true, attributes: true });
}

// Update widgets every minute for time displays
setInterval(updateBloomWidgets, 60000);

// ==================== INFINITE STREAK PAGE ====================
function showStreakPage() {
  showPage('streak-page');
  renderStreakPage();
  updateMilestones(); // Update achievement cards, rank, shields, countdown, pause overlay
}

function hideStreakPage() {
  showPage('main');
}

// ==================== FACTORY RESET ====================
document.getElementById("deleteAllStreak")?.addEventListener("click", () => {
  const confirmWipe = confirm("🚨 DANGER ZONE 🚨\n\nAre you absolutely sure you want to completely erase ALL your data? This includes your streak, tasks, journals, budgets, and settings. This cannot be undone.");
  if (confirmWipe) {
    appStorage.clear();
    alert("All data has been wiped. The app will now reload.");
    window.location.reload();
  }
});

function renderStreakPage() {
  try {
    const container = document.getElementById("streak-container");
    const stats = document.getElementById("streak-stats");

    if (!container || !stats) return;

    container.innerHTML = "";

    // Show boxes in batches of 50 — infinitely expandable, always showing future runway
    const batchSize = 50;
    const daysToShow = Math.max(batchSize, Math.ceil((count + 20) / batchSize) * batchSize);
    const startDay = 1;

    for (let i = startDay; i <= daysToShow; i++) {
      const day = document.createElement("div");
      day.className = "streak-day";
      day.textContent = i.toString();

      if (i <= count) {
        day.classList.add("completed");
        day.classList.add("unlocked");
      } else if (i === count + 1) {
        day.classList.add("current");
        day.classList.add("unlocked");
        // Show paused state on the current/next day box
        if (streakPaused) {
          day.classList.add("paused");
        }
      } else {
        day.classList.add("locked");
      }

      container.appendChild(day);
    }

    const vScore = typeof getVitalityScore === 'function' ? getVitalityScore() : 0;
    stats.innerHTML = `
      <h2>Your Progress</h2>
      <p><strong>Current Streak:</strong> ${count} days 🔥</p>
      <p><strong>Today's Vitality:</strong> <span id="streak-vitality-score" style="color:${vScore >= 80 ? '#10b981' : 'var(--primary)'};font-size:1.2em;">${vScore}%</span> ${vScore >= 80 ? '✅' : '(need 80%)'}</p>
      <div class="streak-legend">
          <div class="legend-item"><span class="box completed"></span> Completed</div>
          <div class="legend-item"><span class="box"></span> Future</div>
          <div class="legend-item"><span class="box current"></span> Next Day</div>
      </div>
      ${count >= 7 ? '<p><strong>🌟 Keep it up! You\'re building consistency! 🌟</strong></p>' : '<p>Hit 80% Vitality daily to build your streak.</p>'}
    `;
  } catch (e) {
    console.error("Error rendering streak page:", e);
  }
}

// ==================== JOURNAL SYSTEM ====================
let currentJournalId = null;

function showJournalPage() {
  showPage('journal-page');
  loadJournalEntries();
}

function hideJournalPage() {
  showPage('main');
}

function loadJournalEntries() {
  const entriesContainer = document.getElementById("journal-entries");
  let entries = getJournalEntries();

  const searchInput = /** @type {HTMLInputElement} */ (document.getElementById("journal-search"));
  const dateInput = /** @type {HTMLInputElement} */ (document.getElementById("journal-date-filter"));

  const filterQuery = searchInput ? searchInput.value.toLowerCase() : "";
  const filterDate = dateInput && dateInput.value ? new Date(dateInput.value).toDateString() : "";

  if (filterQuery || filterDate) {
    entries = entries.filter(e => {
      const matchText = e.title.toLowerCase().includes(filterQuery) ||
        e.content.toLowerCase().includes(filterQuery) ||
        (e.tags && e.tags.some(t => t.toLowerCase().includes(filterQuery)));
      const matchDate = filterDate ? new Date(e.date).toDateString() === filterDate : true;
      return (!filterQuery || matchText) && matchDate;
    });
  }

  entriesContainer.innerHTML = "";

  if (entries.length === 0) {
    entriesContainer.innerHTML = '<p style="text-align: center; color: #999; margin-top: 50px;">No journal entries match your filter. Click "New Entry" to start!</p>';
    return;
  }

  // Sort newest first
  entries.sort((a, b) => b.date - a.date);

  entries.forEach((entry, idx) => {
    // Find absolute index in the original unmodified array for editing/deleting
    const index = getJournalEntries().findIndex(orig => orig.date === entry.date);

    const entryDiv = document.createElement("div");
    entryDiv.className = `journal-entry ${entry.paperStyle || ""}`;

    // Process tags into badges
    const tagsHtml = (entry.tags || []).map(t => `<span class="journal-tag-badge">${t}</span>`).join('');

    // Process doodle
    const doodleHtml = entry.doodle ? `<img src="${entry.doodle}" style="max-width:100%; max-height:150px; border-radius:8px; margin-top:10px; border:1px solid rgba(0,0,0,0.1);">` : '';

    entryDiv.innerHTML = `
      <h3>${entry.title || 'Untitled'}</h3>
      <div style="margin-bottom: 5px;">${tagsHtml}</div>
      <div class="journal-entry-preview">${entry.content}</div>
      ${doodleHtml}
      <div style="margin-top: 15px;">
          <small>${new Date(entry.date).toLocaleDateString()}</small>
          <div class="journal-entry-actions">
            <button class="journal-edit-btn" data-index="${index}">✏️ Edit</button>
            <button class="journal-delete-btn" data-index="${index}">🗑️ Delete</button>
          </div>
      </div>
    `;
    entryDiv.addEventListener("click", (e) => {
      const target = /** @type {HTMLElement} */ (e.target);
      if (!target.classList.contains("journal-edit-btn") && !target.classList.contains("journal-delete-btn")) {
        openJournalEditor(entry, index);
      }
    });
    entriesContainer.appendChild(entryDiv);
  });
}

function getJournalEntries() {
  const entriesStr = appStorage.getItem("journalEntries");
  if (!entriesStr) return [];
  try {
    return JSON.parse(entriesStr);
  } catch (e) {
    console.error("Failed to parse journal entries", e);
    // Rescue raw data to avoid total wipe if something went wrong
    return [];
  }
}

function saveJournalEntries(entries) {
  try {
    appStorage.setItem("journalEntries", JSON.stringify(entries));
  } catch (e) {
    console.error("Local storage error:", e);
    if (e.name === "QuotaExceededError" || e.name === "NS_ERROR_DOM_QUOTA_REACHED") {
      alert("Your journal has grown too large to save! Try deleting older entries or removing some complex drawing doodles.");
    } else {
      alert("Failed to save journal entry. Please try again.");
    }
  }
}

const creativePrompts = [
  // Personal Life & Self-Discovery
  "What makes you feel excited to wake up in the morning?",
  "What does your ideal day look like, including where you are, who you're with, and what you're doing?",
  "What are three things you are most grateful for right now, and who are three people you are most grateful for?",
  "What does 'self-care' truly look like for you?",
  "What is an important lesson you've learned recently?",
  "What are your core values, and how do they shape your choices and actions?",
  "How has your past year treated you, and what can you do to make this year even better?",
  "What is your relationship with yourself, and how can you cultivate more self-love and acceptance?",
  "What do you wish other people knew about you?",
  "If you had unlimited time and money, what would you be doing today?",
  "What is a small victory you had today that you're proud of?",
  "Describe a moment recently that made you laugh out loud.",
  "If you could have a conversation with your future self, what would you ask?",
  "What gives you the greatest thrills in life?",
  "What makes your heart happy?",
  "Write a short letter of forgiveness to yourself for a past mistake.",
  "Describe a place where you feel most at peace. Why does it have that effect?",
  "What boundary do you need to set this week to protect your energy?",
  "If your life was a movie, what would the current chapter be called?",
  "What is a memory that always brings a smile to your face?",
  "What do you need to let go of to move forward?",
  "How do you usually handle stress, and is there a healthier way?",
  "What is a trait you admire in others that you'd like to develop in yourself?",
  "What are you holding onto that no longer serves you?",
  "Write down three compliments you can honestly give yourself right now.",

  // Success & Ambition
  "How do you define personal success, independent of societal expectations?",
  "What are your top three goals at this time in your life, and why are they important to you?",
  "What would you be doing if money or other people's opinions didn't hold you back?",
  "What unhealthy thoughts or limiting beliefs have been consuming you lately?",
  "What vision do you have for your life in 5 years? Be specific.",
  "How can you work smarter, not harder, in your current pursuits?",
  "What specific actions or habits can you adopt to stay connected to your 'why'?",
  "What is your greatest accomplishment so far?",
  "What is your biggest regret, and what did it teach you?",
  "What is one goal that is important to you, and what is the next step to achieve it?",
  "Who is someone whose career or life path you admire? What steps did they take?",
  "What does 'enough' look like for you?",
  "What is a risk you’ve been avoiding taking? Why?",
  "In what area of your life are you playing it safe?",
  "What is one habit that is holding you back from your true potential?",
  "What does failure mean to you, and how do you recover from it?",
  "If you knew you couldn't fail, what is the first thing you would try?",
  "What legacy do you want to leave behind?",
  "How do you balance ambition with contentment?",
  "What is a skill you want to master within the next year?",
  "Write about a time you surprised yourself with your own competence.",
  "What would a 'perfect' workday look like for you?",

  // Problem Solving & Clarity
  "Describe a recent challenge you've overcome. How did you do it?",
  "Identify a recurring issue in your life. What is it, and how can you break the cycle?",
  "Take a complex problem you're facing and break it down. What is the smallest step you can take today?",
  "What is the 'real' problem you're facing behind the surface-level issue?",
  "What assumptions are you making about your current situation? Are they definitely true?",
  "If you had unlimited confidence and resources, how would you approach your biggest current problem?",
  "Think back to a past challenge. What can you learn from it that applies to your current situation?",
  "What is the worst thing that could happen if you pursue a particular solution? How would you handle it?",
  "If you made a decision and it failed spectacularly, what would be the most likely cause?",
  "What advice would you give a close friend facing the exact same problem you have right now?",
  "What is an uncomfortable conversation you need to have, and how can you prepare for it?",
  "What is a perspective you haven't considered yet regarding a current dilemma?",
  "Are you focusing on things within your control or outside of it? How can you shift your focus?",
  "What resources (people, tools, knowledge) do you already have that could help you solve a current issue?",
  "If this problem was a puzzle, what missing piece are you looking for?",
  "In six months, how much will your current stressor matter?",
  "What is a quick win you can achieve today to build momentum?",
  "How do your emotions influence your current decision-making process?",

  // Ideas & Creativity
  "If you had to invent a new holiday, what would it celebrate and what would the traditions be?",
  "Write about a hobby or interest you'd love to pick up this year.",
  "If you could combine two unrelated skills you have, what unique thing could you create?",
  "What is a wild, unconventional idea you've had recently?",
  "If you were to write a book, what would it be about?",
  "What does your inner child want to do just for fun?",
  "If you could redesign your living space without a budget, what would it look like?",
  "What is a problem in the world you wish you could solve, and what is one creative approach to it?",
  "Invent a new gadget that would make your daily life 10% easier.",
  "Imagine you are an expert in a field you currently know nothing about. What field is it?",
  "If you had to teach a class on one subject, what would it be?",
  "What is the most interesting thing you read or watched recently? Extrapolate an idea from it.",
  "If you could teleport to any place in the world for an hour to find inspiration, where would it be?",
  "What colors represent your current mood, and what would a painting of them look like?",
  "How do you overcome a creative block?",
  "Write a short, alternative ending to a movie or book you recently finished.",
  "If you had a podcast, who would be your dream guest and what would you ask them?",

  // Inspiration & Perspective
  "What is currently inspiring you?",
  "Write about a small change you made that created a big impact in your life.",
  "Who are the people in your life that inspire you the most, and what qualities do they possess?",
  "What do you want to learn more about?",
  "Reflect on a time when you felt truly passionate or inspired. Describe that moment.",
  "Write about something you noticed today that you wish everyone could notice.",
  "What would you enthusiastically do every day even if you never received typical rewards or recognition?",
  "What makes you feel calm, in control, or powerful?",
  "What is a quote or mantra that resonates with you right now, and why?",
  "What is a beautiful memory you have with someone you love?",
  "If today had a theme song, what would it be and why?",
  "Who has had the biggest positive impact on your life?",
  "What is a book, movie, or song that completely changed your perspective?",
  "What is something ordinary that you find extraordinary?",
  "Describe a moment when you felt a deep sense of awe.",
  "What are you most looking forward to in the coming month?",
  "How can you be a source of inspiration for someone else today?",
  "What is a truth about yourself that you are finally ready to embrace?"
];

function getCreativePrompt() {
  const promptText = document.getElementById("journal-prompt-text");
  if (promptText) {
    const randomPrompt = creativePrompts[Math.floor(Math.random() * creativePrompts.length)];
    promptText.textContent = `"${randomPrompt}"`;
    promptText.style.fontWeight = "bold";
    promptText.style.color = "var(--primary)";
  }
}

function openJournalEditor(entry = null, index = null) {
  const editor = document.getElementById("journal-editor");
  editor.classList.remove("hidden");
  currentJournalId = index;

  const titleInput = /** @type {HTMLInputElement} */ (document.getElementById("journal-title"));
  const tagsInput = /** @type {HTMLInputElement} */ (document.getElementById("journal-tags"));
  const contentDiv = document.getElementById("journal-content");
  const paperSelect = /** @type {HTMLSelectElement} */ (document.getElementById("journal-paper-style"));
  const promptText = document.getElementById("journal-prompt-text");

  // Reset prompt text
  if (promptText) {
    promptText.textContent = "Need inspiration? Get a creative prompt!";
    promptText.style.fontWeight = "normal";
    promptText.style.color = "var(--text-main)";
  }

  // Clear drawing canvas when opening
  clearDoodleCanvas();
  document.getElementById("journal-drawing-area")?.classList.remove("active");

  const deleteBtn = document.getElementById("deleteJournal");

  if (entry) {
    if (deleteBtn) deleteBtn.style.display = "inline-block";
    titleInput.value = entry.title || "";
    tagsInput.value = (entry.tags || []).join(" ");
    if (contentDiv) contentDiv.innerHTML = entry.content || "";

    // Set paper style
    if (paperSelect) {
      paperSelect.value = entry.paperStyle || "";
      if (contentDiv) {
        contentDiv.className = "journal-rich-content";
        if (entry.paperStyle) contentDiv.classList.add(entry.paperStyle);
      }
    }

    // Load doodle if exists
    if (entry.doodle) {
      document.getElementById("journal-drawing-area")?.classList.add("active");
      // Ensure canvas is initialized before loading the doodle
      if (!canvas) initJournalCanvas();
      setTimeout(() => {
        if (!canvas) initJournalCanvas();
        loadDoodleOntoCanvas(entry.doodle);
      }, 150);
    }
  } else {
    if (deleteBtn) deleteBtn.style.display = "none";
    titleInput.value = "";
    tagsInput.value = "";
    if (contentDiv) {
      contentDiv.innerHTML = "";
      contentDiv.className = "journal-rich-content"; // Reset classes
    }
    if (paperSelect) paperSelect.value = "";
  }
}

function closeJournalEditor() {
  document.getElementById("journal-editor").classList.add("hidden");
  currentJournalId = null;
  document.getElementById("journal-drawing-area")?.classList.remove("active");
}

function saveJournalEntry() {
  const titleInput = /** @type {HTMLInputElement} */ (document.getElementById("journal-title"));
  const tagsInput = /** @type {HTMLInputElement} */ (document.getElementById("journal-tags"));
  const contentDiv = document.getElementById("journal-content");
  const paperSelect = /** @type {HTMLSelectElement} */ (document.getElementById("journal-paper-style"));

  const title = titleInput.value.trim();
  const rawTags = tagsInput.value.trim();
  const content = contentDiv ? contentDiv.innerHTML.trim() : "";
  const paperStyle = paperSelect ? paperSelect.value : "";
  const doodleData = isCanvasBlank(canvas) ? null : canvas.toDataURL('image/png');

  if (!content && !doodleData) {
    alert("Please write or draw something!");
    return;
  }

  // Parse tags by splitting on spaces or commas and ensuring they start with #
  const tags = rawTags.split(/[\s,]+/).filter(t => t).map(t => t.startsWith('#') ? t : `#${t}`);

  const entries = getJournalEntries();
  const existingEntry = currentJournalId !== null ? entries[currentJournalId] : null;
  const entry = {
    title: title || "Untitled",
    content: content,
    tags: tags,
    paperStyle: paperStyle,
    doodle: doodleData,
    date: existingEntry ? existingEntry.date : Date.now()
  };

  if (currentJournalId !== null) {
    entries[currentJournalId] = entry;
  } else {
    entries.push(entry);
  }

  saveJournalEntries(entries);
  loadJournalEntries();
  closeJournalEditor();
  if (typeof tryVitalityStreak === "function") tryVitalityStreak();
}

function deleteJournalEntry() {
  if (currentJournalId === null) return;
  if (!confirm("Delete this entry?")) return;

  const entries = getJournalEntries();
  entries.splice(currentJournalId, 1);
  saveJournalEntries(entries);
  loadJournalEntries();
  closeJournalEditor();
}

// ==================== JOURNAL CREATIVE FEATURES ====================
function updateFormatButtons() {
  const boldBtn = document.getElementById('btn-bold');
  const italicBtn = document.getElementById('btn-italic');
  const underlineBtn = document.getElementById('btn-underline');

  if (boldBtn) boldBtn.classList.toggle('active', document.queryCommandState('bold'));
  if (italicBtn) italicBtn.classList.toggle('active', document.queryCommandState('italic'));
  if (underlineBtn) underlineBtn.classList.toggle('active', document.queryCommandState('underline'));
}

let canvas, ctx, isDrawing = false;
let lastX = 0, lastY = 0;

function initJournalCanvas() {
  canvas = /** @type {HTMLCanvasElement} */ (document.getElementById("drawing-canvas"));
  if (!canvas) return;
  ctx = canvas.getContext("2d");

  // Set real pixel size
  canvas.width = canvas.offsetWidth || 500;
  canvas.height = canvas.offsetHeight || 250;

  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  // Mouse Events
  canvas.addEventListener('mousedown', startDrawing);
  canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('mouseup', stopDrawing);
  canvas.addEventListener('mouseout', stopDrawing);

  // Touch Events
  canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
  canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
  canvas.addEventListener('touchend', stopDrawing);
}

function getPointerPos(e) {
  const rect = canvas.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  return {
    x: clientX - rect.left,
    y: clientY - rect.top
  };
}

function startDrawing(e) {
  isDrawing = true;
  const pos = getPointerPos(e);
  [lastX, lastY] = [pos.x, pos.y];
}

function handleTouchStart(e) {
  if (e.touches.length === 1) e.preventDefault();
  startDrawing(e);
}

function draw(e) {
  if (!isDrawing) return;
  const pos = getPointerPos(e);

  const colorInput = /** @type {HTMLInputElement} */ (document.getElementById("drawing-color"));
  const sizeInput = /** @type {HTMLInputElement} */ (document.getElementById("drawing-size"));

  ctx.strokeStyle = colorInput ? colorInput.value : "#000";
  ctx.lineWidth = sizeInput ? sizeInput.value : 3;

  ctx.beginPath();
  ctx.moveTo(lastX, lastY);
  ctx.lineTo(pos.x, pos.y);
  ctx.stroke();

  [lastX, lastY] = [pos.x, pos.y];
}

function handleTouchMove(e) {
  if (e.touches.length === 1) e.preventDefault();
  draw(e);
}

function stopDrawing() {
  isDrawing = false;
}

function clearDoodleCanvas() {
  if (ctx && canvas) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
}

function loadDoodleOntoCanvas(dataUrl) {
  if (!ctx || !canvas) return;
  const img = new Image();
  img.onload = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
  };
  img.src = dataUrl;
}

function isCanvasBlank(c) {
  if (!c || !c.getContext || !c.width || !c.height) return true;
  try {
    const context = c.getContext('2d');
    const pixelBuffer = new Uint32Array(
      context.getImageData(0, 0, c.width, c.height).data.buffer
    );
    return !pixelBuffer.some(color => color !== 0);
  } catch (e) {
    console.error("Canvas check error", e);
    return true; // Assume blank if we can't read it
  }
}

// ==================== WATER TRACKER ====================
let waterConsumed = 0;
let waterGoal = 2000;
let lastWaterTime = null;
let waterDrinkLog = []; // timestamped log of individual drinks today

function showWaterPage() {
  showPage('water-page');
  loadWaterData();
  updateWaterDisplay();
}

function loadWaterData() {
  const saved = appStorage.getItem("waterData");
  if (saved) {
    try {
      const data = JSON.parse(saved);
      waterGoal = data.goal || 2000;

      // Daily reset logic: only keep consumed amount if it's the same day
      const today = new Date().toDateString();
      if (data.saveDate === today) {
        waterConsumed = data.consumed || 0;
      } else {
        waterConsumed = 0; // Reset for a new day
      }
      lastWaterTime = data.lastTime || null;

      // Load today's drink log
      if (data.saveDate === today && Array.isArray(data.drinkLog)) {
        waterDrinkLog = data.drinkLog;
      } else {
        waterDrinkLog = [];
      }
    } catch (e) {
      console.error("Error loading water data", e);
    }
  }
}

function saveWaterState() {
  appStorage.setItem("waterData", JSON.stringify({
    consumed: waterConsumed,
    goal: waterGoal,
    lastTime: lastWaterTime,
    saveDate: new Date().toDateString(),
    drinkLog: waterDrinkLog
  }));
}

function updateWaterDisplay() {
  document.getElementById("water-consumed").textContent = waterConsumed.toString();
  document.getElementById("water-goal-display").textContent = waterGoal.toString();
  const percentage = Math.min(100, (waterConsumed / waterGoal) * 100);
  document.getElementById("water-fill").style.height = percentage + "%";

  // Update quick stats
  const remainingEl = document.getElementById("water-remaining");
  if (remainingEl) remainingEl.textContent = Math.max(0, waterGoal - waterConsumed) + "ml";

  const glassesEl = document.getElementById("water-glasses-count");
  if (glassesEl) glassesEl.textContent = Math.floor(waterConsumed / 250).toString();

  // 7-day average
  try {
    const history = JSON.parse(appStorage.getItem("waterHistory") || "[]");
    const avgEl = document.getElementById("water-avg-daily");
    if (avgEl && history.length > 0) {
      const totalHist = history.reduce((sum, d) => sum + d.amount, 0);
      avgEl.textContent = Math.round(totalHist / history.length) + "ml";
    }
  } catch (e) { }

  // Render drink log
  renderWaterDrinkLog();

  recordWaterIntake();
  renderWaterChart();

  // Sync Bloom dashboard water widget
  if (typeof updateBloomWidgets === "function") updateBloomWidgets();
}

function recordWaterIntake() {
  const today = new Date().toDateString();
  let history = [];
  try {
    history = JSON.parse(appStorage.getItem("waterHistory") || "[]");
  } catch (e) { }

  const todayEntry = history.find(entry => entry.date === today);
  if (todayEntry) {
    todayEntry.amount = waterConsumed;
  } else {
    history.push({ date: today, amount: waterConsumed });
  }

  // Keep last 7 days
  if (history.length > 7) {
    history = history.slice(history.length - 7);
  }
  appStorage.setItem("waterHistory", JSON.stringify(history));
}

function renderWaterChart() {
  const chartEl = document.getElementById("water-history-chart");
  if (!chartEl) return;

  let history = [];
  try {
    history = JSON.parse(appStorage.getItem("waterHistory") || "[]");
  } catch (e) { }

  chartEl.innerHTML = "";

  // Fill with empty days if less than 7
  const displayHistory = [...history];
  while (displayHistory.length < 7) {
    displayHistory.unshift({ date: "", amount: 0 });
  }

  const maxAmount = Math.max(waterGoal, ...displayHistory.map(d => d.amount));

  displayHistory.forEach(day => {
    const barContainer = document.createElement("div");
    barContainer.style.display = "flex";
    barContainer.style.flexDirection = "column";
    barContainer.style.alignItems = "center";
    barContainer.style.height = "100%";
    barContainer.style.justifyContent = "flex-end";
    barContainer.style.gap = "5px";

    const h = maxAmount > 0 ? (day.amount / maxAmount) * 100 : 0;

    // Label for day
    let dayLabelText = "";
    if (day.date) {
      const d = new Date(day.date);
      const days = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
      dayLabelText = days[d.getDay()];
    }

    barContainer.innerHTML = `
      <div style="font-size: 10px; color: var(--text-muted);">${day.amount > 0 ? day.amount : ''}</div>
      <div style="width: 20px; height: 100px; background: rgba(0,0,0,0.05); border-radius: 10px; position: relative; overflow: hidden; display: flex; align-items: flex-end;">
        <div style="width: 100%; height: ${h}%; background: var(--primary); border-radius: 10px; transition: height 0.3s;"></div>
      </div>
      <div style="font-size: 12px; font-weight: bold; color: var(--text-main);">${dayLabelText}</div>
    `;
    chartEl.appendChild(barContainer);
  });
}

function addWater(amount) {
  waterConsumed += amount;
  lastWaterTime = Date.now();

  // Add to today's drink log
  waterDrinkLog.push({
    amount: amount,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  });

  saveWaterState();
  updateWaterDisplay();
  saveState();
  if (waterGoal > 0 && waterConsumed >= waterGoal && (waterConsumed - amount) < waterGoal) {
    handleWaterGoalCompleted();
  }
  if (typeof tryVitalityStreak === "function") tryVitalityStreak();
}

function undoLastWater() {
  if (waterDrinkLog.length === 0) {
    showNotification("Nothing to undo!");
    return;
  }
  const lastDrink = waterDrinkLog.pop();
  waterConsumed = Math.max(0, waterConsumed - lastDrink.amount);
  lastWaterTime = Date.now();
  saveWaterState();
  updateWaterDisplay();
  saveState();
  showNotification(`↩ Undid ${lastDrink.amount}ml`);
}

function renderWaterDrinkLog() {
  const logEl = document.getElementById("water-drink-log");
  if (!logEl) return;

  if (waterDrinkLog.length === 0) {
    logEl.innerHTML = '<p style="color: var(--text-muted); text-align: center; font-size: 0.9rem;">No drinks logged yet today. Stay hydrated! 💧</p>';
    return;
  }

  logEl.innerHTML = waterDrinkLog.slice().reverse().map((d, i) => `
    <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; background:rgba(255,255,255,0.5); border-radius:8px; border-left:3px solid var(--primary);">
      <span style="font-weight:600; color:var(--text-main);">💧 ${d.amount}ml</span>
      <small style="color:var(--text-muted);">${d.time}</small>
    </div>
  `).join("");
}

function handleWaterGoalCompleted() {
  const goal = waterGoal;
  const un = getUserName();
  const nameStr = un ? ` ${un}` : "";
  showNotification(`🎉 Congratulations${nameStr}! You reached your water goal of ${goal}ml! Keep hydrating!`);
  lastWaterTime = Date.now();
  saveWaterState();
  updateWaterDisplay();
  saveState();
}

function setWaterGoal() {
  const goalInput = /** @type {HTMLInputElement} */ (document.getElementById("water-goal"));
  const goal = parseInt(goalInput.value);
  if (goal > 0) {
    waterGoal = goal;
    saveWaterState();
    updateWaterDisplay();
    saveState();
    showNotification(`💧 Water goal set to ${goal}ml!`);
  }
}

function checkWaterNotifications() {
  const prefs = getReminderPreferences();
  if (!prefs.waterReminders) return;
  if (waterGoal <= 0) return;
  if (waterConsumed >= waterGoal) return;
  const remaining = Math.max(0, waterGoal - waterConsumed);
  showNotification(`💧 Water time! ${remaining}ml is left from your water goal yet to drink.`);
}

// ==================== POMODORO TIMER ====================
let pomodoroTimer = null;
let pomodoroTimeLeft = 25 * 60; // 25 minutes in seconds
let pomodoroRunning = false;
let pomodoroStartTime = null;
let pomodoroTotalTime = 25 * 60;
let currentTimerType = "ice"; // "ice", "candle", or "plant"

function showPomodoroPage() {
  showPage('pomodoro-page');
  resetAllAnimations();
}

function switchTimerType(type) {
  currentTimerType = type;
  document.querySelectorAll('.timer-animation').forEach(a => a.classList.remove('active'));
  const anim = document.getElementById(`${type}-animation`);
  if (anim) anim.classList.add('active');
  document.querySelectorAll('.timer-type-btn').forEach(b => b.classList.remove('active'));
  const btn = document.querySelector(`[data-type="${type}"] `);
  if (btn) btn.classList.add('active');

  // Add/remove minimal mode styling class
  const displayArea = document.querySelector('.pomodoro-display');
  const containerArea = document.querySelector('.pomodoro-container');
  const pageArea = document.getElementById('pomodoro-page');
  if (displayArea && containerArea && pageArea) {
    if (type === 'minimal') {
      displayArea.classList.add('minimal-mode');
      containerArea.classList.add('minimal-mode');
      pageArea.classList.add('minimal-mode');
    } else {
      displayArea.classList.remove('minimal-mode');
      containerArea.classList.remove('minimal-mode');
      pageArea.classList.remove('minimal-mode');
    }
  }

  resetAllAnimations();
  saveState(); // Persist timer type preference
}

// Attach listeners to timer type buttons
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll('.timer-type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.getAttribute('data-type');
      if (type) switchTimerType(type);
    });
  });
});

function startPomodoro() {
  const timeInput = /** @type {HTMLInputElement} */ (document.getElementById("pomodoro-time"));
  const durationType = /** @type {HTMLSelectElement} */(document.getElementById("pomodoro-duration-type")).value;
  let duration = parseInt(timeInput.value) || 25;
  if (durationType === "minutes") {
    if (duration > 60) {
      alert("Maximum time is 60 minutes!");
      return;
    }
    pomodoroTimeLeft = duration * 60;
    pomodoroTotalTime = duration * 60;
  } else if (durationType === "hours") {
    if (duration > 12) {
      alert("Maximum time is 12 hours!");
      return;
    }
    pomodoroTimeLeft = duration * 60 * 60;
    pomodoroTotalTime = duration * 60 * 60;
  }
  pomodoroRunning = true;
  pomodoroStartTime = Date.now();

  const pmElement = document.getElementById("pomodoro-message");
  if (pmElement) {
    pmElement.innerHTML = "";
    pmElement.style.display = "none";
  }

  document.getElementById("start-pomodoro").classList.add("hidden");
  document.getElementById("pause-pomodoro").classList.remove("hidden");

  // Trigger strict focus mode if enabled
  enterStrictFocusMode();

  // Use wall-clock time for accuracy
  const pomodoroWallStart = Date.now();
  const pomodoroInitialTimeLeft = pomodoroTimeLeft;

  // Background fallback just to check completion when window is minimized
  pomodoroTimer = setInterval(() => {
    const elapsedMs = Date.now() - pomodoroWallStart;
    const elapsedSecs = elapsedMs / 1000;
    if (pomodoroInitialTimeLeft - elapsedSecs <= 0) {
      clearInterval(pomodoroTimer);
      cancelAnimationFrame(window.pomodoroRafId);
      pomodoroTimeLeft = 0;
      updatePomodoroDisplay();
      completePomodoro();
    }
  }, 1000);

  // 60FPS Smooth Animation Loop
  function pomodoroTick() {
    const elapsedMs = Date.now() - pomodoroWallStart;
    const elapsedSecs = elapsedMs / 1000;
    pomodoroTimeLeft = Math.max(0, pomodoroInitialTimeLeft - elapsedSecs);
    
    // Only update numbers on DOM when whole second changes (for performance)
    updatePomodoroDisplay();

    const elapsed = pomodoroTotalTime - pomodoroTimeLeft;
    const percentage = (elapsed / pomodoroTotalTime) * 100;

    // Smooth physics visual updates
    if (currentTimerType === "ice") {
      updateIceAnimation(percentage);
    } else if (currentTimerType === "candle") {
      updateCandleAnimation(percentage);
    } else if (currentTimerType === "minimal") {
      const minimalCircle = document.getElementById("minimal-progress-circle");
      if (minimalCircle) {
        const circumference = 565.48;
        const offset = circumference - (percentage / 100) * circumference;
        minimalCircle.style.strokeDashoffset = offset.toString();
      }
    }

    // Satisfying Fade for Task Heading/Banner
    const startFade = 100 - percentage - 20; const endFade = 100 - percentage + 5; const maskStyle = `linear-gradient(to right, black ${startFade}%, transparent ${endFade}%)`;
    const banner = document.getElementById("focus-task-banner");
    const heading = document.getElementById("pomodoro-heading");
    if (banner && !banner.classList.contains("hidden")) {
      banner.style.opacity = "1"; banner.style.webkitMaskImage = maskStyle; banner.style.maskImage = maskStyle;
    }
    if (heading && heading.textContent !== "🍅 Pomodoro Timer") {
      heading.style.opacity = "1"; heading.style.webkitMaskImage = maskStyle; heading.style.maskImage = maskStyle;
    }

    if (pomodoroTimeLeft > 0 && pomodoroRunning) {
      window.pomodoroRafId = requestAnimationFrame(pomodoroTick);
    }
  }

  window.pomodoroRafId = requestAnimationFrame(pomodoroTick);
}

function pausePomodoro() {
  pomodoroRunning = false;
  clearInterval(pomodoroTimer);
  document.getElementById("start-pomodoro").classList.remove("hidden");
  document.getElementById("pause-pomodoro").classList.add("hidden");
}

function resetPomodoro() {
  pomodoroRunning = false;
  clearInterval(pomodoroTimer);
  const banner = document.getElementById("focus-task-banner");
  const heading = document.getElementById("pomodoro-heading");
  if (banner) { banner.style.opacity = "1"; banner.style.webkitMaskImage = "none"; banner.style.maskImage = "none"; }
  if (heading) { heading.style.opacity = "1"; heading.style.webkitMaskImage = "none"; heading.style.maskImage = "none"; }
  const durationType = /** @type {HTMLSelectElement} */(document.getElementById("pomodoro-duration-type")).value;
  let defaultValue = "25";
  if (durationType === "hours") defaultValue = "1";
  pomodoroTimeLeft = durationType === "hours" ? 1 * 60 * 60 : 25 * 60;
  pomodoroTotalTime = pomodoroTimeLeft;
  document.getElementById("start-pomodoro").classList.remove("hidden");
  document.getElementById("pause-pomodoro").classList.add("hidden");
  const pmElement = document.getElementById("pomodoro-message");
  if (pmElement) {
    pmElement.innerHTML = "";
    pmElement.style.display = "none";
  }

  const timeInput = /** @type {HTMLInputElement} */ (document.getElementById("pomodoro-time"));
  timeInput.value = defaultValue;
  updatePomodoroDisplay();
  resetAllAnimations();
  exitStrictFocusMode();
}

function updatePomodoroDisplay() {
  const time = Math.max(0, pomodoroTimeLeft);
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  document.getElementById("pomodoro-timer").textContent =
    `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// ==================== GLASSMORPHIC ICE VESSEL ====================
function updateIceAnimation(percentage) {
  const water = document.getElementById('vessel-water');
  if (water) {
    water.style.height = percentage + "%";
    // Color shift: icy blue → deep ocean as time progresses
    const r = Math.round(56 - percentage * 0.5);
    const g = Math.round(189 - percentage * 1.0);
    const b = Math.round(248 - percentage * 0.5);
    water.style.background = `linear-gradient(180deg,
      rgba(${r}, ${g}, ${b}, 0.6) 0%,
      rgba(${Math.max(3, r-40)}, ${Math.max(80, g-70)}, ${Math.max(164, b-40)}, 0.75) 40%,
      rgba(3, 60, 140, 0.9) 100%)`;
  }

  // Melt ice chunks as water rises (water fills from bottom (100% top) to top (0% top))
  const chunks = document.querySelectorAll('.ice-chunk');
  chunks.forEach((chunk) => {
    const chunkEl = /** @type {HTMLElement} */ (chunk);
    const topMatch = /top:\s*([\d.]+)%/.exec(chunkEl.style.cssText);
    let cubeTop = topMatch ? parseFloat(topMatch[1]) : 0;
    
    // Water level is current percentage (0 to 100)
    // A cube at top: 70% gets submerged when water reaches 30%
    const submergeStart = 100 - cubeTop;
    if (percentage > submergeStart) {
      const meltProgress = Math.min(1, (percentage - submergeStart) / 15);
      chunkEl.style.opacity = (1 - meltProgress).toString();
      chunkEl.style.transform = `scale(${1 - meltProgress * 0.6})`;
    } else {
      chunkEl.style.opacity = "1";
      chunkEl.style.transform = "";
    }
  });
}

function resetIceAnimation() {
  const water = document.getElementById('vessel-water');
  if (water) {
    water.style.height = "0%";
    water.style.background = "";
  }
  const chunks = document.querySelectorAll('.ice-chunk');
  chunks.forEach((chunk) => {
    const chunkEl = /** @type {HTMLElement} */ (chunk);
    chunkEl.style.opacity = "1";
    chunkEl.style.transform = "";
  });
}

// ==================== CINEMATIC CANDLE ====================
function updateCandleAnimation(percentage) {
  const waxBody = document.getElementById('candle-wax-body');
  const waxPool = document.getElementById('candle-wax-pool');
  const flameWrap = document.querySelector('.candle-flame-wrap');
  const ambientGlow = document.querySelector('.candle-ambient-glow');

  if (waxBody) {
    // Wax shrinks from 220px to 40px
    const height = Math.max(40, 220 - (percentage / 100) * 180);
    waxBody.style.height = height + 'px';
  }

  if (waxPool) {
    // Pool grows as candle burns
    const poolWidth = Math.min(80, percentage * 0.8);
    waxPool.style.width = poolWidth + 'px';
  }

  if (flameWrap) {
    // Flame gets slightly smaller near end
    const flameScale = percentage > 80 ? Math.max(0.4, 1 - (percentage - 80) / 40) : 1;
    flameWrap.style.transform = `translateX(-50%) scale(${flameScale})`;
  }

  if (ambientGlow) {
    // Glow dims near end
    const glowOpacity = percentage > 85 ? Math.max(0.1, 1 - (percentage - 85) / 20) : 1;
    ambientGlow.style.opacity = glowOpacity.toString();
  }
}

function resetCandleAnimation() {
  const waxBody = document.getElementById('candle-wax-body');
  const waxPool = document.getElementById('candle-wax-pool');
  const flameWrap = document.querySelector('.candle-flame-wrap');
  const ambientGlow = document.querySelector('.candle-ambient-glow');

  if (waxBody) waxBody.style.height = '220px';
  if (waxPool) waxPool.style.width = '0px';
  if (flameWrap) flameWrap.style.transform = 'translateX(-50%) scale(1)';
  if (ambientGlow) ambientGlow.style.opacity = '1';
}

// ==================== PLANT GROWING ANIMATION ====================

// Plant Growth Animation Script (standalone)
let plantTime = 0;
const plantTimerText = document.getElementById("plant-timer");
const plantStem = document.querySelector("#plant-animation .stem");
const plantLeaves = document.querySelectorAll("#plant-animation .leaf");
const plantFlower = document.querySelector("#plant-animation .flower");

if (plantTimerText && plantStem && plantLeaves && plantFlower) {
  let plantInterval = setInterval(() => {
    plantTime++;
    plantTimerText.innerText = `Time: ${plantTime}s`;

    if (plantTime === 2) {
      plantStem.classList.add("grow-stem");
    }
    if (plantTime === 5) {
      plantLeaves.forEach(leaf => leaf.classList.add("show-leaf"));
    }
    if (plantTime === 8) {
      plantFlower.classList.add("bloom");
      clearInterval(plantInterval);
    }
  }, 1000);
}

function resetAllAnimations() {
  resetIceAnimation();
  resetCandleAnimation();

  const minimalCircle = document.getElementById("minimal-progress-circle");
  if (minimalCircle) {
    minimalCircle.style.strokeDashoffset = "0";
  }
}

function completePomodoro() {
  clearInterval(pomodoroTimer);
  pomodoroRunning = false;
  pomodoroTimeLeft = 0;
  updatePomodoroDisplay();

  const randomQuote = fallbackQuotes[Math.floor(Math.random() * fallbackQuotes.length)];
  const quoteText = randomQuote ? randomQuote.text : "Great job completing your session!";
  const author = randomQuote ? randomQuote.author : "Habit Tracker";

  const pmElement = document.getElementById("pomodoro-message");
  if (pmElement) {
    pmElement.innerHTML = `
      <h2>🎉 Great Work! 🎉</h2>
      <p>You've completed your Pomodoro session!</p>
      <p style="font-style: italic; margin-top: 20px;">"${quoteText}"</p>
      <p style="font-size: 0.9em; margin-top: 5px; color: var(--text-muted);">- ${author}</p>
    `;
    pmElement.style.display = "block";
  }

  showPomodoroSuccessAnimation();

  // Auto-complete the focused task if one exists
  if (currentFocusTaskCheckbox && !currentFocusTaskCheckbox.checked) {
    currentFocusTaskCheckbox.checked = true;
    const event = new Event('change');
    currentFocusTaskCheckbox.dispatchEvent(event);

    const un = getUserName();
    const nameStr = un ? `, ${un}` : "";
    showNotification(`🍅 Pomodoro completed${nameStr}! Task automatically marked as done. ✅`);

    const banner = document.getElementById('focus-task-banner');
    if (banner) { banner.classList.add('hidden'); banner.classList.remove('habit-focus-active'); }
    currentFocusTaskCheckbox = null;
  } else if (typeof currentFocusHabitIndex === 'number' && currentFocusHabitIndex !== null && currentFocusHabitIndex >= 0) {
    // Auto-complete the focused habit
    const hIdx = currentFocusHabitIndex;
    if (typeof userHabits !== 'undefined' && userHabits[hIdx] && !userHabits[hIdx].completedToday) {
      toggleHabit(hIdx, true);
      const un = getUserName();
      const nameStr = un ? `, ${un}` : "";
      showNotification(`⏱ Habit "${userHabits[hIdx].text}" auto-completed${nameStr}! 🔥`);
    }
    const banner = document.getElementById('focus-task-banner');
    if (banner) { banner.classList.add('hidden'); banner.classList.remove('habit-focus-active'); }
    currentFocusHabitIndex = null;
  } else {
    const un = getUserName();
    const nameStr = un ? `Great job, ${un}!` : "Great job!";
    showNotification(`🍅 Pomodoro completed! ${nameStr}`);
  }

  document.getElementById("start-pomodoro").classList.remove("hidden");
  exitStrictFocusMode();
  document.getElementById("pause-pomodoro").classList.add("hidden");
}

function showPomodoroSuccessAnimation() {
  const timerEl = document.getElementById("pomodoro-timer");

  // Shake/pop animation for the timer display
  if (timerEl) {
    timerEl.style.transform = "scale(1.2)";
    timerEl.style.color = "var(--primary-light)";
    timerEl.style.transition = "all 0.3s ease";
    setTimeout(() => {
      timerEl.style.transform = "scale(1)";
      timerEl.style.color = "var(--text-main)";
    }, 400);
  }

  // Floating "+1 🍅" badge
  const badge = document.createElement("div");
  badge.className = "streak-loss-badge"; // Reuse the floating CSS class, but we will override styles via inline
  badge.textContent = "+1 🍅";
  badge.style.color = "#4CAF50"; // Green color
  badge.style.animation = "floatUpFade 1.5s ease-out forwards"; // Assuming we have or will just use inline keyframes if not present, wait: we can use a custom animation but we don't have CSS control. We'll use JS animation.
  document.body.appendChild(badge);

  // Position near the pomodoro timer
  const rect = timerEl?.getBoundingClientRect();
  if (rect) {
    badge.style.left = (rect.left + rect.width / 2) + "px";
    badge.style.top = rect.top + "px";
  }

  // Animate upward in JS since we aren't adding CSS classes
  let opacity = 1;
  let top = rect ? rect.top : window.innerHeight / 2;
  const animInterval = setInterval(() => {
    top -= 1;
    opacity -= 0.02;
    badge.style.top = top + "px";
    badge.style.opacity = opacity.toString();
    if (opacity <= 0) {
      clearInterval(animInterval);
      badge.remove();
    }
  }, 30);
}

// ==================== NOTIFICATIONS ====================
function showNotification(message) {
  const options = {
    body: message,
    icon: 'icon-192.png',
    badge: 'icon-192.png',
    vibrate: [200, 100, 200],
    data: {
      url: window.location.origin + '/index.html'
    }
  };

  // Try to use Service Worker registration for a native system-tray notification
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.ready.then(registration => {
      registration.showNotification("Ultradian", options);
    }).catch(e => {
      // Fallback to basic window Notification if SW registration isn't ready
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("Ultradian", options);
      }
    });
  } else if ("Notification" in window && Notification.permission === "granted") {
    new Notification("Ultradian", options);
  }

  // Also show in-app notification
  const notification = document.createElement("div");
  notification.className = "in-app-notification";
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.classList.add("show");
  }, 10);

  setTimeout(() => {
    notification.classList.remove("show");
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// ==================== TASK REMINDERS ====================
function checkTaskReminders() {
  const prefs = getReminderPreferences();
  if (!prefs.taskReminders) return;
  const checkboxes = document.querySelectorAll("#task input[type='checkbox']");
  const incompleteTasks = Array.from(checkboxes).filter(
    cb => !(/** @type {HTMLInputElement} */ (cb)).checked
  );

  if (incompleteTasks.length > 0) {
    const name = getUserName();
    const namePart = name ? `${name}, ` : "";
    showNotification(
      `📋 ${namePart}Reminder: You have ${incompleteTasks.length} incomplete task(s). Don't forget to complete them!`
    );
  }
}

const morningInspirationIdeas = [
  "Start your day with a 5-minute deep focus session.",
  "Log your first glass of water to keep your hydration streak alive!",
  "What's the one 'Big Win' task you want to crush today?",
  "Take a moment for a 4-7-8 breathing exercise to center yourself.",
  "Your streak is looking great! Let's keep it going today.",
  "A productive day starts with a clear plan. Check your task list!",
  "Try a 'Quick Focus' session for that one task you've been putting off.",
  "How about a mid-morning stretch and a water break?",
  "Remember: Consistency is the key to building lasting habits.",
  "Turn your phone to Zen Mode and focus on your top priority for 20 minutes.",
  "Success is the sum of small efforts repeated daily. What's one small win?",
  "Check your progress in the 3D Castle—every task helps it grow!",
  "Is it time for a hydration check-in? 💧",
  "Use the Pomodoro timer to power through your next 25 minutes.",
  "A clear mind is a productive mind. Try the meditation page!",
  "Challenge yourself: Can you complete 3 tasks before lunch? 🚀",
  "Your future self will thank you for the habits you build today.",
  "Log your current mood—how are you feeling this morning?",
  "Small steps lead to big victories. Check off your first task!",
  "Ready to level up? Let's tackle something challenging today.",
  "Focus on the process, not just the result. Enjoy your work!",
  "Deep breaths in, distractions out. You've got this! 🌟",
  "Don't forget to use a lifeline if you feel stuck today.",
  "Great things never came from comfort zones. Let's do this!",
  "Your 3-day streak is just the beginning. Keep it up!",
  "Stay hydrated, stay focused. Drink some water now! 💧",
  "Mindfulness matters. Take 60 seconds to just breathe.",
  "Productivity is being able to do things that you were never able to do before.",
  "Organized life, organized mind. Is your task list ready?",
  "Let's make today count! Pick your focus task now. 🎯"
];

/**
 * Checks if it is 10 AM or later and sends a daily inspiration notification.
 * Ensures the notification is only sent once per day.
 */
function check10AMNotifications() {
  const now = new Date();
  const currentHour = now.getHours();
  const todayDate = now.toDateString();
  const lastNotifDate = appStorage.getItem("last10AMNotifDate");

  // Trigger if it's 10 AM (10:00) or later AND we haven't sent today's notification yet
  if (currentHour >= 10 && lastNotifDate !== todayDate) {
    const name = getUserName();
    const namePart = name ? `${name}, ` : "";

    // Pick a random idea from the 30 inspirations
    const randomIndex = Math.floor(Math.random() * morningInspirationIdeas.length);
    const idea = morningInspirationIdeas[randomIndex];

    showNotification(`🌅 Good morning ${namePart}${idea}`);

    // Mark today's notification as sent
    appStorage.setItem("last10AMNotifDate", todayDate);
  }
}

/**
 * Checks if it is 5 PM or later and sends a daily summary/reminder notification.
 * Ensures the notification is only sent once per day.
 */
function check5PMNotifications() {
  const now = new Date();
  const currentHour = now.getHours();
  const todayDate = now.toDateString();
  const lastNotifDate = appStorage.getItem("last5PMNotifDate");

  // Trigger if it's 5 PM (17:00) or later AND we haven't sent today's notification yet
  if (currentHour >= 17 && lastNotifDate !== todayDate) {
    // Select all task checkboxes (excluding bulk selection checkboxes if any)
    const checkboxes = document.querySelectorAll("#task input[type='checkbox']:not(.task-select-cb)");

    // Only proceed if there are tasks to check
    if (checkboxes.length === 0) return;

    const incompleteTasks = Array.from(checkboxes).filter(
      cb => !(/** @type {HTMLInputElement} */ (cb)).checked
    );

    const name = getUserName();
    const namePart = name ? `${name}, ` : "";

    if (incompleteTasks.length === 0) {
      showNotification(`🎉 ${namePart}You're doing great! Let's take it to the next level.`);
    } else {
      showNotification(`📋 ${namePart}Task completion reminder: You have ${incompleteTasks.length} tasks left to do.`);
    }

    // Mark today's notification as sent
    appStorage.setItem("last5PMNotifDate", todayDate);
  }
}

/**
 * Schedules a true background notification on the device for a specific future timestamp.
 * This works natively on Android via PWABuilder relying on the Notification Triggers API.
 */
function scheduleFutureNotification(id, title, options, timestampMs) {
  if (!('serviceWorker' in navigator) || !('showTrigger' in Notification.prototype)) return;

  navigator.serviceWorker.ready.then(registration => {
    registration.showNotification(title, {
      ...options,
      tag: id,
      showTrigger: new TimestampTrigger(timestampMs)
    }).catch(e => console.warn("Failed scheduling trigger:", e));
  });
}

function scheduleNext10AMNotification() {
  // Only supported on compatible Chrome environments
  if (!('showTrigger' in Notification.prototype)) return;

  const now = new Date();
  let target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0, 0);

  // If it's already past 10 AM, schedule for tomorrow
  if (now.getTime() >= target.getTime()) {
    target.setDate(target.getDate() + 1);
  }

  const name = getUserName();
  const namePart = name ? `${name}, ` : "";
  const randomIndex = Math.floor(Math.random() * morningInspirationIdeas.length);
  const idea = morningInspirationIdeas[randomIndex];

  scheduleFutureNotification(
    "morning-inspiration",
    "Ultradian",
    {
      body: `🌅 Good morning ${namePart}${idea}`,
      icon: 'icon-192.png',
      badge: 'icon-192.png',
      vibrate: [200, 100, 200],
      data: { url: window.location.origin + '/index.html' }
    },
    target.getTime()
  );
}

function scheduleNext5PMNotification() {
  if (!('showTrigger' in Notification.prototype)) return;

  const now = new Date();
  let target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 17, 0, 0, 0);

  if (now.getTime() >= target.getTime()) {
    target.setDate(target.getDate() + 1); // schedule for tomorrow
  }

  const name = getUserName();
  const namePart = name ? `${name}, ` : "";

  scheduleFutureNotification(
    "evening-summary",
    "Ultradian",
    {
      body: `📋 Evening check-in ${namePart}Time to update your tasks and wrap up the day!`,
      icon: 'icon-192.png',
      badge: 'icon-192.png',
      vibrate: [200, 100, 200],
      data: { url: window.location.origin + '/index.html' }
    },
    target.getTime()
  );
}

// For manual user testing
window.testScheduledNotification = function () {
  if (!('showTrigger' in Notification.prototype)) {
    alert("Scheduled Notification Triggers API is not supported on this device/browser.");
    return;
  }
  const now = new Date();
  const target = new Date(now.getTime() + 60000); // 1 minute from now
  alert("Scheduling test notification for 60 seconds from now. You can completely close the app now.");

  scheduleFutureNotification(
    "test-notification",
    "Ultradian Test",
    {
      body: `Testing background triggering! Your app effectively woke up the phone.`,
      icon: 'icon-192.png',
      badge: 'icon-192.png',
      vibrate: [200, 100, 200],
      data: { url: window.location.origin + '/index.html' }
    },
    target.getTime()
  );
};

// ==================== LIBRARY (GUTENBERG) ====================
let currentBookId = null;
let currentBookTitle = '';
let currentBookUrl = '';
let currentBookCover = '';
let fontScale = 1.2;
let highlightMode = false;
let bookHighlights = {};
let bookType = 'text';       // 'text' | 'epub' | 'pdf'
let pdfDoc = null;           // PDF.js document instance
let pendingBinaryFile = null; // { arrayBuffer, type, name } for upload flow

// ==================== BOOK HISTORY ====================
function getBookHistory() {
  try { return JSON.parse(appStorage.getItem('bookHistory') || '[]'); }
  catch { return []; }
}

function saveBookToHistory(id, title, url, coverUrl, pageIndex, totalPages) {
  let history = getBookHistory();
  // Remove this book if already in history (we'll re-add at top)
  history = history.filter(b => b.id !== id);
  // Add at the start (most recent)
  history.unshift({
    id, title, url, coverUrl,
    pageIndex, totalPages,
    lastRead: Date.now()
  });
  // Keep only last 5
  if (history.length > 5) history = history.slice(0, 5);
  appStorage.setItem('bookHistory', JSON.stringify(history));
}

function renderRecommendations() {
  const grid = document.getElementById("recommendations-grid");
  if (!grid) return;

  // Clear in case of re-render
  grid.innerHTML = "";
  const recs = [
    { id: 2680, title: "Meditations", author: "Marcus Aurelius", coverUrl: "https://www.gutenberg.org/cache/epub/2680/pg2680.cover.medium.jpg", textUrl: "https://www.gutenberg.org/ebooks/2680.txt.utf-8", downloads: 85400 },
    { id: 345, title: "Dracula", author: "Bram Stoker", coverUrl: "https://www.gutenberg.org/cache/epub/345/pg345.cover.medium.jpg", textUrl: "https://www.gutenberg.org/ebooks/345.txt.utf-8", downloads: 74200 },
    { id: 84, title: "Frankenstein", author: "Mary Wollstonecraft Shelley", coverUrl: "https://www.gutenberg.org/cache/epub/84/pg84.cover.medium.jpg", textUrl: "https://www.gutenberg.org/ebooks/84.txt.utf-8", downloads: 91500 },
    { id: 1342, title: "Pride and Prejudice", author: "Jane Austen", coverUrl: "https://www.gutenberg.org/cache/epub/1342/pg1342.cover.medium.jpg", textUrl: "https://www.gutenberg.org/ebooks/1342.txt.utf-8", downloads: 125000 },
    { id: 2701, title: "Moby Dick; Or, The Whale", author: "Herman Melville", coverUrl: "https://www.gutenberg.org/cache/epub/2701/pg2701.cover.medium.jpg", textUrl: "https://www.gutenberg.org/ebooks/2701.txt.utf-8", downloads: 68300 }
  ];

  recs.forEach(book => {
    const card = document.createElement("button");
    card.className = "book-card-premium";
    card.title = book.title;

    card.innerHTML = `
            <div class="book-cover-flat">
                <img src="${book.coverUrl}" alt="Cover" loading="lazy">
            </div>
            <div class="book-info-block">
                <div class="book-info-title">${book.title}</div>
                <div class="book-info-author">${book.author}</div>
            </div>
        `;
    card.addEventListener("click", () => openReader(book.id, book.title, book.textUrl, book.coverUrl));
    grid.appendChild(card);
  });
}

function renderReadingHistory() {
  const section = document.getElementById('reading-history-section');
  const list = document.getElementById('reading-history-list');
  if (!section || !list) return;

  const history = getBookHistory();
  if (history.length === 0) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';
  list.innerHTML = '';

  history.forEach((book, index) => {
    const pct = book.totalPages > 0 ? Math.round(((book.pageIndex + 1) / book.totalPages) * 100) : 0;
    const isCustom = book.url === '__custom__';

    const card = document.createElement('button');
    card.className = 'cinematic-history-card';
    card.title = book.title;

    // Generate beautiful cover HTML depending on book type
    let coverHtml = '';
    if (isCustom) {
      const emoji = book.coverUrl || '📖';
      // Cycle through cool gradients based on index
      const gradients = [
        'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'linear-gradient(135deg, #f6d365 0%, #fda085 100%)',
        'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)',
        'linear-gradient(135deg, #ff0844 0%, #ffb199 100%)',
        'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
      ];
      const bg = gradients[index % gradients.length];
      coverHtml = `<div class="custom-cover-gradient" style="background: ${bg};"><span>${emoji}</span></div>`;
    } else {
      coverHtml = `<img src="${book.coverUrl || 'icon-192.png'}" alt="Cover" onerror="this.src='icon-192.png'" loading="lazy">`;
    }

    // We use the cover as a blurred backdrop as well
    card.innerHTML = `
            <div class="cinematic-backdrop">
                ${isCustom ? coverHtml : coverHtml.replace('class="', 'class="blur-bg ')}
            </div>
            <div class="cinematic-content">
                <div class="cinematic-cover">
                    ${coverHtml}
                </div>
                <div class="cinematic-info">
                    <div class="cinematic-title">${book.title}</div>
                    <div class="cinematic-meta">${pct}% Completed</div>
                    <div class="cinematic-progress-bar">
                        <div class="cinematic-progress-fill" style="width: ${pct}%;"></div>
                    </div>
                </div>
                <div class="cinematic-play">
                    <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                </div>
            </div>
        `;

    card.addEventListener('click', () => {
      if (isCustom) {
        openCustomBook(book.id, book.title, book.coverUrl);
      } else {
        openReader(book.id, book.title, book.url, book.coverUrl);
      }
    });

    list.appendChild(card);
  });
}

// ==================== FINISHED BOOKS ====================
function getFinishedBooks() {
  try { return JSON.parse(appStorage.getItem('finishedBooks') || '[]'); }
  catch { return []; }
}

function addFinishedBook(id, title, url, coverUrl) {
  let finished = getFinishedBooks();
  // Don't add duplicates
  if (finished.some(b => String(b.id) === String(id))) return;
  finished.push({
    id, title, url, coverUrl,
    finishedAt: Date.now()
  });
  appStorage.setItem('finishedBooks', JSON.stringify(finished));
}

function removeFinishedBooks(idsToRemove) {
  let finished = getFinishedBooks();
  finished = finished.filter(b => !idsToRemove.includes(String(b.id)));
  appStorage.setItem('finishedBooks', JSON.stringify(finished));
}

function renderFinishedBooks() {
  const section = document.getElementById('finished-books-section');
  const list = document.getElementById('finished-books-list');
  if (!section || !list) return;

  const finished = getFinishedBooks();
  if (finished.length === 0) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';
  list.innerHTML = '';

  finished.forEach((book, index) => {
    const isCustom = book.url === '__custom__';
    const card = document.createElement('button');
    card.className = 'cinematic-history-card finished-book-card';
    card.title = book.title;

    let coverHtml = '';
    if (isCustom) {
      const emoji = book.coverUrl || '📖';
      const gradients = [
        'linear-gradient(135deg, #f6d365 0%, #fda085 100%)',
        'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)',
      ];
      const bg = gradients[index % gradients.length];
      coverHtml = `<div class="custom-cover-gradient" style="background: ${bg};"><span>${emoji}</span></div>`;
    } else {
      coverHtml = `<img src="${book.coverUrl || 'icon-192.png'}" alt="Cover" onerror="this.src='icon-192.png'" loading="lazy">`;
    }

    const finDate = new Date(book.finishedAt).toLocaleDateString();
    card.innerHTML = `
      <div class="cinematic-backdrop">
        ${isCustom ? coverHtml : coverHtml.replace('class="', 'class="blur-bg ')}
      </div>
      <div class="cinematic-content">
        <div class="cinematic-cover">
          ${coverHtml}
          <div class="finished-trophy">🏆</div>
        </div>
        <div class="cinematic-info">
          <div class="cinematic-title">${book.title}</div>
          <div class="cinematic-meta" style="color: #f6a623;">✅ Finished ${finDate}</div>
          <div class="cinematic-progress-bar">
            <div class="cinematic-progress-fill" style="width: 100%; background: linear-gradient(90deg, #f6d365, #fda085);"></div>
          </div>
        </div>
        <div class="cinematic-play">
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
        </div>
      </div>
    `;

    card.addEventListener('click', () => {
      if (isCustom) {
        openCustomBook(book.id, book.title, book.coverUrl);
      } else {
        openReader(book.id, book.title, book.url, book.coverUrl);
      }
    });

    list.appendChild(card);
  });
}

// ==================== HIGHLIGHTS ====================
function getBookHighlights(bookId) {
  try {
    const all = JSON.parse(appStorage.getItem('bookHighlights') || '{}');
    return all[bookId] || {};
  } catch { return {}; }
}

function saveHighlight(bookId, pageIndex, highlightText, offset = -1) {
  if (!highlightText || !highlightText.trim()) return;
  try {
    const all = JSON.parse(appStorage.getItem('bookHighlights') || '{}');
    if (!all[bookId]) all[bookId] = {};
    if (!all[bookId][pageIndex]) all[bookId][pageIndex] = [];
    
    // Avoid exact duplicates at the exact same location
    const exists = all[bookId][pageIndex].some(h => h.text === highlightText && (h.offset === offset || offset === -1));
    if (!exists) {
      all[bookId][pageIndex].push({ text: highlightText, offset, ts: Date.now() });
    }
    appStorage.setItem('bookHighlights', JSON.stringify(all));
    bookHighlights = all[bookId];
  } catch (e) { console.warn('Highlight save error:', e); }
}

function removeHighlight(bookId, pageIndex, highlightText, offset = -1) {
  try {
    const all = JSON.parse(appStorage.getItem('bookHighlights') || '{}');
    if (all[bookId] && all[bookId][pageIndex]) {
      all[bookId][pageIndex] = all[bookId][pageIndex].filter(h => {
        if (offset !== -1 && h.offset !== undefined) {
           return !(h.text === highlightText && String(h.offset) === String(offset));
        }
        return h.text !== highlightText;
      });
      if (all[bookId][pageIndex].length === 0) delete all[bookId][pageIndex];
      appStorage.setItem('bookHighlights', JSON.stringify(all));
      bookHighlights = all[bookId] || {};
    }
  } catch (e) { console.warn('Highlight remove error:', e); }
}

function applyHighlightsToPage(pageIndex) {
  const pageEl = document.getElementById('reader-text');
  if (!pageEl || !currentBookId) return;

  const highlights = bookHighlights[pageIndex];
  if (!highlights || highlights.length === 0) return;

  if (bookType === 'pdf') return; // PDF uses canvas, skip DOM highlights

  // For EPUB & Text: use TreeWalker to mark text in the existing HTML/DOM without destroying structure
  // Sort backwards by offset so DOM mutations don't alter earlier indices
  const sorted = [...highlights].sort((a, b) => b.text.length - a.text.length); 
  sorted.forEach(h => markTextInElement(pageEl, h.text, h.offset));

  // Add click handlers to remove highlights
  pageEl.querySelectorAll('.book-highlight').forEach(span => {
    span.addEventListener('click', (e) => {
      if (!highlightMode) return;
      e.stopPropagation();
      const text = decodeURIComponent(span.getAttribute('data-hl-text'));
      const offsetData = span.getAttribute('data-hl-offset');
      const parsedOffset = offsetData !== null ? parseInt(offsetData, 10) : -1;
      removeHighlight(currentBookId, bookPageIndex, text, parsedOffset);
      showBookPage(bookPageIndex, 'none');
    });
  });
}

// Mark text inside a DOM tree without destroying HTML structure (for EPUB highlights)
// Uses extractContents + wrapper to support large cross-node selections
function markTextInElement(root, searchText, targetOffset = -1) {
  if (!searchText) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
  const textNodes = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode);

  let fullText = '';
  const segments = [];
  for (const node of textNodes) {
    segments.push({ node, offset: fullText.length, length: node.textContent.length });
    fullText += node.textContent;
  }

  let matchIdx = -1;
  let searchIdx = 0;
  let bestDiff = Infinity;
  
  while ((searchIdx = fullText.indexOf(searchText, searchIdx)) !== -1) {
    if (targetOffset === -1 || targetOffset === undefined) {
      matchIdx = searchIdx; 
      break; 
    }
    const diff = Math.abs(searchIdx - targetOffset);
    if (diff < bestDiff) {
      bestDiff = diff;
      matchIdx = searchIdx;
    }
    searchIdx += searchText.length;
  }

  if (matchIdx === -1) return;

  let startNode, startOff, endNode, endOff;
  for (const seg of segments) {
    if (!startNode && matchIdx < seg.offset + seg.length) {
      startNode = seg.node; startOff = matchIdx - seg.offset;
    }
    if (matchIdx + searchText.length <= seg.offset + seg.length) {
      endNode = seg.node; endOff = matchIdx + searchText.length - seg.offset;
      break;
    }
  }
  if (!startNode || !endNode) return;

  try {
    const range = document.createRange();
    range.setStart(startNode, startOff);
    range.setEnd(endNode, endOff);

    const span = document.createElement('span');
    span.className = 'book-highlight';
    span.dataset.hlText = encodeURIComponent(searchText);
    if (targetOffset !== -1 && targetOffset !== undefined) {
      span.dataset.hlOffset = targetOffset;
    }
    const fragment = range.extractContents();
    span.appendChild(fragment);
    range.insertNode(span);
  } catch (e) {
    console.warn('Highlight apply failed (cross-node):', e);
  }
}

function handleTextSelection(overrideRange = null) {
  if (!currentBookId) return;
  const selection = window.getSelection();
  if (!overrideRange && (!selection || selection.isCollapsed)) return;

  const range = overrideRange || selection.getRangeAt(0);
  const selectedText = range.toString().trim();
  if (selectedText.length < 2) return;

  // Check that the selection is inside the reader
  const pageEl = document.getElementById('reader-text');
  if (!pageEl) return;
  if (!pageEl.contains(range.startContainer)) return;

  // Calculate precise global text offset to prevent duplicate cross-highlighting
  let offset = -1;
  try {
    const preSelectionRange = range.cloneRange();
    preSelectionRange.selectNodeContents(pageEl);
    preSelectionRange.setEnd(range.startContainer, range.startOffset);
    offset = preSelectionRange.toString().length;
  } catch (e) {
    console.warn("Offset fallback used", e);
  }

  saveHighlight(currentBookId, bookPageIndex, selectedText, offset);
  if (!overrideRange && selection) selection.removeAllRanges();

  // Re-render page with precisely tracked highlight applied
  showBookPage(bookPageIndex, 'none');
}

// ==================== TRANSLATION ====================
let activeTranslationLang = null;
const translatedPagesCache = {};

async function fetchTranslation(text, targetLang) {
  if (!text || !text.trim()) return text;
  try {
    const isHinglish = targetLang === 'hinglish';
    const tl = isHinglish ? 'hi' : targetLang;
    const dtParam = isHinglish ? '&dt=t&dt=rm' : '&dt=t';
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${tl}${dtParam}&q=${encodeURIComponent(text)}`;
    const res = await fetch(url);
    const json = await res.json();

    if (isHinglish && json[0]) {
      const parts = json[0];
      const lastPart = parts[parts.length - 1];
      // Google Translate appends the romanized (transliterated) text as a final item in the array where the 0th and 1st elements are null.
      if (lastPart && lastPart[0] === null && typeof lastPart[2] === 'string') {
        return lastPart[2]; // Return the transliteration
      } else if (lastPart && lastPart[0] === null && typeof lastPart[3] === 'string') {
        return lastPart[3]; // Sometimes it's at index 3 depending on the response format
      }
      // Fallback to hindi text if transliteration fails
      return parts.slice(0, parts.length - (lastPart[0] === null ? 1 : 0)).map(x => x[0]).join('');
    }

    return json[0].map(x => x[0]).join('');
  } catch (e) {
    console.error("Translation API error:", e);
    return null;
  }
}

async function applyTranslationToCurrentPage() {
  if (!activeTranslationLang || !currentBookId) return;

  const pageEl = document.getElementById('reader-text');
  if (!pageEl) return;

  if (bookType === 'pdf') {
    // Extract text from PDF text layer for translation
    const textLayerSpans = pageEl.querySelectorAll('.pdf-text-layer span');
    let pdfText = '';
    textLayerSpans.forEach(span => { pdfText += span.textContent + ' '; });
    pdfText = pdfText.trim();
    
    if (!pdfText || pdfText.length < 3) {
      const status = document.getElementById('translate-status');
      if (status) status.textContent = "No extractable text found on this PDF page.";
      return;
    }

    const cacheKey = `${currentBookId}_${bookPageIndex}_${activeTranslationLang}`;
    if (translatedPagesCache[cacheKey]) {
      // Hide original PDF components
      const canvas = pageEl.querySelector('canvas');
      const textLayer = pageEl.querySelector('.pdf-text-layer');
      if (canvas) canvas.style.display = 'none';
      if (textLayer) textLayer.style.display = 'none';

      let replacement = pageEl.querySelector('.pdf-translate-replacement');
      if (!replacement) {
        replacement = document.createElement('div');
        replacement.className = 'pdf-translate-replacement';
        replacement.style.cssText = 'position:absolute; inset:0; width:100%; height:100%; box-sizing:border-box; overflow-y:auto; padding:24px 22px 50px 22px; font-size:1.15rem; line-height:1.82; text-align:justify; color:var(--text-main, #2b2318); font-family:"Playfair Display", Georgia, serif; white-space:pre-wrap; word-wrap:break-word;';
        pageEl.appendChild(replacement);
      }
      replacement.textContent = translatedPagesCache[cacheKey];
      return;
    }

    const statusEl = document.getElementById('translate-status');
    if (statusEl) statusEl.textContent = "Translating PDF page...";
    pageEl.style.opacity = '0.5';

    // Translate using the same chunking logic as text books
    let translatedText = '';
    const MAX_CHUNK = 1200;
    if (pdfText.length <= MAX_CHUNK) {
      const t = await fetchTranslation(pdfText, activeTranslationLang);
      if (t) translatedText = t;
    } else {
      const sentences = pdfText.match(/[^.!?]*[.!?]+[\s]*/g) || [pdfText];
      let currentChunk = '';
      for (const sentence of sentences) {
        if ((currentChunk + sentence).length > MAX_CHUNK && currentChunk.length > 0) {
          const t = await fetchTranslation(currentChunk, activeTranslationLang);
          if (t) translatedText += t + ' ';
          currentChunk = sentence;
        } else {
          currentChunk += sentence;
        }
      }
      if (currentChunk.trim()) {
        const t = await fetchTranslation(currentChunk, activeTranslationLang);
        if (t) translatedText += t;
      }
    }

    pageEl.style.opacity = '1';
    if (statusEl) statusEl.textContent = "";

    if (translatedText) {
      translatedPagesCache[cacheKey] = translatedText;
      
      // Hide original PDF components
      const canvas = pageEl.querySelector('canvas');
      const textLayer = pageEl.querySelector('.pdf-text-layer');
      if (canvas) canvas.style.display = 'none';
      if (textLayer) textLayer.style.display = 'none';

      // Insert replacing translated text
      let replacement = pageEl.querySelector('.pdf-translate-replacement');
      if (!replacement) {
        replacement = document.createElement('div');
        replacement.className = 'pdf-translate-replacement';
        replacement.style.cssText = 'position:absolute; inset:0; width:100%; height:100%; box-sizing:border-box; overflow-y:auto; padding:24px 22px 50px 22px; font-size:1.15rem; line-height:1.82; text-align:justify; color:var(--text-main, #2b2318); font-family:"Playfair Display", Georgia, serif; white-space:pre-wrap; word-wrap:break-word;';
        pageEl.appendChild(replacement);
      }
      replacement.textContent = translatedText;
    } else {
      if (statusEl) statusEl.textContent = "Translation failed (API error).";
    }
    return;
  }

  const cacheKey = `${currentBookId}_${bookPageIndex}_${activeTranslationLang}`;
  if (translatedPagesCache[cacheKey]) {
    if (bookType === 'epub') {
      pageEl.innerHTML = translatedPagesCache[cacheKey];
    } else {
      pageEl.textContent = translatedPagesCache[cacheKey];
    }
    return;
  }

  // Save scroll pos and add loading state
  const originalOpacity = pageEl.style.opacity;
  pageEl.style.opacity = '0.5';
  const statusEl = document.getElementById('translate-status');
  if (statusEl) statusEl.textContent = "Translating page...";

  // Extract raw text for translation
  const textToTranslate = pageEl.innerText || pageEl.textContent;
  let translatedText = '';
  const MAX_CHUNK = 1200; // Safe limit for GET request length

  if (textToTranslate.length <= MAX_CHUNK) {
    const t = await fetchTranslation(textToTranslate, activeTranslationLang);
    if (t) translatedText = t;
  } else {
    const sentences = textToTranslate.match(/[^.!?]*[.!?]+[\s]*/g) || [textToTranslate];
    let currentChunk = '';
    for (const sentence of sentences) {
      if ((currentChunk + sentence).length > MAX_CHUNK && currentChunk.length > 0) {
        const t = await fetchTranslation(currentChunk, activeTranslationLang);
        if (t) translatedText += t + ' ';
        currentChunk = sentence;
      } else {
        currentChunk += sentence;
      }
    }
    if (currentChunk.trim()) {
      const t = await fetchTranslation(currentChunk, activeTranslationLang);
      if (t) translatedText += t;
    }
  }

  pageEl.style.opacity = originalOpacity;
  if (statusEl) statusEl.textContent = "";

  if (translatedText) {
    translatedPagesCache[cacheKey] = translatedText;
    if (bookType === 'epub') {
      pageEl.innerHTML = translatedText.replace(/\n /g, '<br/>');
    } else {
      pageEl.textContent = translatedText;
    }
  } else {
    if (statusEl) statusEl.textContent = "Translation failed (API error).";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // ======== TRANSLATE MODAL EVENTS ========
  const translateBtn = document.getElementById("reader-translate-btn");
  const translateModal = document.getElementById("translate-modal");
  const translateCloseBtn = document.getElementById("translate-modal-close");
  const translateDoBtn = document.getElementById("translate-do-btn");
  const translateRevertBtn = document.getElementById("translate-revert-btn");
  const translateLangSelect = document.getElementById("translate-lang-select");

  translateBtn?.addEventListener("click", () => {
    translateModal?.classList.remove("hidden");
  });

  translateCloseBtn?.addEventListener("click", () => {
    translateModal?.classList.add("hidden");
  });

  translateModal?.addEventListener("click", (e) => {
    if (e.target === translateModal) translateModal.classList.add("hidden");
  });

  translateDoBtn?.addEventListener("click", async () => {
    activeTranslationLang = translateLangSelect.value;
    translateBtn.classList.add('translate-active');
    translateRevertBtn.disabled = false;

    // Stop ongoing TTS immediately before translating
    if (window.speechSynthesis) window.speechSynthesis.cancel();

    const statusEl = document.getElementById('translate-status');
    if (statusEl) statusEl.textContent = "Translating...";

    await applyTranslationToCurrentPage();

    if (statusEl) statusEl.textContent = "Translation applied.";

    // Resume TTS reading the NEW translated text if it was active
    if (window._ttsAutoReadAfterTurn && typeof window._ttsAutoReadAfterTurn === 'function') {
      // A small delay to ensure DOM is updated completely
      setTimeout(window._ttsAutoReadAfterTurn, 200);
    }

    setTimeout(() => { translateModal?.classList.add("hidden"); }, 800);
  });

  translateRevertBtn?.addEventListener("click", () => {
    activeTranslationLang = null;
    translateBtn.classList.remove('translate-active');
    translateRevertBtn.disabled = true;
    const statusEl = document.getElementById('translate-status');
    if (statusEl) statusEl.textContent = "Reverted to original.";

    // Stop any ongoing TTS
    if (window.speechSynthesis) window.speechSynthesis.cancel();

    // Reload current page to original content
    showBookPage(bookPageIndex, 'none');

    setTimeout(() => { translateModal?.classList.add("hidden"); }, 800);
  });
});

// ==================== CUSTOM BOOKS (USER-ADDED) ====================
const customBookEmojis = ['📕', '📗', '📘', '📙', '📓', '📔', '📒', '✏️', '🖊️', '📝', '🗒️', '📑', '🌸', '🌙', '⭐', '🎭', '🦋', '🌿'];

function getCustomBooks() {
  try { return JSON.parse(appStorage.getItem('customBooks') || '[]'); }
  catch { return []; }
}

function saveCustomBook(title, text) {
  const books = getCustomBooks();
  const id = 'custom_' + Date.now();
  const emoji = customBookEmojis[Math.floor(Math.random() * customBookEmojis.length)];
  const book = {
    id,
    title: title.trim(),
    emoji,
    fileType: 'text',
    charCount: text.length,
    addedAt: Date.now()
  };
  books.push(book);
  appStorage.setItem('customBooks', JSON.stringify(books));
  appStorage.setItem(`customBookText_${id}`, text);
  return book;
}

async function saveCustomBookBinary(title, fileType, arrayBuffer) {
  const books = getCustomBooks();
  const id = 'custom_' + Date.now();
  const emoji = fileType === 'pdf' ? '📄' : '📚';
  const book = {
    id,
    title: title.trim(),
    emoji,
    fileType,
    charCount: arrayBuffer.byteLength,
    addedAt: Date.now()
  };
  books.push(book);
  appStorage.setItem('customBooks', JSON.stringify(books));
  await appStorage.setBinaryItem(`customBookBinary_${id}`, arrayBuffer);
  return book;
}

function deleteCustomBook(id) {
  let books = getCustomBooks();
  books = books.filter(b => b.id !== id);
  appStorage.setItem('customBooks', JSON.stringify(books));
  appStorage.removeItem(`customBookText_${id}`);
  appStorage.removeBinaryItem(`customBookBinary_${id}`);
  appStorage.removeItem(`bookmark_${id}`);
  try {
    const allHL = JSON.parse(appStorage.getItem('bookHighlights') || '{}');
    if (allHL[id]) {
      delete allHL[id];
      appStorage.setItem('bookHighlights', JSON.stringify(allHL));
    }
  } catch (e) { }
  try {
    let history = getBookHistory();
    history = history.filter(b => b.id !== id);
    appStorage.setItem('bookHistory', JSON.stringify(history));
  } catch (e) { }
}

// ==================== EPUB PARSER ====================
async function parseEpubFile(arrayBuffer) {
  const zip = await JSZip.loadAsync(arrayBuffer);
  const parser = new DOMParser();

  // 1. Find OPF path from container.xml
  const containerFile = zip.file('META-INF/container.xml');
  if (!containerFile) throw new Error('Invalid EPUB: no container.xml');
  const containerXml = await containerFile.async('text');
  const containerDoc = parser.parseFromString(containerXml, 'application/xml');
  const rootfilePath = containerDoc.querySelector('rootfile')?.getAttribute('full-path');
  if (!rootfilePath) throw new Error('Invalid EPUB: no rootfile');

  // 2. Parse OPF manifest + spine
  const opfFile = zip.file(rootfilePath);
  if (!opfFile) throw new Error('Invalid EPUB: OPF not found');
  const opfText = await opfFile.async('text');
  const opfDoc = parser.parseFromString(opfText, 'application/xml');
  const opfDir = rootfilePath.includes('/') ? rootfilePath.substring(0, rootfilePath.lastIndexOf('/') + 1) : '';

  const manifest = {};
  opfDoc.querySelectorAll('item').forEach(item => {
    manifest[item.getAttribute('id')] = {
      href: item.getAttribute('href'),
      mediaType: item.getAttribute('media-type') || ''
    };
  });

  const spineRefs = [];
  opfDoc.querySelectorAll('itemref').forEach(ref => {
    const idref = ref.getAttribute('idref');
    if (manifest[idref]) spineRefs.push(manifest[idref]);
  });

  // 3. Extract HTML from each spine item
  const chapters = [];
  for (const item of spineRefs) {
    if (!item.mediaType.includes('html') && !item.mediaType.includes('xml')) continue;
    const filePath = opfDir + item.href;
    const file = zip.file(filePath);
    if (!file) continue;
    const html = await file.async('text');
    let doc;
    try { doc = parser.parseFromString(html, 'application/xhtml+xml'); }
    catch { doc = parser.parseFromString(html, 'text/html'); }
    const body = doc.body || doc.querySelector('body');
    if (!body || !body.innerHTML.trim()) continue;

    // Resolve relative image src to blob URLs
    const itemDir = item.href.includes('/') ? item.href.substring(0, item.href.lastIndexOf('/') + 1) : '';
    const imgs = body.querySelectorAll('img');
    for (const img of imgs) {
      const src = img.getAttribute('src');
      if (src && !src.startsWith('data:') && !src.startsWith('http')) {
        const imgPath = opfDir + itemDir + src;
        const imgFile = zip.file(imgPath) || zip.file(decodeURIComponent(imgPath));
        if (imgFile) {
          const blob = await imgFile.async('blob');
          img.setAttribute('src', URL.createObjectURL(blob));
        }
      }
    }
    // Also handle SVG images
    const svgImgs = body.querySelectorAll('image');
    for (const img of svgImgs) {
      const href = img.getAttribute('xlink:href') || img.getAttribute('href');
      if (href && !href.startsWith('data:') && !href.startsWith('http')) {
        const imgPath = opfDir + itemDir + href;
        const imgFile = zip.file(imgPath);
        if (imgFile) {
          const blob = await imgFile.async('blob');
          const url = URL.createObjectURL(blob);
          img.setAttribute('xlink:href', url);
          img.setAttribute('href', url);
        }
      }
    }
    chapters.push(body.innerHTML);
  }
  if (chapters.length === 0) throw new Error('No readable content found in EPUB.');
  return chapters;
}

// ==================== HTML SUB-PAGINATOR (for EPUB) ====================
async function splitHtmlIntoPages(chaptersHtml) {
  const container = document.getElementById('reader-content-container');
  const pageEl = document.getElementById('reader-text');
  if (!container || !pageEl) return;

  const measurer = pageEl.cloneNode(false);
  measurer.id = '';
  measurer.className = 'book-page-display epub-mode';
  measurer.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;left:0;top:0;opacity:0;overflow:visible;height:auto;max-height:none;transform:none;white-space:normal;';
  const tempCS = getComputedStyle(pageEl);
  const padL = parseFloat(tempCS.paddingLeft) || 22;
  const padR = parseFloat(tempCS.paddingRight) || 22;
  const mWidth = (pageEl.offsetWidth || container.clientWidth || 360) - padL - padR;
  measurer.style.width = mWidth + 'px';
  measurer.style.padding = '0';
  measurer.style.fontSize = tempCS.fontSize;
  measurer.style.lineHeight = tempCS.lineHeight || '1.82';
  measurer.style.fontFamily = tempCS.fontFamily;
  measurer.style.boxSizing = 'border-box';
  container.appendChild(measurer);

  const cs = getComputedStyle(pageEl);
  const padT = parseFloat(cs.paddingTop) || 24;
  const padB = parseFloat(cs.paddingBottom) || 50;
  const avail = container.clientHeight - padT - padB;
  if (avail <= 0 || mWidth <= 0) {
    container.removeChild(measurer);
    bookPages = chaptersHtml.length > 0 ? chaptersHtml : ['No content found.'];
    return;
  }

  bookPages = [];
  for (const chapterHtml of chaptersHtml) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = chapterHtml;
    const nodes = Array.from(tempDiv.childNodes);
    if (nodes.length === 0) continue;

    measurer.innerHTML = '';
    let currentNodes = [];

    for (let i = 0; i < nodes.length; i++) {
      const clone = nodes[i].cloneNode(true);
      measurer.appendChild(clone);
      currentNodes.push(clone);

      if (measurer.scrollHeight > avail) {
        if (currentNodes.length > 1) {
          measurer.removeChild(clone);
          currentNodes.pop();
          bookPages.push(measurer.innerHTML);
          measurer.innerHTML = '';
          currentNodes = [];
          const nc = nodes[i].cloneNode(true);
          measurer.appendChild(nc);
          currentNodes.push(nc);
          if (measurer.scrollHeight > avail) {
            bookPages.push(measurer.innerHTML);
            measurer.innerHTML = '';
            currentNodes = [];
          }
        } else {
          bookPages.push(measurer.innerHTML);
          measurer.innerHTML = '';
          currentNodes = [];
        }
      }
      if (i % 50 === 0 && i > 0) await new Promise(r => setTimeout(r, 0));
    }
    if (measurer.innerHTML.trim()) {
      bookPages.push(measurer.innerHTML);
    }
    measurer.innerHTML = '';
  }
  container.removeChild(measurer);
  if (bookPages.length === 0) bookPages = ['This book appears to be empty.'];
}

// ==================== PDF RENDERER ====================
async function renderPdfPage(pageIndex, container) {
  if (!pdfDoc) return;
  const page = await pdfDoc.getPage(pageIndex + 1);
  container.innerHTML = '';

  // Scale to FILL the container width for maximum readability on mobile
  const containerWidth = container.clientWidth - 8; // small padding
  const unscaled = page.getViewport({ scale: 1 });
  const scale = containerWidth / unscaled.width; // fill width, allow vertical scroll
  const viewport = page.getViewport({ scale });

  const wrapper = document.createElement('div');
  wrapper.style.cssText = `position:relative;margin:0 auto;width:${viewport.width}px;height:${viewport.height}px;flex-shrink:0;`;

  // Use devicePixelRatio for crisp rendering on high-DPI mobile screens
  const dpr = window.devicePixelRatio || 1;
  const canvas = document.createElement('canvas');
  canvas.width = Math.floor(viewport.width * dpr);
  canvas.height = Math.floor(viewport.height * dpr);
  canvas.style.width = viewport.width + 'px';
  canvas.style.height = viewport.height + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  await page.render({ canvasContext: ctx, viewport }).promise;
  wrapper.appendChild(canvas);

  // Text layer for selection/highlighting/TTS — coordinates must use the scaled viewport
  try {
    const textContent = await page.getTextContent();
    const textDiv = document.createElement('div');
    textDiv.className = 'pdf-text-layer';
    textDiv.style.cssText = `position:absolute;left:0;top:0;width:${viewport.width}px;height:${viewport.height}px;overflow:hidden;`;
    for (const item of textContent.items) {
      if (!item.str) continue;
      const tx = item.transform;
      // Font size scaled by the viewport scale
      const fontSize = Math.sqrt(tx[2] * tx[2] + tx[3] * tx[3]) * scale;
      // Position scaled by viewport scale
      const left = tx[4] * scale;
      const top = viewport.height - (tx[5] * scale) - fontSize;
      const span = document.createElement('span');
      span.textContent = item.str;
      span.style.cssText = `position:absolute;left:${left}px;top:${top}px;font-size:${fontSize}px;font-family:sans-serif;color:transparent;white-space:pre;`;
      if (item.width) span.style.width = (item.width * scale) + 'px';
      textDiv.appendChild(span);
    }
    wrapper.appendChild(textDiv);
  } catch (e) { console.warn('PDF text layer failed:', e); }

  container.appendChild(wrapper);
}

function renderMyBooks() {
  const grid = document.getElementById('my-books-grid');
  if (!grid) return;

  grid.innerHTML = '';
  const books = getCustomBooks();

  // Render each custom book card
  books.forEach((book, index) => {
    const card = document.createElement('button');
    card.className = 'book-card-premium';
    card.title = book.title;

    // Size/type label
    const ft = book.fileType || 'text';
    let sizeLabel;
    if (ft === 'epub' || ft === 'pdf') {
      const sizeMB = (book.charCount / 1024 / 1024).toFixed(1);
      sizeLabel = `${ft.toUpperCase()} • ${sizeMB} MB`;
    } else {
      const wordCount = Math.round(book.charCount / 5);
      sizeLabel = wordCount > 1000 ? `${(wordCount / 1000).toFixed(1)}k words` : `${wordCount} words`;
    }

    // Gradient cover for custom books
    const emoji = book.emoji || '📕';
    const gradients = [
      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      'linear-gradient(135deg, #f6d365 0%, #fda085 100%)',
      'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)',
      'linear-gradient(135deg, #ff0844 0%, #ffb199 100%)',
      'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
    ];
    const bg = gradients[index % gradients.length];

    card.innerHTML = `
            <div class="book-cover-flat" style="position:relative;">
                <button class="custom-book-delete" data-id="${book.id}" title="Delete this book" 
                        style="position:absolute; top:8px; right:8px; background:rgba(0,0,0,0.4); color:white; border:none; border-radius:50%; width:24px; height:24px; font-size:14px; cursor:pointer; z-index:10; backdrop-filter:blur(4px); display:flex; align-items:center; justify-content:center;">&times;</button>
                <div class="custom-cover-gradient" style="background: ${bg}; width:100%; height:100%; display:flex; align-items:center; justify-content:center; font-size: 3rem;">
                    <span>${emoji}</span>
                </div>
            </div>
            <div class="book-info-block" style="padding-top:0;">
                <div class="book-info-title" title="${book.title}">${book.title}</div>
                <div class="custom-book-size" style="font-size: 0.75rem; color: var(--text-muted); font-weight:600; margin-top:2px;">${sizeLabel}</div>
            </div>
        `;

    // Open in reader on click
    card.addEventListener('click', (e) => {
      if (e.target.classList.contains('custom-book-delete')) return;
      openCustomBook(book.id, book.title, book.emoji);
    });

    // Delete button
    card.querySelector('.custom-book-delete').addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm(`Delete "${book.title}"? This cannot be undone.`)) {
        deleteCustomBook(book.id);
        renderMyBooks();
        renderReadingHistory();
      }
    });

    grid.appendChild(card);
  });

  // Always add the "Add Book" trigger card at the end
  const addCard = document.createElement('div');
  addCard.className = 'custom-book-card add-book-trigger';
  addCard.innerHTML = `<div class="add-icon">＋</div><div>Add Book</div>`;
  addCard.addEventListener('click', () => {
    document.getElementById('add-book-overlay')?.classList.remove('hidden');
    document.getElementById('custom-book-title')?.focus();
  });
  grid.appendChild(addCard);
}

/**
 * Opens a custom (user-added) book in the reader.
 * No network fetch — loads text directly from appStorage.
 */
async function openCustomBook(id, title, emoji) {
  document.getElementById("reader-modal").classList.remove("hidden");
  document.getElementById("reader-book-title").textContent = title;
  document.getElementById("reader-loading").style.display = "flex";
  document.getElementById("reader-text").textContent = "";
  document.getElementById("reader-text").className = 'book-page-display';
  const percentEl = document.getElementById("reader-percent");
  if (percentEl) percentEl.textContent = "PAGE 1";

  currentBookId = id;
  currentBookTitle = title;
  currentBookUrl = '__custom__';
  currentBookCover = '';
  bookPages = [];
  bookPageIndex = 0;
  highlightMode = false;
  pdfDoc = null;
  document.getElementById('reader-modal')?.classList.remove('highlight-mode-active');
  bookHighlights = getBookHighlights(id);

  // Determine file type from metadata
  const books = getCustomBooks();
  const bookMeta = books.find(b => b.id === id);
  const fileType = bookMeta?.fileType || 'text';
  bookType = fileType;

  try {
    if (fileType === 'epub') {
      const arrayBuffer = await appStorage.getBinaryItem(`customBookBinary_${id}`);
      if (!arrayBuffer) throw new Error('EPUB data not found in storage.');
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      const chapters = await parseEpubFile(arrayBuffer);
      await splitHtmlIntoPages(chapters);

    } else if (fileType === 'pdf') {
      const arrayBuffer = await appStorage.getBinaryItem(`customBookBinary_${id}`);
      if (!arrayBuffer) throw new Error('PDF data not found in storage.');
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      pdfDoc = await loadingTask.promise;
      bookPages = Array.from({ length: pdfDoc.numPages }, (_, i) => i);

    } else {
      const text = appStorage.getItem(`customBookText_${id}`);
      if (!text) throw new Error('Book text not found.');
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      await splitTextIntoPages(text);
    }

    document.getElementById("reader-loading").style.display = "none";
    const savedPage = appStorage.getItem(`bookmark_${id}`);
    if (savedPage) {
      bookPageIndex = Math.min(parseInt(savedPage) || 0, bookPages.length - 1);
    }
    await showBookPage(bookPageIndex, 'none');
    saveBookToHistory(id, title, '__custom__', emoji, bookPageIndex, bookPages.length);

    const hint = document.getElementById("reader-swipe-hint");
    if (hint && !appStorage.getItem("reader_hint_shown")) {
      hint.style.display = "block";
      appStorage.setItem("reader_hint_shown", "1");
      setTimeout(() => { hint.style.display = "none"; }, 3500);
    }
  } catch (err) {
    console.error('Book open error:', err);
    document.getElementById("reader-loading").style.display = "none";
    document.getElementById("reader-text").textContent = "Failed to open book: " + err.message;
  }
}
async function searchLibrary() {
  const inputEl = document.getElementById("library-search-input");
  if (!inputEl) return;
  const query = inputEl.value.trim();
  const resultsContainer = document.getElementById("library-results");
  const statusEl = document.getElementById("library-status");

  if (!query) {
    statusEl.innerHTML = "";
    statusEl.style.display = "none";
    return;
  }

  statusEl.innerHTML = "";
  statusEl.style.display = "none";
  // Inject skeleton loader
  const skeletonHTML = Array(8).fill('').map(() => `
        <div class="book-card-premium skeleton-card" style="pointer-events:none; box-shadow:none;">
            <div class="book-cover-flat"></div>
            <div class="book-info-block" style="padding-top:10px;">
                <div class="skeleton-text"></div>
                <div class="skeleton-text short"></div>
            </div>
        </div>
    `).join('');
  resultsContainer.innerHTML = skeletonHTML;

  try {
    const res = await fetch(`https://gutendex.com/books/?search=${encodeURIComponent(query)}`);
    const data = await res.json();

    resultsContainer.innerHTML = "";

    if (data.results.length === 0) {
      statusEl.innerHTML = "No books found. Try another classic like 'Dracula'.";
      statusEl.style.display = "block";
      return;
    }

    statusEl.innerHTML = `Found ${data.count} classic results.`;
    statusEl.style.display = "block";

    data.results.forEach(book => {
      // Extract text URL (prioritize plain text utf-8)
      let textUrl = "";
      if (book.formats["text/plain; charset=utf-8"]) {
        textUrl = book.formats["text/plain; charset=utf-8"];
      } else if (book.formats["text/plain"]) {
        textUrl = book.formats["text/plain"];
      } else if (book.formats["text/html"]) {
        textUrl = book.formats["text/html"];
      }

      if (!textUrl) return; // Skip if no readable format

      const authorName = book.authors[0] ? book.authors[0].name : "Unknown";
      const coverUrl = book.formats["image/jpeg"] || "icon-192.png";

      const card = document.createElement("button");
      card.className = "book-card-premium";
      card.title = book.title;

      card.innerHTML = `
                <div class="book-cover-flat">
                    <img src="${coverUrl}" alt="Cover" loading="lazy">
                </div>
                <div class="book-info-block">
                    <div class="book-info-title">${book.title}</div>
                    <div class="book-info-author">${authorName}</div>
                    <div style="font-size:0.75rem; color:#8b5cf6; padding-top:6px; font-weight:600;">⬇ ${book.download_count.toLocaleString()}</div>
                </div>
             `;

      card.addEventListener("click", () => openReader(book.id, book.title, textUrl, coverUrl));
      resultsContainer.appendChild(card);
    });

  } catch (err) {
    resultsContainer.innerHTML = "";
    statusEl.innerHTML = "Failed to connect to the library. Are you online?";
    statusEl.style.display = "block";
  }
}

let bookPages = [];    // Array of text chunks (one per page)
let bookPageIndex = 0; // Current page
let isAnimating = false;

async function openReader(id, title, url, coverUrl) {
  document.getElementById("reader-modal").classList.remove("hidden");
  document.getElementById("reader-book-title").textContent = title;

  document.getElementById("reader-loading").style.display = "flex";
  document.getElementById("reader-text").textContent = "";
  const percentEl = document.getElementById("reader-percent");
  if (percentEl) percentEl.textContent = "PAGE 1";

  currentBookId = id;
  currentBookTitle = title;
  currentBookUrl = url;
  currentBookCover = coverUrl || 'icon-192.png';
  bookPages = [];
  bookPageIndex = 0;
  highlightMode = false;
  bookType = 'text';
  pdfDoc = null;
  document.getElementById('reader-text').className = 'book-page-display';
  document.getElementById('reader-modal')?.classList.remove('highlight-mode-active');

  // Load highlights for this book
  bookHighlights = getBookHighlights(id);

  try {
    let secureUrl = url.replace("http://", "https://");

    const proxies = [
      `https://api.allorigins.win/get?url=${encodeURIComponent(secureUrl)}`,
      `https://api.allorigins.win/raw?url=${encodeURIComponent(secureUrl)}`,
      `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(secureUrl)}`,
      `https://corsproxy.io/?${encodeURIComponent(secureUrl)}`
    ];

    let text = null;
    for (const proxy of proxies) {
      const controller = new AbortController();
      // Books are large, 8s is too short for a public proxy. Give it 25 seconds.
      const timer = setTimeout(() => controller.abort(), 25000);
      try {
        const res = await fetch(proxy, { signal: controller.signal });

        if (res.ok) {
          if (proxy.includes('/get?url=')) {
            const json = await res.json();
            text = json.contents;
          } else {
            text = await res.text();
          }
          clearTimeout(timer);
          if (text && text.length > 500) break; // Ensure we got a real book text
          text = null;
        } else {
          clearTimeout(timer);
        }
      } catch (e) {
        clearTimeout(timer);
        console.warn("Proxy failed, trying next...", proxy);
      }
    }

    if (!text) {
      throw new Error("All proxies failed.");
    }

    // Clean up the text
    if (url.includes(".html")) {
      const doc = new DOMParser().parseFromString(text, 'text/html');
      text = doc.body.innerText || doc.body.textContent || text;
    }

    // Strip Gutenberg header/footer boilerplate
    const startMarker = text.indexOf('*** START OF');
    if (startMarker !== -1) {
      const afterMarker = text.indexOf('***', startMarker + 12);
      if (afterMarker !== -1) {
        text = text.substring(afterMarker + 3);
      }
    }
    const endMarker = text.indexOf('*** END OF');
    if (endMarker !== -1) {
      text = text.substring(0, endMarker);
    }

    // Clean Gutenberg hard-wrapped lines while preserving true paragraphs
    text = text.replace(/\r\n/g, '\n')
      .replace(/([^\n])\n([^\n])/g, '$1 $2')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    // Split text into pages that fit the screen
    await splitTextIntoPages(text);

    document.getElementById("reader-loading").style.display = "none";

    // Restore bookmark from appStorage (migrate old localStorage bookmarks)
    let savedPage = appStorage.getItem(`bookmark_${id}`);
    if (!savedPage) {
      // Check old localStorage bookmark and migrate
      savedPage = localStorage.getItem(`bookmark_${id}`);
      if (savedPage) {
        appStorage.setItem(`bookmark_${id}`, savedPage);
        localStorage.removeItem(`bookmark_${id}`);
      }
    }
    if (savedPage) {
      bookPageIndex = Math.min(parseInt(savedPage) || 0, bookPages.length - 1);
    }

    showBookPage(bookPageIndex, 'none');

    // Save to reading history
    saveBookToHistory(id, title, url, currentBookCover, bookPageIndex, bookPages.length);

    // Show swipe hint on first open
    const hint = document.getElementById("reader-swipe-hint");
    if (hint && !appStorage.getItem("reader_hint_shown")) {
      hint.style.display = "block";
      appStorage.setItem("reader_hint_shown", "1");
      setTimeout(() => { hint.style.display = "none"; }, 3500);
    }

  } catch (err) {
    console.error("Book load error:", err);
    document.getElementById("reader-loading").style.display = "none";
    document.getElementById("reader-text").textContent = "Failed to load book. This may be caused by a network issue or the text source being temporarily unavailable.\n\nPlease check your internet connection and try again.";
  }
}

/**
 * Splits the full book text into page-sized chunks using real DOM
 * measurement. Creates a hidden clone of the reader element, renders
 * lines into it, and checks scrollHeight to know exactly when a page
 * is full — giving pixel-accurate pagination on any screen/font.
 */
async function splitTextIntoPages(fullText) {
  const container = document.getElementById("reader-content-container");
  const pageEl = document.getElementById("reader-text");
  if (!container || !pageEl) return;

  const measurer = pageEl.cloneNode(false);
  measurer.id = '';
  measurer.style.position = 'absolute';
  measurer.style.visibility = 'hidden';
  measurer.style.pointerEvents = 'none';
  measurer.style.left = '0';
  measurer.style.top = '0';
  measurer.style.bottom = 'auto';
  measurer.style.right = 'auto';
  const tempCS = getComputedStyle(pageEl);
  const padLeft = parseFloat(tempCS.paddingLeft) || 22;
  const padRight = parseFloat(tempCS.paddingRight) || 22;
  const measuredWidth = (pageEl.offsetWidth || container.clientWidth || 360) - padLeft - padRight;
  measurer.style.width = measuredWidth + 'px';
  measurer.style.height = 'auto';
  measurer.style.maxHeight = 'none';
  measurer.style.overflow = 'visible';
  measurer.style.transform = 'none';
  measurer.style.opacity = '0';
  const csBeforeMeasure = getComputedStyle(pageEl);
  measurer.style.fontSize = csBeforeMeasure.fontSize;
  measurer.style.lineHeight = csBeforeMeasure.lineHeight || '1.82';
  measurer.style.padding = '0';
  measurer.style.fontFamily = csBeforeMeasure.fontFamily;
  measurer.style.whiteSpace = csBeforeMeasure.whiteSpace || 'pre-wrap';
  measurer.style.wordWrap = csBeforeMeasure.wordWrap || 'break-word';
  measurer.style.hyphens = csBeforeMeasure.hyphens || 'auto';
  measurer.style.textAlign = csBeforeMeasure.textAlign || 'justify';
  measurer.style.boxSizing = 'border-box';
  container.appendChild(measurer);

  const cs = getComputedStyle(pageEl);
  const padTop = parseFloat(cs.paddingTop) || 24;
  const padBot = parseFloat(cs.paddingBottom) || 50;
  const availableHeight = container.clientHeight - padTop - padBot;

  // Failsafe if div is completely hidden (prevents infinite loop freezing)
  if (availableHeight <= 0 || measuredWidth <= 0) {
    container.removeChild(measurer);
    bookPages = [fullText];
    return;
  }

  bookPages = [];

  // Estimate chars per page to provide a fast initial bounds for binary search
  const fontSize = parseFloat(cs.fontSize) || 16;
  const lineHeight = parseFloat(cs.lineHeight) || (fontSize * 1.6);
  const charsPerLineEstimate = Math.max(10, Math.floor(pageEl.offsetWidth / (fontSize * 0.55)));
  const linesPerPageEstimate = Math.max(5, Math.floor(availableHeight / lineHeight));
  const charsPerPageEstimate = charsPerLineEstimate * linesPerPageEstimate;

  let startIndex = 0;
  const totalLength = fullText.length;

  // Ultrafast Binary Search Paginator
  let failsafeCounter = 0;
  while (startIndex < totalLength) {
    if (failsafeCounter++ > 50000) {
      console.error("Pagination loop forced to exit to prevent browser hang");
      break;
    }

    let low = startIndex + 1;
    let high = Math.min(startIndex + Math.floor(charsPerPageEstimate * 1.5), totalLength);

    // Find upper bound that exceeds availableHeight
    measurer.textContent = fullText.substring(startIndex, high);
    let upperFailsafe = 0;
    while (measurer.scrollHeight <= availableHeight && high < totalLength) {
      if (upperFailsafe++ > 2000) break;
      low = high;
      high = Math.min(high + charsPerPageEstimate, totalLength);
      measurer.textContent = fullText.substring(startIndex, high);
    }

    let bestEnd = low;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      measurer.textContent = fullText.substring(startIndex, mid);
      if (measurer.scrollHeight <= availableHeight) {
        bestEnd = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    // Backtrack to the nearest space or newline to avoid slicing through a word
    if (bestEnd < totalLength) {
      const lastSpace = fullText.lastIndexOf(' ', bestEnd);
      const lastNewline = fullText.lastIndexOf('\n', bestEnd);
      const cutPoint = Math.max(lastSpace, lastNewline);

      // Only cut if we actually found a space within this page chunk
      if (cutPoint > startIndex) {
        bestEnd = cutPoint;
      }
    }

    const pageText = fullText.substring(startIndex, bestEnd).trim();
    bookPages.push(pageText || " ");

    // Skip the cutting character, avoid infinite loops on weird strings
    startIndex = bestEnd + 1;
    if (startIndex <= bestEnd) startIndex = bestEnd + 1;

    // Yield to main thread every 15 pages to keep the UI from freezing
    if (bookPages.length % 15 === 0) {
      await new Promise(r => setTimeout(r, 0));
    }
  }

  container.removeChild(measurer);

  if (bookPages.length === 0) {
    bookPages = [fullText || "This book appears to be empty."];
  }
}

/**
 * Displays a specific page with optional fold animation.
 * direction: 'next', 'prev', or 'none'
 */
async function showBookPage(index, direction) {
  const pageEl = document.getElementById("reader-text");
  if (!pageEl || index < 0 || index >= bookPages.length) return;

  async function renderPageContent() {
    if (bookType === 'epub') {
      pageEl.className = 'book-page-display epub-mode';
      pageEl.innerHTML = bookPages[index];
    } else if (bookType === 'pdf') {
      pageEl.className = 'book-page-display pdf-mode';
      await renderPdfPage(index, pageEl);
    } else {
      pageEl.className = 'book-page-display';
      pageEl.textContent = bookPages[index];
    }
    pageEl.scrollTop = 0;
  }

  if (direction === 'none') {
    pageEl.style.transition = 'none';
    pageEl.style.transform = 'rotateY(0deg)';
    pageEl.style.opacity = '1';
    await renderPageContent();
    updateReaderProgress();
    await applyTranslationToCurrentPage();
    return;
  }

  isAnimating = true;

  // Phase 1: Fold the current page away
  pageEl.style.transition = 'transform 0.25s ease-in, opacity 0.25s ease-in';
  pageEl.style.transform = direction === 'next' ? 'rotateY(-85deg)' : 'rotateY(85deg)';
  pageEl.style.opacity = '0';

  await new Promise(r => setTimeout(r, 260));

  // Phase 2: Swap content while hidden
  await renderPageContent();

  // Position the new page on the opposite side
  pageEl.style.transition = 'none';
  pageEl.style.transform = direction === 'next' ? 'rotateY(85deg)' : 'rotateY(-85deg)';
  void pageEl.offsetHeight;

  // Phase 3: Fold the new page in
  pageEl.style.transition = 'transform 0.3s ease-out, opacity 0.3s ease-out';
  pageEl.style.transform = 'rotateY(0deg)';
  pageEl.style.opacity = '1';

  updateReaderProgress();
  setTimeout(async () => {
    isAnimating = false;
    await applyTranslationToCurrentPage();
    // TTS hook: auto-read current page if TTS is active
    if (window._ttsAutoReadAfterTurn && typeof window._ttsAutoReadAfterTurn === 'function') {
      window._ttsAutoReadAfterTurn();
    }
  }, 320);
}

function goNextPage() {
  if (isAnimating || bookPageIndex >= bookPages.length - 1) return;
  bookPageIndex++;
  showBookPage(bookPageIndex, 'next');
}

function goPrevPage() {
  if (isAnimating || bookPageIndex <= 0) return;
  bookPageIndex--;
  showBookPage(bookPageIndex, 'prev');
}

function updateReaderProgress() {
  const percentEl = document.getElementById("reader-percent");
  if (!percentEl) return;

  const total = bookPages.length || 1;
  const current = bookPageIndex + 1;
  percentEl.textContent = `PAGE ${current} OF ${total}`;

  if (currentBookId) {
    // Record that we read a page today for the vitality score!
    appStorage.setItem("lastPageReadDate", new Date().toDateString());
    if (typeof updateBloomWidgets === 'function') setTimeout(updateBloomWidgets, 50);
    if (typeof tryVitalityStreak === 'function') setTimeout(tryVitalityStreak, 100);

    // Save bookmark to appStorage
    appStorage.setItem(`bookmark_${currentBookId}`, bookPageIndex.toString());
    // Update reading history with current position
    saveBookToHistory(currentBookId, currentBookTitle, currentBookUrl, currentBookCover, bookPageIndex, total);

    // Detect book completion — user reached the last page
    if (current === total && total > 1) {
      const alreadyFinished = getFinishedBooks().some(b => String(b.id) === String(currentBookId));
      if (!alreadyFinished) {
        addFinishedBook(currentBookId, currentBookTitle, currentBookUrl, currentBookCover);
        renderFinishedBooks();
        if (typeof showNotification === 'function') {
          showNotification(`🏆 Congratulations! You finished reading "${currentBookTitle}"!`);
        }
      }
    }
  }

  // Apply highlights after text is set
  applyHighlightsToPage(bookPageIndex);
}

// ==================== EVENT LISTENERS ====================
document.addEventListener("DOMContentLoaded", function () {

  // ======== LIBRARY EVENTS ========
  document.getElementById("library-search-btn")?.addEventListener("click", searchLibrary);
  let librarySearchTimeout;
  document.getElementById("library-search-input")?.addEventListener("input", (e) => {
    const val = e.target.value.trim();

    const recs = document.getElementById("library-recommendations");
    const hist = document.getElementById("reading-history-section");
    const myBooks = document.getElementById("my-books-section");
    const results = document.getElementById("library-results");
    const status = document.getElementById("library-status");

    if (val.length > 0) {
      if (recs) recs.style.display = 'none';
      if (hist) hist.style.display = 'none';
      if (myBooks) myBooks.style.display = 'none';

      // Live dynamic search while typing (debounce)
      clearTimeout(librarySearchTimeout);
      librarySearchTimeout = setTimeout(() => {
        searchLibrary();
      }, 600);
    } else {
      clearTimeout(librarySearchTimeout);
      if (recs) recs.style.display = 'block';
      if (hist && hist.querySelector('#reading-history-list').children.length > 0) hist.style.display = 'block';
      if (myBooks) myBooks.style.display = 'block';
      if (results) results.innerHTML = '';
      if (status) status.innerHTML = '';
    }
  });
  document.getElementById("closeLibrary")?.addEventListener("click", () => {
    const mainBtn = document.querySelector('.nav-btn[data-page="main"]');
    if (mainBtn) mainBtn.click();
  });

  document.getElementById("reader-close-btn")?.addEventListener("click", () => {
    document.getElementById("reader-modal").classList.add("hidden");
    highlightMode = false;
    document.getElementById('reader-modal')?.classList.remove('highlight-mode-active');

    // Stop translation mode on close
    activeTranslationLang = null;
    document.getElementById('reader-translate-btn')?.classList.remove('translate-active');

    // Refresh reading history in case library page is visible behind
    renderReadingHistory();
  });

  const readerText = document.getElementById("reader-text");

  // Font size changes re-paginate the entire book
  async function rePaginateBook() {
    if (bookPages.length === 0 || bookType === 'pdf') return; // PDF pages are fixed
    if (bookType === 'epub') {
      const allHtml = [...bookPages]; // pages are already HTML chunks
      await splitHtmlIntoPages(allHtml);
    } else {
      const fullText = bookPages.join('\n');
      await splitTextIntoPages(fullText);
    }
    bookPageIndex = Math.min(bookPageIndex, bookPages.length - 1);
    await showBookPage(bookPageIndex, 'none');
  }

  // Tap zones → fold page turn
  document.getElementById("reader-prev-zone")?.addEventListener("click", () => {
    if (typeof highlightMode !== "undefined" && highlightMode) return;
    goPrevPage();
  });
  document.getElementById("reader-next-zone")?.addEventListener("click", () => {
    if (typeof highlightMode !== "undefined" && highlightMode) return;
    goNextPage();
  });

  // Swipe gesture support for mobile
  let touchStartX = 0;
  const stage = document.getElementById("reader-content-container");
  stage?.addEventListener("touchstart", (e) => {
    touchStartX = e.changedTouches[0].clientX;
  }, { passive: true });
  stage?.addEventListener("touchend", (e) => {
    if (typeof highlightMode !== "undefined" && highlightMode) return; // Prevent swipe if highlighting
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) { // Minimum swipe distance
      if (diff > 0) goNextPage(); else goPrevPage();
    }
  }, { passive: true });

  // Re-paginate book when screen rotates or resizes (debounced)
  let readerResizeTimer = null;
  window.addEventListener("resize", () => {
    if (bookPages.length === 0) return;
    clearTimeout(readerResizeTimer);
    readerResizeTimer = setTimeout(rePaginateBook, 300);
  });

  // ======== HIGHLIGHTER EVENTS ========
  let lastValidSelectionRange = null;

  // Constantly track the latest valid text selection in the background 
  // (solves the issue of mobile text selections "evaporating" when natives menus close)
  document.addEventListener('selectionchange', () => {
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed && sel.rangeCount > 0) {
      lastValidSelectionRange = sel.getRangeAt(0).cloneRange();
    }
  });

  const hlBtn = document.getElementById('reader-highlight-btn');
  if (hlBtn) {
    // CRITICAL FIX: The Ghost Memory system passes the range natively, skipping volatile window.getSelection() bugs!
    const handleHlBtnTouch = (e) => {
      // If we have a ghost selection stored in memory, save it directly without toggling modes!
      if (lastValidSelectionRange) {
        handleTextSelection(lastValidSelectionRange);
        if (typeof showNotification === 'function') showNotification('✨ Highlight saved!');
        
        // Clean up text selection
        const sel = window.getSelection();
        if (sel) sel.removeAllRanges();
        lastValidSelectionRange = null; 
        return; 
      }

      // Otherwise, assume they tapped to toggle the visible mode instructions
      highlightMode = !highlightMode;
      const modal = document.getElementById('reader-modal');
      if (highlightMode) {
        modal?.classList.add('highlight-mode-active');
        if (typeof showNotification === 'function') showNotification('🖍️ Highlight mode ON — select text natively with handles, then tap this 🖍️ button to save!');
      } else {
        modal?.classList.remove('highlight-mode-active');
      }
    };

    // The Ghost Memory system means we no longer need to violently block native touchstart routines,
    // thereby allowing the smartphone to naturally register the tap, fire the :active CSS, and trigger a clean click!
    hlBtn.addEventListener('click', handleHlBtnTouch);
  }

  // (Aggressive 'mouseup' and 'touchend' auto-capture listeners removed for frictionless native mobile dragging UX)

  // Render books and history on startup
  renderRecommendations();
  renderReadingHistory();
  renderFinishedBooks();
  renderMyBooks();

  // ======== PREMIUM LIBRARY & MANAGE EVENTS ========
  let currentManageTab = 'history';

  // Toggle dropdown
  document.getElementById('librarySettingsBtn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('librarySettingsMenu')?.classList.toggle('hidden');
  });
  document.addEventListener('click', () => {
    document.getElementById('librarySettingsMenu')?.classList.add('hidden');
  });

  // Toggle View
  document.getElementById('libSet-viewToggle')?.addEventListener('click', () => {
    const grid = document.getElementById('library-results');
    if (grid) {
      grid.classList.toggle('list-view');
      appStorage.setItem('libraryListView', grid.classList.contains('list-view') ? '1' : '0');
    }
  });
  // Restore View
  if (appStorage.getItem('libraryListView') === '1') {
    document.getElementById('library-results')?.classList.add('list-view');
  }

  // Open Manage Modal
  document.getElementById('libSet-manage')?.addEventListener('click', () => {
    document.getElementById('manage-library-overlay')?.classList.remove('hidden');
    renderManageLibrary();
  });
  // Close Manage Modal
  document.getElementById('manage-lib-close')?.addEventListener('click', () => {
    document.getElementById('manage-library-overlay')?.classList.add('hidden');
  });

  // Tab Switching
  document.querySelectorAll('.manage-tab').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.manage-tab').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      currentManageTab = e.target.getAttribute('data-tab');
      document.getElementById('manage-selectAll').checked = false;
      renderManageLibrary();
    });
  });

  // Select All Checkbox
  document.getElementById('manage-selectAll')?.addEventListener('change', (e) => {
    const isChecked = e.target.checked;
    document.querySelectorAll('.manage-checkbox').forEach(cb => cb.checked = isChecked);
  });

  // Delete Selected
  document.getElementById('manage-delete-btn')?.addEventListener('click', () => {
    processManageLibraryDeletes();
  });

  function renderManageLibrary() {
    const container = document.getElementById('manage-list-container');
    if (!container) return;
    container.innerHTML = '';

    let items = [];
    if (currentManageTab === 'history') {
      const history = getBookHistory();
      items = history.map(b => ({
        id: b.id, title: b.title, sub: `Page ${b.pageIndex + 1} of ${b.totalPages}`,
        img: b.url === '__custom__' ? null : `url('${b.coverUrl || 'icon-192.png'}')`,
        emoji: b.url === '__custom__' ? (b.coverUrl || '📕') : null
      }));
    } else if (currentManageTab === 'highlights') {
      try {
        const allHL = JSON.parse(appStorage.getItem('bookHighlights') || '{}');
        for (const [bookId, pages] of Object.entries(allHL)) {
          let totalHls = 0;
          for (const pg of Object.values(pages)) totalHls += pg.length;
          if (totalHls > 0) items.push({ id: bookId, title: "Book ID: " + bookId, sub: `${totalHls} active highlights`, emoji: '🖍️' });
        }
      } catch (e) { }
    } else if (currentManageTab === 'custom') {
      const custom = getCustomBooks();
      items = custom.map(b => ({
        id: b.id, title: b.title, sub: `${Math.round(b.charCount / 5)} total words`, emoji: b.emoji || '📕'
      }));
    } else if (currentManageTab === 'finished') {
      const finished = getFinishedBooks();
      items = finished.map(b => ({
        id: b.id, title: b.title, 
        sub: `Finished ${new Date(b.finishedAt).toLocaleDateString()}`,
        img: b.url === '__custom__' ? null : `url('${b.coverUrl || 'icon-192.png'}')`,
        emoji: b.url === '__custom__' ? (b.coverUrl || '🏆') : null
      }));
    }

    if (items.length === 0) {
      container.innerHTML = `<div style="padding:30px; text-align:center; color:var(--text-muted);">No items found in this section.</div>`;
      return;
    }

    items.forEach(it => {
      const lbl = document.createElement('label');
      lbl.className = 'manage-item';
      const visual = it.emoji ? `<div class="manage-item-img">${it.emoji}</div>`
        : `<div class="manage-item-img" style="background-image:${it.img}; background-size:cover; background-position:center;"></div>`;

      lbl.innerHTML = `
              <input type="checkbox" class="manage-checkbox" value="${it.id}">
              ${visual}
              <div class="manage-item-info">
                  <div class="manage-item-title">${it.title}</div>
                  <div class="manage-item-sub">${it.sub}</div>
              </div>
          `;
      // Update "Select All" state if manually unchecking items
      lbl.querySelector('.manage-checkbox').addEventListener('change', () => {
        const allCbs = document.querySelectorAll('.manage-checkbox');
        const checkedCbs = document.querySelectorAll('.manage-checkbox:checked');
        document.getElementById('manage-selectAll').checked = (allCbs.length > 0 && allCbs.length === checkedCbs.length);
      });
      container.appendChild(lbl);
    });
  }

  function processManageLibraryDeletes() {
    const checkboxes = document.querySelectorAll('.manage-checkbox:checked');
    if (checkboxes.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${checkboxes.length} item(s)?`)) return;

    const idsToDelete = Array.from(checkboxes).map(cb => cb.value);

    if (currentManageTab === 'history') {
      let history = getBookHistory();
      history = history.filter(b => !idsToDelete.includes(String(b.id)));
      appStorage.setItem('bookHistory', JSON.stringify(history));
    } else if (currentManageTab === 'highlights') {
      try {
        const allHL = JSON.parse(appStorage.getItem('bookHighlights') || '{}');
        idsToDelete.forEach(id => delete allHL[id]);
        appStorage.setItem('bookHighlights', JSON.stringify(allHL));
        bookHighlights = getBookHighlights(currentBookId);
      } catch (e) { }
    } else if (currentManageTab === 'custom') {
      idsToDelete.forEach(id => deleteCustomBook(id));
    } else if (currentManageTab === 'finished') {
      removeFinishedBooks(idsToDelete);
    }

    document.getElementById('manage-selectAll').checked = false;
    renderManageLibrary();
    renderReadingHistory();
    renderFinishedBooks();
    renderMyBooks();
  }

  // ======== CUSTOM BOOK EVENTS ========
  document.getElementById('add-book-close-btn')?.addEventListener('click', () => {
    document.getElementById('add-book-overlay')?.classList.add('hidden');
  });
  document.getElementById('custom-book-cancel')?.addEventListener('click', () => {
    document.getElementById('add-book-overlay')?.classList.add('hidden');
  });

  document.getElementById('custom-book-file')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    document.getElementById('custom-book-filename').textContent = file.name;

    const ext = file.name.split('.').pop().toLowerCase();
    const textarea = document.getElementById('custom-book-text');
    const badge = document.getElementById('binary-file-badge');

    // Auto-fill title from filename
    if (!document.getElementById('custom-book-title').value) {
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
      document.getElementById('custom-book-title').value = nameWithoutExt;
    }

    if (ext === 'epub' || ext === 'pdf') {
      // Binary file — read as ArrayBuffer
      const reader = new FileReader();
      reader.onload = (ev) => {
        pendingBinaryFile = { arrayBuffer: ev.target.result, type: ext, name: file.name };
        // Hide textarea, show badge
        if (textarea) textarea.style.display = 'none';
        if (badge) {
          badge.style.display = 'block';
          document.getElementById('binary-file-icon').textContent = ext === 'pdf' ? '📄' : '📚';
          document.getElementById('binary-file-name').textContent = file.name;
          const sizeMB = (file.size / 1024 / 1024).toFixed(1);
          document.getElementById('binary-file-size').textContent = `${ext.toUpperCase()} • ${sizeMB} MB`;
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      // Text file — current behavior
      pendingBinaryFile = null;
      if (textarea) textarea.style.display = '';
      if (badge) badge.style.display = 'none';
      const reader = new FileReader();
      reader.onload = (ev) => {
        document.getElementById('custom-book-text').value = ev.target.result;
      };
      reader.readAsText(file);
    }
  });

  document.getElementById('custom-book-save')?.addEventListener('click', async () => {
    const title = document.getElementById('custom-book-title').value.trim();

    if (!title) {
      alert('Please enter a book title.');
      return;
    }

    if (pendingBinaryFile) {
      // Save EPUB/PDF binary
      await saveCustomBookBinary(title, pendingBinaryFile.type, pendingBinaryFile.arrayBuffer);
      pendingBinaryFile = null;
    } else {
      const text = document.getElementById('custom-book-text').value.trim();
      if (!text) {
        alert('Please provide the book text.');
        return;
      }
      saveCustomBook(title, text);
    }

    document.getElementById('add-book-overlay').classList.add('hidden');

    // Clear inputs
    document.getElementById('custom-book-title').value = '';
    document.getElementById('custom-book-text').value = '';
    document.getElementById('custom-book-text').style.display = '';
    document.getElementById('custom-book-filename').textContent = '';
    document.getElementById('custom-book-file').value = '';
    const badge = document.getElementById('binary-file-badge');
    if (badge) badge.style.display = 'none';

    renderMyBooks();
    if (typeof showNotification === 'function') showNotification('Book added successfully!');
  });

  // Journal
  document.getElementById("newJournal").addEventListener("click", () => openJournalEditor());
  document.getElementById("saveJournal").addEventListener("click", saveJournalEntry);
  document.getElementById("cancelJournal").addEventListener("click", closeJournalEditor);
  document.getElementById("deleteJournal").addEventListener("click", deleteJournalEntry);

  // Journal Creative Listeners
  document.getElementById("get-prompt-btn")?.addEventListener("click", getCreativePrompt);
  document.getElementById("journal-search")?.addEventListener("input", () => loadJournalEntries());
  document.getElementById("journal-date-filter")?.addEventListener("change", () => loadJournalEntries());

  document.getElementById("toggle-doodle-btn")?.addEventListener("click", () => {
    const area = document.getElementById("journal-drawing-area");
    if (area) {
      area.classList.toggle("active");
      if (area.classList.contains("active") && !canvas) {
        initJournalCanvas();
      }
    }
  });
  document.getElementById("clear-doodle-btn")?.addEventListener("click", clearDoodleCanvas);

  document.getElementById("journal-paper-style")?.addEventListener("change", (e) => {
    const contentDiv = document.getElementById("journal-content");
    const target = /** @type {HTMLSelectElement} */ (e.target);
    if (contentDiv) {
      contentDiv.className = "journal-rich-content"; // Reset
      if (target.value) contentDiv.classList.add(target.value);
    }
  });

  // Editor formatting bounds (so it doesn't leak out of contenteditable)
  document.getElementById("journal-content")?.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      document.execCommand('insertLineBreak');
      e.preventDefault();
    }
  });

  document.getElementById("journal-content")?.addEventListener("keyup", updateFormatButtons);
  document.getElementById("journal-content")?.addEventListener("mouseup", updateFormatButtons);
  document.getElementById("journal-content")?.addEventListener("click", updateFormatButtons);

  document.addEventListener("click", (e) => {
    const target = /** @type {HTMLElement} */ (e.target);
    if (target.classList.contains("journal-edit-btn")) {
      const index = parseInt(target.getAttribute("data-index") || "0");
      const entries = getJournalEntries();
      openJournalEditor(entries[index], index);
    }
    if (target.classList.contains("journal-delete-btn")) {
      const index = parseInt(target.getAttribute("data-index") || "0");
      if (confirm("Delete this entry?")) {
        const entries = getJournalEntries();
        entries.splice(index, 1);
        saveJournalEntries(entries);
        loadJournalEntries();
      }
    }
  });

  // Water
  document.getElementById("set-water-goal").addEventListener("click", setWaterGoal);
  document.querySelectorAll(".water-add-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const amount = parseInt(btn.getAttribute("data-amount"));
      addWater(amount);
    });
  });
  document.getElementById("undo-water-btn")?.addEventListener("click", undoLastWater);
  document.getElementById("add-custom-water-btn")?.addEventListener("click", () => {
    const input = /** @type {HTMLInputElement} */ (document.getElementById("water-custom-amount"));
    const amount = parseInt(input?.value);
    if (amount > 0) {
      addWater(amount);
      input.value = "";
    }
  });

  // Pomodoro
  document.getElementById("start-pomodoro").addEventListener("click", startPomodoro);
  document.getElementById("pause-pomodoro").addEventListener("click", pausePomodoro);
  document.getElementById("reset-pomodoro").addEventListener("click", resetPomodoro);

  // Timer type selector
  document.querySelectorAll('.timer-type-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      const type = this.getAttribute('data-type');
      if (type) switchTimerType(type);
    });
  });

  // Reset buttons and Menu
  const menuBtn = document.getElementById("taskMenuBtn");
  const menuDropdown = document.getElementById("menuDropdown");

  if (menuBtn && menuDropdown) {
    menuBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      menuDropdown.classList.toggle("hidden");
    });

    document.getElementById("resetApp")?.addEventListener("click", resetEverything);
    document.getElementById("selectionModeBtn")?.addEventListener("click", () => entrySelectionMode());
    document.getElementById("focusTaskMenuBtn")?.addEventListener("click", () => openFocusModal());
  }

  // Selection Mode Listeners
  document.getElementById("cancelSelection")?.addEventListener("click", exitSelectionMode);
  document.getElementById("deleteSelected")?.addEventListener("click", deleteSelectedTasks);

  document.getElementById("deleteAllStreak")?.addEventListener("click", resetEverything);

  // Close menu when clicking outside
  document.addEventListener("click", (e) => {
    if (menuBtn && menuDropdown) {
      const target = e.target;
      if (target instanceof Element) {
        if (!menuBtn.contains(target) && !menuDropdown.contains(target)) {
          menuDropdown.classList.add("hidden");
        }
      }
    }
  });

  runNotificationSetupIfNeeded();

  updateWaterDisplay();

  // Set up periodic checks
  setInterval(checkWaterNotifications, 3 * 60 * 60 * 1000);
  setInterval(checkTaskReminders, 3 * 60 * 60 * 1000);

  // Daily checks for notifications (runs every minute to catch the precise time)
  check10AMNotifications();
  check5PMNotifications();

  // Schedule true background triggers for when the app is fully closed (Android only)
  scheduleNext10AMNotification();
  scheduleNext5PMNotification();

  setInterval(() => {
    check10AMNotifications();
    check5PMNotifications();
    scheduleNext10AMNotification(); // Refresh scheduled targets
    scheduleNext5PMNotification();
  }, 60000);

  // Check daily streak on load
  checkDailyStreak();
});

// ==================== DAILY FOCUS MODAL LOGIC ====================
function openFocusModal() {
  const overlay = document.getElementById("focus-modal-overlay");
  const select = /** @type {HTMLSelectElement} */ (document.getElementById("modal-focus-select"));
  if (!overlay || !select) return;

  const savedFocus = appStorage.getItem("dailyFocus");
  select.innerHTML = '<option value="">Select a task...</option>';

  const items = Array.from(taskContainer.querySelectorAll("li"));
  items.forEach(li => {
    const cb = /** @type {HTMLInputElement} */ (li.querySelector("input[type='checkbox']:not(.task-select-cb)"));
    const span = li.querySelector("span:not(.task-emoji):not(.task-tag)");
    const emojiBadge = li.querySelector(".task-emoji");

    if (span && cb && !cb.checked) {
      const text = span.textContent || "";
      const emoji = emojiBadge ? emojiBadge.textContent : "✅";
      const option = document.createElement("option");
      option.value = text;
      option.textContent = `${emoji} ${text}`;
      if (text === savedFocus) option.selected = true;
      select.appendChild(option);
    }
  });

  overlay.classList.remove("hidden");
  document.getElementById("menuDropdown")?.classList.add("hidden");
}

function closeFocusModal() {
  document.getElementById("focus-modal-overlay")?.classList.add("hidden");
}

function applyFocusModal() {
  const select = /** @type {HTMLSelectElement} */ (document.getElementById("modal-focus-select"));
  if (select && select.value) {
    appStorage.setItem("dailyFocus", select.value);
    saveState();
    updateDailyFocusHighlights();
    showNotification("🎯 Focus task highlighted!");
  } else {
    // If they hit apply with nothing selected, treat it as clear
    clearFocusModal();
    return;
  }
  closeFocusModal();
}

function clearFocusModal() {
  appStorage.removeItem("dailyFocus");
  saveState();
  updateDailyFocusHighlights();
  showNotification("🎯 Focus cleared.");
  closeFocusModal();
}

document.getElementById("modal-focus-cancel")?.addEventListener("click", closeFocusModal);
document.getElementById("modal-focus-apply")?.addEventListener("click", applyFocusModal);
document.getElementById("modal-focus-clear")?.addEventListener("click", clearFocusModal);


// ==================== SELECTION LOGIC ====================
function entrySelectionMode() {
  isSelectionMode = true;
  document.getElementById("menuDropdown")?.classList.add("hidden");
  document.getElementById("selection-controls")?.classList.remove("hidden");
  document.getElementById("main")?.classList.add("selection-mode");
  updateSelectedCount();
}

function exitSelectionMode() {
  isSelectionMode = false;
  document.getElementById("selection-controls")?.classList.add("hidden");
  document.getElementById("main")?.classList.remove("selection-mode");

  // Uncheck all selection checkboxes
  const checkboxes = document.querySelectorAll(".task-select-cb");
  checkboxes.forEach(cb => {
    if (cb instanceof HTMLInputElement) cb.checked = false;
  });
}

function updateSelectedCount() {
  const checkboxes = document.querySelectorAll(".task-select-cb:checked");
  const countSpan = document.getElementById("selectedCount");
  if (countSpan) countSpan.textContent = checkboxes.length.toString();

  const deleteBtn = document.getElementById("deleteSelected");
  if (deleteBtn instanceof HTMLButtonElement) {
    deleteBtn.disabled = checkboxes.length === 0;
  }
}

function deleteSelectedTasks() {
  const checkboxes = document.querySelectorAll(".task-select-cb:checked");
  if (checkboxes.length === 0) return;

  if (!confirm(`Are you sure you want to delete ${checkboxes.length} selected tasks?`)) return;

  checkboxes.forEach(cb => {
    const li = cb.closest("li");
    if (li) {
      li.classList.add("task-removing");
      setTimeout(() => {
        li.remove();
        allchecked();
        saveState();
      }, 400);
    }
  });

  setTimeout(exitSelectionMode, 500);
}

function resetEverything() {
  if (!confirm("Are you sure you want to reset everything? This will delete all tasks, streaks, and data!")) {
    return;
  }
  appStorage.clear();
  count = 0;
  waterConsumed = 0;
  waterGoal = 2000;
  taskContainer.innerHTML = "";
  all.textContent = "";
  if (streak) streak.innerText = "";
  taskInput.value = "";
  allchecked();
  updateWaterDisplay();
  if (document.getElementById("streak-page").classList.contains("active")) {
    renderStreakPage();
  }
  alert("Everything has been reset!");
}


// ==================== NEW FEATURES LOGIC ====================

// --- 1. MOOD TRACKER ---
window.moodHistory = JSON.parse(appStorage.getItem("moodHistory") || "[]");

function saveMood(moodStr) {
  const noteInput = /** @type {HTMLInputElement} */ (document.getElementById("mood-note"));
  const note = noteInput ? noteInput.value.trim() : "";

  // Enforce daily limit (max 2 entries per day locally)
  const todayLocal = new Date().toLocaleDateString();
  const todayCount = moodHistory.filter(m => m.date === todayLocal).length;
  if (todayCount >= 2) {
    showNotification("⚠️ Daily limit reached: You can only log a maximum of 2 moods per day!");
    return;
  }

  // Collect selected tags
  const selectedTags = [];
  document.querySelectorAll(".mood-tag-btn.active").forEach(btn => {
    selectedTags.push(btn.getAttribute("data-tag"));
  });

  // Snapshot contextual data
  const now = new Date();
  const hour = now.getHours();
  let timeOfDay = "morning";
  if (hour >= 12 && hour < 17) timeOfDay = "afternoon";
  else if (hour >= 17) timeOfDay = "evening";

  const entry = {
    date: now.toLocaleDateString(),
    dateISO: now.toISOString().split('T')[0],
    timestamp: Date.now(),
    mood: moodStr,
    note: note,
    tags: selectedTags,
    timeOfDay: timeOfDay,
    time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    context: {
      waterConsumed: typeof waterConsumed !== 'undefined' ? waterConsumed : 0,
      waterGoal: typeof waterGoal !== 'undefined' ? waterGoal : 0,
      streakCount: typeof count !== 'undefined' ? count : 0
    }
  };

  moodHistory.unshift(entry);
  if (moodHistory.length > 100) moodHistory.pop();
  appStorage.setItem("moodHistory", JSON.stringify(moodHistory));
  // Keep window.moodHistory in sync so other parts of the app see the latest entry
  window.moodHistory = [...moodHistory];

  if (noteInput) noteInput.value = "";
  document.querySelectorAll(".mood-btn").forEach(b => b.classList.remove("active"));
  document.querySelectorAll(".mood-tag-btn").forEach(b => b.classList.remove("active"));
  document.getElementById("mood-tags-section")?.classList.add("hidden");

  renderMoodHistory();
  renderMoodHeatmap();
  generateMoodInsights();
  if (typeof updateVitalityUI === 'function') updateVitalityUI();
  if (typeof tryVitalityStreak === 'function') tryVitalityStreak();
  saveState();

  const heading = document.getElementById("mood-heading");
  if (heading) {
    heading.textContent = "✅ Mood Saved!";
    setTimeout(() => {
      const un = getUserName();
      heading.textContent = un ? `🎭 ${un}'s Mood` : "🎭 Mood Tracker";
    }, 2000);
  }
}

function renderMoodHistory() {
  const list = document.getElementById("mood-list");
  if (!list) return;

  const recentMoods = moodHistory.slice(0, 10);

  list.innerHTML = recentMoods.map(m => {
    const tagsHtml = (m.tags || []).map(t => `<span style="display:inline-block; background: linear-gradient(135deg, var(--primary), var(--secondary)); color:white; padding:2px 8px; border-radius:8px; font-size:0.75rem; margin-right:4px; font-weight:600;">${t}</span>`).join('');

    return `
      <div class="mood-item" style="display:flex; flex-direction:column; margin-bottom:10px; padding:12px; border-radius:12px; background:rgba(255,255,255,0.6); border-left:4px solid ${getMoodColor(m.mood)};">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="font-weight:bold; font-size:1.1em;">${getMoodEmoji(m.mood)} ${m.mood.charAt(0).toUpperCase() + m.mood.slice(1)}</span>
          <small style="color:var(--text-muted);">${m.date} ${m.time} · ${m.timeOfDay || ''}</small>
        </div>
        ${tagsHtml ? `<div style="margin-top:6px;">${tagsHtml}</div>` : ''}
        ${m.note ? `<p style="margin:6px 0 0; font-size:0.9em; color:var(--text-main); font-style:italic;">"${m.note}"</p>` : ''}
      </div>
    `;
  }).join("");

  updateMoodStats();
}

function updateMoodStats() {
  const totalEl = document.getElementById("mood-count-total");
  const trendEl = document.getElementById("mood-trend-emoji");

  if (totalEl) totalEl.textContent = moodHistory.length.toString();

  if (trendEl) {
    if (moodHistory.length === 0) {
      trendEl.textContent = "➖";
      return;
    }
    const recent = moodHistory.slice(0, 7);
    const moodScores = { "great": 5, "good": 4, "okay": 3, "bad": 2, "terrible": 1 };
    const avg = recent.reduce((sum, m) => sum + (moodScores[m.mood] || 3), 0) / recent.length;

    if (avg > 4) trendEl.textContent = "📈🤩 Awesome";
    else if (avg > 3) trendEl.textContent = "↗️😊 Good";
    else if (avg > 2) trendEl.textContent = "➡️😐 Steady";
    else trendEl.textContent = "↘️😔 Needs Care";
  }
}

function getMoodEmoji(moodStr) {
  const emojis = { great: "🤩", good: "😊", okay: "😐", bad: "😔", terrible: "😫" };
  return emojis[moodStr] || "😶";
}

function getMoodColor(moodStr) {
  const colors = { great: "#48bb78", good: "#68d391", okay: "#cbd5e0", bad: "#fc8181", terrible: "#e53e3e" };
  return colors[moodStr] || "#a0aec0";
}

// --- 14-Day Heatmap ---
function renderMoodHeatmap() {
  const grid = document.getElementById("mood-heatmap-grid");
  if (!grid) return;
  grid.innerHTML = "";

  const today = new Date();
  const dayMs = 86400000;

  for (let i = 13; i >= 0; i--) {
    const d = new Date(today.getTime() - i * dayMs);
    const dateStr = d.toLocaleDateString();
    const isoStr = d.toISOString().split('T')[0];
    const dayLabel = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

    // Find moods for this day
    const dayMoods = moodHistory.filter(m => m.date === dateStr || m.dateISO === isoStr);

    const block = document.createElement("div");
    block.className = "heatmap-block";

    if (dayMoods.length > 0) {
      // Use the best mood of the day for color
      const moodScores = { "great": 5, "good": 4, "okay": 3, "bad": 2, "terrible": 1 };
      const bestMood = dayMoods.reduce((best, m) => (moodScores[m.mood] || 3) > (moodScores[best.mood] || 3) ? m : best, dayMoods[0]);
      block.setAttribute("data-mood", bestMood.mood);
      block.textContent = getMoodEmoji(bestMood.mood);
    }

    // Tooltip
    const tooltip = document.createElement("span");
    tooltip.className = "heatmap-tooltip";
    tooltip.textContent = dayMoods.length > 0 ? `${dayLabel} — ${dayMoods.length} entry(s)` : `${dayLabel} — No entry`;
    block.appendChild(tooltip);

    grid.appendChild(block);
  }
}

// --- Mood Insights (Advanced) ---
function generateMoodInsights() {
  const textEl = document.getElementById("mood-insight-text");
  if (!textEl) return;

  if (moodHistory.length < 3) {
    textEl.innerHTML = "Log at least 3 moods across different days to unlock personalized insights about your emotional patterns.";
    return;
  }

  const moodScores = { "great": 5, "good": 4, "okay": 3, "bad": 2, "terrible": 1 };
  const insights = [];

  // ── 1. Weekly trend (rising, falling, stable) ──
  const last7 = moodHistory.filter(m => {
    const ts = m.timestamp || new Date(m.dateISO || m.date).getTime();
    return Date.now() - ts < 7 * 86400000;
  });
  const prev7 = moodHistory.filter(m => {
    const ts = m.timestamp || new Date(m.dateISO || m.date).getTime();
    return Date.now() - ts >= 7 * 86400000 && Date.now() - ts < 14 * 86400000;
  });
  if (last7.length >= 2 && prev7.length >= 2) {
    const avgRecent = last7.reduce((s, m) => s + (moodScores[m.mood] || 3), 0) / last7.length;
    const avgPrev = prev7.reduce((s, m) => s + (moodScores[m.mood] || 3), 0) / prev7.length;
    const diff = avgRecent - avgPrev;
    if (diff > 0.5) insights.push("📈 Your mood is <strong>trending upward</strong> compared to last week — great momentum!");
    else if (diff < -0.5) insights.push("📉 Your mood has <strong>dipped</strong> this week compared to last. Check what changed.");
    else insights.push("📊 Your mood has been <strong>stable</strong> over the past two weeks.");
  }

  // ── 2. Best and worst time of day ──
  const timeGroups = {};
  moodHistory.forEach(m => {
    const tod = m.timeOfDay || "unknown";
    if (tod === "unknown") return;
    if (!timeGroups[tod]) timeGroups[tod] = [];
    timeGroups[tod].push(moodScores[m.mood] || 3);
  });
  let bestTime = null, bestAvg = 0, worstTime = null, worstAvg = 6;
  for (const [time, scores] of Object.entries(timeGroups)) {
    if (scores.length < 2) continue;
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    if (avg > bestAvg) { bestAvg = avg; bestTime = time; }
    if (avg < worstAvg) { worstAvg = avg; worstTime = time; }
  }
  if (bestTime) insights.push(`☀️ You feel <strong>best</strong> in the <strong>${bestTime}</strong> (avg ${bestAvg.toFixed(1)}/5).`);
  if (worstTime && worstTime !== bestTime) insights.push(`🌙 The <strong>${worstTime}</strong> tends to be your <strong>lowest</strong> mood window.`);

  // ── 3. Mood volatility (emotional stability) ──
  if (moodHistory.length >= 5) {
    const recent10 = moodHistory.slice(0, 10).map(m => moodScores[m.mood] || 3);
    const mean = recent10.reduce((a, b) => a + b, 0) / recent10.length;
    const variance = recent10.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / recent10.length;
    const stdDev = Math.sqrt(variance);
    if (stdDev < 0.5) insights.push("🧘 Your emotional state has been <strong>very stable</strong> — great self-regulation!");
    else if (stdDev > 1.2) insights.push("🎢 Your mood has been quite <strong>volatile</strong> recently — consider what's driving the swings.");
  }

  // ── 4. Tag/influence correlation ──
  const tagScores = {};
  moodHistory.forEach(m => {
    const tags = m.tags || m.symptoms || [];
    tags.forEach(tag => {
      if (!tagScores[tag]) tagScores[tag] = [];
      tagScores[tag].push(moodScores[m.mood] || 3);
    });
  });
  let bestTag = null, bestTagAvg = 0, worstTag = null, worstTagAvg = 6;
  for (const [tag, scores] of Object.entries(tagScores)) {
    if (scores.length < 2) continue;
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    if (avg > bestTagAvg) { bestTagAvg = avg; bestTag = tag; }
    if (avg < worstTagAvg) { worstTagAvg = avg; worstTag = tag; }
  }
  if (bestTag) insights.push(`🏷️ <strong>${bestTag.charAt(0).toUpperCase() + bestTag.slice(1)}</strong> is your top mood booster (avg ${bestTagAvg.toFixed(1)}/5).`);
  if (worstTag && worstTag !== bestTag) insights.push(`⚠️ Mood tends to be lowest around <strong>${worstTag}</strong> (avg ${worstTagAvg.toFixed(1)}/5).`);

  // ── 5. Water-mood correlation ──
  const withWater = moodHistory.filter(m => m.context && m.context.waterConsumed > 500);
  const withoutWater = moodHistory.filter(m => m.context && m.context.waterConsumed <= 500);
  if (withWater.length >= 3 && withoutWater.length >= 3) {
    const avgWith = withWater.reduce((s, m) => s + (moodScores[m.mood] || 3), 0) / withWater.length;
    const avgWithout = withoutWater.reduce((s, m) => s + (moodScores[m.mood] || 3), 0) / withoutWater.length;
    if (avgWith > avgWithout + 0.3) {
      const pct = Math.round(((avgWith - avgWithout) / avgWithout) * 100);
      insights.push(`💧 You're <strong>${pct}% happier</strong> on days with higher water intake.`);
    }
  }

  // ── 6. Day-of-week pattern ──
  if (moodHistory.length >= 7) {
    const dayGroups = {};
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    moodHistory.forEach(m => {
      const ts = m.timestamp || new Date(m.dateISO || m.date).getTime();
      const day = new Date(ts).getDay();
      if (!dayGroups[day]) dayGroups[day] = [];
      dayGroups[day].push(moodScores[m.mood] || 3);
    });
    let bestDay = null, bestDayAvg = 0;
    for (const [day, scores] of Object.entries(dayGroups)) {
      if (scores.length < 2) continue;
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      if (avg > bestDayAvg) { bestDayAvg = avg; bestDay = parseInt(day); }
    }
    if (bestDay !== null) insights.push(`📅 <strong>${dayNames[bestDay]}s</strong> are consistently your happiest day of the week.`);
  }

  // ── 7. Current mood streak ──
  if (moodHistory.length >= 2) {
    const latestMood = moodHistory[0].mood;
    let moodStreak = 1;
    for (let i = 1; i < moodHistory.length; i++) {
      if (moodHistory[i].mood === latestMood) moodStreak++;
      else break;
    }
    if (moodStreak >= 3) {
      const emoji = { great: "🌟", good: "😊", okay: "😐", bad: "😔", terrible: "😢" }[latestMood] || "🎭";
      insights.push(`${emoji} You've logged <strong>"${latestMood}"</strong> ${moodStreak} times in a row.`);
    }
  }

  // ── 8. Overall assessment + recommendation ──
  const overallAvg = moodHistory.slice(0, 14).reduce((s, m) => s + (moodScores[m.mood] || 3), 0) / Math.min(moodHistory.length, 14);
  if (overallAvg >= 4.2) insights.push("🌟 Overall mood: <strong>Excellent</strong>. Whatever you're doing, keep it up!");
  else if (overallAvg >= 3.5) insights.push("✅ Overall mood: <strong>Good</strong>. Room for improvement — try more of your top boosters.");
  else if (overallAvg >= 2.5) insights.push("💛 Overall mood: <strong>Moderate</strong>. Small changes in routine could make a big difference.");
  else insights.push("🫂 Overall mood: <strong>Low</strong>. Prioritize self-care — hydration, sleep, and activities that boost you.");

  textEl.innerHTML = insights.join("<br><br>");
}

// --- 2. SLEEP TRACKER ---
let sleepLogs = JSON.parse(appStorage.getItem("sleepLogs") || "[]");
let sleepGoalHours = parseFloat(appStorage.getItem("sleepGoalHours") || "8");

function renderSleepFactors() {
  const factorBtns = document.querySelectorAll('.sleep-factor-btn');
  factorBtns.forEach(btn => {
    btn.addEventListener('click', function () {
      this.classList.toggle('active');
    });
  });
}

function initSleepTracker() {
  renderSleepFactors();

  // Set default times to make it easy
  const bedInput = document.getElementById("sleep-bedtime");
  const wakeInput = document.getElementById("sleep-wakeup");
  if (bedInput && !bedInput.value) bedInput.value = "23:00";
  if (wakeInput && !wakeInput.value) wakeInput.value = "07:00";

  // Goal edit listener
  document.getElementById("edit-sleep-goal")?.addEventListener("click", () => {
    const newGoal = prompt("What's your daily sleep goal in hours?", sleepGoalHours);
    if (newGoal && !isNaN(parseFloat(newGoal))) {
      sleepGoalHours = parseFloat(newGoal);
      appStorage.setItem("sleepGoalHours", sleepGoalHours);
      updateSleepStats();
    }
  });

  // Save button
  document.getElementById("saveSleep")?.addEventListener("click", saveSleepEntry);
}

function calculateSleepDuration(bedtimeStr, wakeupStr) {
  // Basic logic assuming PM to AM jump if wakeup is smaller than bedtime
  const [bedH, bedM] = bedtimeStr.split(':').map(Number);
  const [wakeH, wakeM] = wakeupStr.split(':').map(Number);

  let durationMins = (wakeH * 60 + wakeM) - (bedH * 60 + bedM);
  if (durationMins < 0) {
    durationMins += 24 * 60; // crossed midnight
  }

  const hours = durationMins / 60;
  // Round to 1 decimal place
  return Math.round(hours * 10) / 10;
}

function saveSleepEntry() {
  const bedInput = document.getElementById("sleep-bedtime").value;
  const wakeInput = document.getElementById("sleep-wakeup").value;
  const quality = (/** @type {HTMLInputElement | null} */(document.querySelector('input[name="sleep-quality"]:checked')))?.value;

  if (!bedInput || !wakeInput || !quality) {
    alert("Please enter Bedtime, Wake Up time, and select quality!");
    return;
  }

  const todayDateStr = new Date().toLocaleDateString();
  const alreadyLoggedToday = sleepLogs.some(log => log.date === todayDateStr);
  if (alreadyLoggedToday) {
    alert("You have already logged your sleep for today. Rest easy! 😴");
    return;
  }

  const hours = calculateSleepDuration(bedInput, wakeInput);

  // Get active factors
  const activeFactors = Array.from(document.querySelectorAll('.sleep-factor-btn.active'))
    .map(btn => btn.getAttribute('data-factor'));

  const entry = {
    date: new Date().toLocaleDateString(),
    timestamp: Date.now(),
    bedtime: bedInput,
    wakeup: wakeInput,
    hours: hours,
    quality: parseInt(quality),
    factors: activeFactors
  };

  sleepLogs.unshift(entry);
  if (sleepLogs.length > 30) sleepLogs.pop();
  appStorage.setItem("sleepLogs", JSON.stringify(sleepLogs));
  updateSleepStats();
  saveState();
  if (typeof updateBloomWidgets === "function") updateBloomWidgets();
  if (typeof tryVitalityStreak === "function") tryVitalityStreak();
  if (typeof updateVitalityUI === "function") updateVitalityUI();
  if (typeof tryVitalityStreak === "function") tryVitalityStreak();

  // Reset UI
  document.querySelectorAll('.sleep-factor-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('input[name="sleep-quality"]').forEach(radio => radio.checked = false);

  // Flash success
  const heading = document.getElementById("sleep-heading");
  if (heading) {
    heading.textContent = "✅ Sleep Logged!";
    setTimeout(() => {
      const un = getUserName();
      heading.textContent = un ? `😴 ${un}'s Sleep` : "😴 Sleep Tracker";
    }, 2000);
  }
}

function calculateSleepScore(avgHours, avgQuality) {
  // simple score based on how close to goal, and subjective quality
  const durationScore = Math.min((avgHours / sleepGoalHours) * 100, 100);
  const qualityScore = (avgQuality / 5) * 100;

  // weighting duration 60%, quality 40%
  return Math.round((durationScore * 0.6) + (qualityScore * 0.4));
}

function updateSleepStats() {
  const goalDisplay = document.getElementById("sleep-goal-display");
  if (goalDisplay) goalDisplay.textContent = sleepGoalHours;

  const list = document.getElementById("sleep-list");
  if (list) {
    list.innerHTML = sleepLogs.map(s => {
      const ratingStars = "★".repeat(s.quality) + "☆".repeat(5 - s.quality);

      let factorsHtml = "";
      if (s.factors && s.factors.length > 0) {
        const factorEmojis = { 'exercise': '🏃', 'caffeine': '☕', 'screens': '📱', 'stress': '😫', 'alcohol': '🍷', 'reading': '📖' };
        factorsHtml = `<div style="margin-top:5px; font-size: 0.8rem; color: var(--text-muted);">
            ${s.factors.map(f => `<span style="background: rgba(0,0,0,0.05); padding: 2px 6px; border-radius: 4px; margin-right: 4px;">${factorEmojis[f] || f}</span>`).join('')}
          </div>`;
      }

      const timingStr = s.bedtime && s.wakeup ? `<span style="color:var(--text-muted); font-size:0.8rem; margin-right:10px;">${s.bedtime} - ${s.wakeup}</span>` : "";

      return `
          <div style="padding: 12px; background: rgba(255,255,255,0.6); border-radius: 8px; border-left: 3px solid var(--primary);">
              <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                  <div>
                      ${timingStr}
                      <strong style="color: var(--primary); font-size: 1.1rem;">${s.hours}h</strong>
                      <span style="color: #f1c40f; margin-left: 10px;">${ratingStars}</span>
                      ${factorsHtml}
                  </div>
                  <small style="color: var(--text-muted);">${s.date}</small>
              </div>
          </div>
          `;
    }).join("");
  }

  const last7Days = sleepLogs.slice(0, 7);
  if (last7Days.length === 0) return;

  const totalHours = last7Days.reduce((acc, curr) => acc + curr.hours, 0);
  const avgHours = totalHours / last7Days.length;

  const totalQuality = last7Days.reduce((acc, curr) => acc + curr.quality, 0);
  const avgQuality = totalQuality / last7Days.length;

  const avgEl = document.getElementById("avg-sleep-hours");
  if (avgEl) avgEl.textContent = avgHours.toFixed(1);

  // Calculate Sleep Score
  const score = calculateSleepScore(avgHours, avgQuality);
  const scoreValEl = document.getElementById("sleep-score-value");
  if (scoreValEl) {
    scoreValEl.textContent = score;
    // Update circular CSS pie chart property
    scoreValEl.parentElement.style.setProperty('--score-pct', score);

    if (score >= 85) scoreValEl.style.color = "#2ecc71"; // Green
    else if (score >= 70) scoreValEl.style.color = "#f39c12"; // Orange
    else scoreValEl.style.color = "#e74c3c"; // Red
  }

  // Calculate Sleep Debt
  const targetTotal = last7Days.length * sleepGoalHours;
  const debt = targetTotal - totalHours;
  const debtEl = document.getElementById("sleep-debt");

  if (debtEl) {
    if (debt <= 0) {
      debtEl.textContent = "0";
      debtEl.style.color = "#2ecc71"; // Green for no debt
    } else {
      debtEl.textContent = debt.toFixed(1);
      debtEl.style.color = "#f5576c"; // Red for debt
    }
  }

  // Render Sleep Chart
  renderSleepChart(last7Days);
}

function renderSleepChart(logs) {
  const chart = document.getElementById("sleep-chart");
  if (!chart) return;

  // We want chronologically for the chart, so reverse the slice
  const chronologicalLogs = [...logs].reverse();

  // Find max value to scale bars appropriately, standardizing to at least the goal + 2
  let maxHours = Math.max(...chronologicalLogs.map(l => l.hours), sleepGoalHours + 2);

  chart.innerHTML = chronologicalLogs.map(log => {
    // Safe check for date
    const dayMatch = log.date.match(/(\d+)\//);
    let dayLabel = dayMatch ? dayMatch[1] : log.date.split('/')[1] || "?";
    if (!dayLabel && log.date.includes('-')) dayLabel = log.date.split('-')[2] || "?"; // handle YYYY-MM-DD

    const heightPct = Math.min((log.hours / maxHours) * 100, 100);

    let colorTheme = "linear-gradient(to top, rgba(102, 126, 234, 0.5), rgba(102, 126, 234, 1))"; // Normal
    if (log.hours < sleepGoalHours - 1.5) {
      colorTheme = "linear-gradient(to top, rgba(245, 87, 108, 0.5), rgba(245, 87, 108, 1))"; // Deficit
    } else if (log.hours >= sleepGoalHours) {
      colorTheme = "linear-gradient(to top, rgba(46, 204, 113, 0.5), rgba(46, 204, 113, 1))"; // Optimal
    }

    return `
            <div class="sleep-chart-bar-container">
                <div class="sleep-chart-bar" style="height: ${heightPct}%; background: ${colorTheme};" data-val="${log.hours}"></div>
                <div class="sleep-chart-label">${dayLabel}</div>
            </div>
        `;
  }).join("");
}

// --- 4. THEME CUSTOMIZATION ---
function applyTheme(theme) {
  document.body.className = theme === "classic" ? "" : `theme-${theme}`;
  appStorage.setItem("appTheme", theme);

  // Update active button state
  document.querySelectorAll(".theme-btn").forEach(btn => {
    btn.classList.toggle("active", btn.getAttribute("data-theme") === theme);
  });
}

// --- 5. FOCUS SOUNDS (Integration with Pomodoro) ---
let currentAudio = null;
const focusSounds = {
  rain: "https://www.soundjay.com/nature/rain-01.mp3",
  nature: "https://www.soundjay.com/nature/forest-wind-01.mp3",
  lofi: "https://www.soundjay.com/misc/sounds/wind-chime-1.mp3" // Fallback example
};

function toggleSound(soundKey) {
  if (currentAudio && !currentAudio.paused) {
    currentAudio.pause();
    if (currentAudio.src.includes(soundKey)) {
      currentAudio = null;
      return;
    }
  }

  currentAudio = new Audio(focusSounds[soundKey]);
  currentAudio.loop = true;
  currentAudio.play().catch(e => console.error("Audio play failed:", e));
}

// ==================== INITIALIZATION & EVENT LISTENERS ====================
document.addEventListener("DOMContentLoaded", function () {
  // Navigation listeners for new pages
  const additionalNav = {
    'mood-page': renderMoodHistory,
    'sleep-page': updateSleepStats,
    'settings-page': () => applyTheme(appStorage.getItem("appTheme") || "classic")
  };

  // Initialize New Features
  renderMoodHistory();
  updateSleepStats();
  applyTheme(appStorage.getItem("appTheme") || "classic");

  // Mood buttons
  let selectedMood = null;
  document.querySelectorAll(".mood-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      selectedMood = btn.getAttribute("data-mood");
      document.querySelectorAll(".mood-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      // Show the tags section
      document.getElementById("mood-tags-section")?.classList.remove("hidden");
    });
  });

  // Mood tag toggle
  document.querySelectorAll(".mood-tag-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      btn.classList.toggle("active");
    });
  });

  document.getElementById("saveMoodBtn")?.addEventListener("click", () => {
    if (selectedMood) {
      saveMood(selectedMood);
      selectedMood = null;
    }
  });

  // Render advanced mood features on load
  renderMoodHeatmap();
  generateMoodInsights();

  // Sleep buttons
  document.getElementById("saveSleep")?.addEventListener("click", saveSleepEntry);

  // Theme buttons
  document.querySelectorAll(".theme-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      applyTheme(btn.getAttribute("data-theme"));
    });
  });

  // Global Close Buttons
  document.querySelectorAll(".close-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      // Hide all pages
      document.querySelectorAll(".page").forEach(page => page.classList.remove("active"));
      // Show main page
      const mainPage = document.getElementById("main");
      if (mainPage) mainPage.classList.add("active");

      // Update nav buttons
      document.querySelectorAll(".nav-btn").forEach(navBtn => navBtn.classList.remove("active"));
      const tasksNavBtn = document.querySelector('.nav-btn[data-page="main"]');
      if (tasksNavBtn) tasksNavBtn.classList.add("active");
    });
  });
});

// ==================== NEW POMODORO TIMER LOGIC ====================
let newPomodoroTimer = null;
let newPomodoroTimeLeft = 25 * 60;
let newPomodoroTotalTime = 25 * 60;
let newPomodoroRunning = false;
let isBreakTime = false;
let workDuration = 25;
let breakDuration = 5;

const circle = document.querySelector('.progress-ring-circle');
const radius = 130;
const circumference = 2 * Math.PI * radius;

if (circle) {
  circle.style.strokeDasharray = `${circumference} ${circumference}`;
  circle.style.strokeDashoffset = '0';
}

function setProgress(percent) {
  if (!circle) return;
  const offset = circumference - (percent / 100) * circumference;
  circle.style.strokeDashoffset = offset.toString();
}

function updateNewTimerDisplay() {
  const minutes = Math.floor(newPomodoroTimeLeft / 60);
  const seconds = Math.floor(newPomodoroTimeLeft % 60);
  const timerText = document.getElementById('timer-text-new');
  if (timerText) {
    timerText.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  const elapsed = newPomodoroTotalTime - newPomodoroTimeLeft;
  const percentage = (elapsed / newPomodoroTotalTime) * 100;
  setProgress(percentage);
}

function startNewPomodoro() {
  if (newPomodoroRunning) return;

  newPomodoroRunning = true;
  document.getElementById('start-pomodoro-new')?.classList.add('hidden');
  document.getElementById('pause-pomodoro-new')?.classList.remove('hidden');
  document.querySelector('.timer-display-center')?.classList.add('active');

  // Trigger strict focus mode if enabled
  enterStrictFocusMode();

  newPomodoroTimer = setInterval(() => {
    newPomodoroTimeLeft--;
    updateNewTimerDisplay();

    if (newPomodoroTimeLeft <= 0) {
      clearInterval(newPomodoroTimer);
      newPomodoroRunning = false;
      document.querySelector('.timer-display-center')?.classList.remove('active');

      if (isBreakTime) {
        // Break finished, start work session
        isBreakTime = false;
        newPomodoroTimeLeft = workDuration * 60;
        newPomodoroTotalTime = workDuration * 60;
        document.getElementById('timer-label-new').textContent = 'Focus Time';
        document.getElementById('pomodoro-message-new').textContent = '✅ Break complete! Ready for another session?';
        document.getElementById('start-pomodoro-new')?.classList.remove('hidden');
        document.getElementById('pause-pomodoro-new')?.classList.add('hidden');
      } else {
        // Work finished, start break
        isBreakTime = true;
        newPomodoroTimeLeft = breakDuration * 60;
        newPomodoroTotalTime = breakDuration * 60;
        document.getElementById('timer-label-new').textContent = 'Break Time';
        document.getElementById('pomodoro-message-new').textContent = '🎉 Great work! Time for a break!';
        document.getElementById('start-pomodoro-new')?.classList.remove('hidden');
        document.getElementById('pause-pomodoro-new')?.classList.add('hidden');
      }
      updateNewTimerDisplay();

      // Play notification sound or show alert
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Pomodoro Timer', {
          body: isBreakTime ? 'Break time!' : 'Focus session complete!',
          icon: '🍅'
        });
      }
    }
  }, 1000);
}

function pauseNewPomodoro() {
  newPomodoroRunning = false;
  clearInterval(newPomodoroTimer);
  document.getElementById('start-pomodoro-new')?.classList.remove('hidden');
  document.getElementById('pause-pomodoro-new')?.classList.add('hidden');
  document.querySelector('.timer-display-center')?.classList.remove('active');
}

// --- Strict Focus Mode Logic ---
let isStrictFocusMode = false;
let strictFocusActive = false; // true while a strict session is running
let wakeLockSentinel = null;
let strictFocusOverlay = null;
let strictExitAttempts = 0;
let fullscreenReEntryTimeout = null;
let strictBackPressCount = 0;
let strictBackPressTimer = null;
const STRICT_BACK_PRESSES_REQUIRED = 5;

document.getElementById('strict-focus-toggle')?.addEventListener('change', function (e) {
  isStrictFocusMode = (/** @type {HTMLInputElement} */(e.target)).checked;
});

// --- beforeunload handler ---
function strictBeforeUnload(e) {
  e.preventDefault();
  e.returnValue = "⚠️ You are in STRICT FOCUS MODE! Leaving will break your session. Are you sure?";
  return e.returnValue;
}

// --- Visibility change handler (tab switch detection) ---
function strictVisibilityChange() {
  if (!strictFocusActive) return;
  if (document.hidden) {
    // User switched tabs — show alert when they come back
    const returnHandler = () => {
      if (!strictFocusActive) return;
      showStrictWarningOverlay("🚫 DON'T SWITCH TABS!", "Stay focused. Your session is still running.");
      // Re-enter fullscreen
      requestStrictFullscreen();
      document.removeEventListener('visibilitychange', returnHandler);
    };
    // We can't alert while hidden, so we alert on return
    document.addEventListener('visibilitychange', function onReturn() {
      if (!document.hidden && strictFocusActive) {
        document.removeEventListener('visibilitychange', onReturn);
        showStrictWarningOverlay("🚫 DON'T SWITCH TABS!", "Stay focused. Your session is still running.");
        requestStrictFullscreen();
      }
    });
  }
}

// --- Wake Lock (prevent screen sleep) ---
async function acquireWakeLock() {
  try {
    if ('wakeLock' in navigator) {
      wakeLockSentinel = await navigator.wakeLock.request('screen');
      console.log('Wake Lock acquired');
      wakeLockSentinel.addEventListener('release', () => {
        console.log('Wake Lock released');
        // Re-acquire if still in strict mode
        if (strictFocusActive) acquireWakeLock();
      });
    }
  } catch (err) {
    console.log('Wake Lock error:', err.message);
  }
}

function releaseWakeLock() {
  if (wakeLockSentinel) {
    wakeLockSentinel.release();
    wakeLockSentinel = null;
  }
}

// --- Fullscreen helpers ---
function requestStrictFullscreen() {
  if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
    document.documentElement.requestFullscreen().catch(err => {
      console.log("Fullscreen error:", err.message);
    });
  }
}

// --- Warning overlay (shown on violations) ---
function showStrictWarningOverlay(title, message) {
  // Remove existing warning if any
  const existing = document.getElementById('strict-warning-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'strict-warning-overlay';
  overlay.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
    background: rgba(220, 20, 20, 0.95); z-index: 999999;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    animation: strictWarnIn 0.3s ease;
  `;
  overlay.innerHTML = `
    <div style="text-align: center; color: white; padding: 40px;">
      <div style="font-size: 72px; margin-bottom: 20px; animation: strictShake 0.5s ease;">${title}</div>
      <div style="font-size: 24px; opacity: 0.9; margin-bottom: 30px;">${message}</div>
      <button id="strict-warn-dismiss" style="
        background: rgba(255,255,255,0.2); color: white; border: 2px solid white;
        padding: 15px 40px; border-radius: 12px; font-size: 18px; font-weight: bold;
        cursor: pointer; transition: all 0.3s ease;
      ">I'll Stay Focused</button>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelector('#strict-warn-dismiss')?.addEventListener('click', () => {
    overlay.style.animation = 'strictWarnOut 0.3s ease forwards';
    setTimeout(() => overlay.remove(), 300);
  });

  // Auto-dismiss after 5 seconds
  setTimeout(() => {
    if (overlay.parentNode) {
      overlay.style.animation = 'strictWarnOut 0.3s ease forwards';
      setTimeout(() => { if (overlay.parentNode) overlay.remove(); }, 300);
    }
  }, 5000);
}

// --- Block keyboard shortcuts ---
function strictKeydownHandler(e) {
  if (!strictFocusActive) return;
  // Block Alt+Tab visual cue, Ctrl+W, Ctrl+T, Ctrl+N (browser won't fully allow blocking, but we try)
  if ((e.ctrlKey && (e.key === 'w' || e.key === 'W' || e.key === 't' || e.key === 'T' || e.key === 'n' || e.key === 'N')) ||
    (e.altKey && e.key === 'Tab') ||
    (e.altKey && e.key === 'F4')) {
    e.preventDefault();
    e.stopPropagation();
    showStrictWarningOverlay("🔒 LOCKED", "Keyboard shortcuts are disabled during strict focus.");
    return false;
  }
}

// --- ENTER STRICT MODE ---
function enterStrictFocusMode() {
  if (!isStrictFocusMode) return;

  strictFocusActive = true;
  strictExitAttempts = 0;
  document.body.classList.add('strict-focus');
  document.getElementById('exit-focus-btn')?.classList.remove('hidden');

  // 1. Fullscreen
  requestStrictFullscreen();

  // 2. Prevent page close
  window.addEventListener('beforeunload', strictBeforeUnload);

  // 3. Detect tab switches
  document.addEventListener('visibilitychange', strictVisibilityChange);

  // 4. Wake Lock (prevent screen sleep)
  acquireWakeLock();

  // 5. Block keyboard shortcuts
  document.addEventListener('keydown', strictKeydownHandler, true);

  // 6. Disable all nav buttons
  document.querySelectorAll('.nav-btn, .close-btn, .menu-btn').forEach(btn => {
    btn.setAttribute('data-strict-disabled', 'true');
    btn.style.pointerEvents = 'none';
  });

  // 7. Block right-click context menu
  document.addEventListener('contextmenu', strictContextMenuHandler);

  // 8. Push history states to trap the back button (mobile)
  strictBackPressCount = 0;
  for (let i = 0; i < STRICT_BACK_PRESSES_REQUIRED + 2; i++) {
    history.pushState({ strictFocus: true, index: i }, '');
  }
  window.addEventListener('popstate', strictPopstateHandler);

  // 9. Show entry notification
  showNotification("🔒 STRICT MODE ACTIVATED — No distractions allowed!");
}

function strictContextMenuHandler(e) {
  if (!strictFocusActive) return;
  e.preventDefault();
  return false;
}

// --- EXIT STRICT MODE ---
function exitStrictFocusMode() {
  strictFocusActive = false;
  document.body.classList.remove('strict-focus');
  document.getElementById('exit-focus-btn')?.classList.add('hidden');

  // Remove all strict listeners
  window.removeEventListener('beforeunload', strictBeforeUnload);
  document.removeEventListener('visibilitychange', strictVisibilityChange);
  document.removeEventListener('keydown', strictKeydownHandler, true);
  document.removeEventListener('contextmenu', strictContextMenuHandler);

  // Remove back button handler
  window.removeEventListener('popstate', strictPopstateHandler);
  strictBackPressCount = 0;
  if (strictBackPressTimer) { clearTimeout(strictBackPressTimer); strictBackPressTimer = null; }

  // Release wake lock
  releaseWakeLock();

  // Clear fullscreen re-entry timeout
  if (fullscreenReEntryTimeout) {
    clearTimeout(fullscreenReEntryTimeout);
    fullscreenReEntryTimeout = null;
  }

  // Re-enable nav buttons
  document.querySelectorAll('[data-strict-disabled]').forEach(btn => {
    btn.removeAttribute('data-strict-disabled');
    btn.style.pointerEvents = '';
  });

  // Remove any lingering warning overlays
  const warn = document.getElementById('strict-warning-overlay');
  if (warn) warn.remove();

  // Exit fullscreen if active
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(err => console.log(err));
  }
}

// --- Emergency exit (requires multiple confirmations) ---
document.getElementById('exit-focus-btn')?.addEventListener('click', function () {
  strictExitAttempts++;

  if (strictExitAttempts === 1) {
    showStrictWarningOverlay(
      "⚠️ ARE YOU SURE?",
      "Exiting strict mode will break your focus. Press the exit button again if you really want to quit."
    );
    return;
  }

  if (strictExitAttempts === 2) {
    if (confirm("🚨 FINAL WARNING: You're about to break your strict focus session. This will reset your progress. Continue?")) {
      exitStrictFocusMode();
      showNotification("⚠️ Strict focus mode exited. Try again next time!");
    } else {
      strictExitAttempts = 0; // Reset attempts
    }
    return;
  }
});

// --- Mobile back button handler (5 presses to exit) ---
function strictPopstateHandler(e) {
  if (!strictFocusActive) return;

  // Re-push state so back button can be pressed again
  history.pushState({ strictFocus: true }, '');

  strictBackPressCount++;
  const remaining = STRICT_BACK_PRESSES_REQUIRED - strictBackPressCount;

  // Reset the counter after 3 seconds of no presses
  if (strictBackPressTimer) clearTimeout(strictBackPressTimer);
  strictBackPressTimer = setTimeout(() => {
    strictBackPressCount = 0;
  }, 3000);

  if (remaining > 0) {
    showStrictWarningOverlay(
      `🔙 Press back ${remaining} more time${remaining > 1 ? 's' : ''}`,
      "Keep pressing to exit strict mode (within 3 seconds)"
    );
  } else {
    // 5 presses reached — exit
    strictBackPressCount = 0;
    exitStrictFocusMode();
    showNotification("⚠️ Strict focus mode exited via back button.");
  }
}

// --- Fullscreen exit handler (aggressively re-enter) ---
document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement && strictFocusActive) {
    // User pressed ESC — re-enter fullscreen after a brief delay
    showStrictWarningOverlay("🔒 STAY IN FOCUS!", "Fullscreen is required during strict mode.");
    fullscreenReEntryTimeout = setTimeout(() => {
      if (strictFocusActive) {
        requestStrictFullscreen();
      }
    }, 800);
  }
});


function resetNewPomodoro() {
  newPomodoroRunning = false;
  clearInterval(newPomodoroTimer);
  isBreakTime = false;
  newPomodoroTimeLeft = workDuration * 60;
  newPomodoroTotalTime = workDuration * 60;
  document.getElementById('start-pomodoro-new')?.classList.remove('hidden');
  document.getElementById('pause-pomodoro-new')?.classList.add('hidden');
  document.querySelector('.timer-display-center')?.classList.remove('active');
  document.getElementById('timer-label-new').textContent = 'Focus Time';
  document.getElementById('pomodoro-message-new').textContent = '';
  updateNewTimerDisplay();
  exitStrictFocusMode();
}

// Preset buttons
document.querySelectorAll('.preset-btn').forEach(btn => {
  btn.addEventListener('click', function () {
    const work = this.getAttribute('data-work');
    const breakTime = this.getAttribute('data-break');

    if (work === 'custom') {
      document.getElementById('custom-time-input')?.classList.toggle('hidden');
      return;
    }

    // Update active state
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    this.classList.add('active');

    // Set durations
    workDuration = parseInt(work);
    breakDuration = parseInt(breakTime);

    // Reset timer with new duration
    resetNewPomodoro();
    saveState(); // Persist Pomodoro settings
  });
});

// Custom time apply button
document.getElementById('apply-custom-time')?.addEventListener('click', function () {
  const customWork = parseInt((document.getElementById('custom-work-time')).value);
  const customBreak = parseInt((document.getElementById('custom-break-time')).value);

  if (customWork > 0 && customBreak > 0) {
    workDuration = customWork;
    breakDuration = customBreak;
    resetNewPomodoro();
    document.getElementById('custom-time-input')?.classList.add('hidden');

    // Update active state
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.custom-preset')?.classList.add('active');
    saveState(); // Persist custom Pomodoro settings
  }
});

// --- 6. DASHBOARD LOGIC ---
async function updateDailyQuote() {
  const quoteTextEl = document.getElementById("dashboard-quote-text");
  const quoteAuthorEl = document.getElementById("dashboard-quote-author");
  if (!quoteTextEl || !quoteAuthorEl) return;

  // ---- Check if user has set a custom quote ----
  const quoteMode = appStorage.getItem("quoteMode") || "default";
  if (quoteMode === "custom") {
    const customText = appStorage.getItem("customQuoteText");
    const customAuthor = appStorage.getItem("customQuoteAuthor");
    if (customText) {
      quoteTextEl.textContent = `"${customText}"`;
      quoteAuthorEl.textContent = customAuthor ? `- ${customAuthor}` : "";
      return;
    }
    // If custom is set but no text saved, fall through to default
  }

  // ---- Default daily quote logic (unchanged) ----
  const today = new Date().toDateString();
  const storedDate = appStorage.getItem("quoteLastFetchedDate");
  const storedQuoteText = appStorage.getItem("dailyQuoteText");
  const storedQuoteAuthor = appStorage.getItem("dailyQuoteAuthor");

  // If we already fetched a quote today, just display it
  if (storedDate === today && storedQuoteText && storedQuoteText !== "undefined") {
    quoteTextEl.textContent = `"${storedQuoteText}"`;
    quoteAuthorEl.textContent = `- ${storedQuoteAuthor || "Unknown"}`;
    return;
  }

  // Pre-fill with a fallback quote so it NEVER gets stuck on "Fetching..."
  if (typeof fallbackQuotes !== 'undefined' && fallbackQuotes.length > 0) {
    const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
    const fallbackIndex = dayOfYear % fallbackQuotes.length;
    const quoteObj = fallbackQuotes[fallbackIndex];
    quoteTextEl.textContent = `"${quoteObj.text}"`;
    quoteAuthorEl.textContent = `- ${quoteObj.author || "Unknown"}`;
  } else {
    quoteTextEl.textContent = '"Focus on the step in front of you, not the whole staircase."';
    quoteAuthorEl.textContent = '- Motivation';
  }

  // Then try to fetch a fresh one in the background
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 seconds timeout

    // Attempt web fetch
    const response = await fetch("https://dummyjson.com/quotes/random", { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) throw new Error("Network response was not ok");
    const data = await response.json();

    if (data && data.quote) {
      quoteTextEl.textContent = `"${data.quote}"`;
      quoteAuthorEl.textContent = `- ${data.author || "Unknown"}`;

      appStorage.setItem("quoteLastFetchedDate", today);
      appStorage.setItem("dailyQuoteText", data.quote);
      appStorage.setItem("dailyQuoteAuthor", data.author);
    }
  } catch (error) {
    console.warn("Failed to fetch quote from web. Using fallback.", error);

    // Save the fallback so it doesn't try to fetch again on every tab reload today
    appStorage.setItem("quoteLastFetchedDate", today);
    // Remove the formatting we applied above to store cleanly
    const cleanText = quoteTextEl.textContent.replace(/^"|"$/g, '');
    const cleanAuthor = quoteAuthorEl.textContent.replace(/^- /, '');
    appStorage.setItem("dailyQuoteText", cleanText);
    appStorage.setItem("dailyQuoteAuthor", cleanAuthor);
  }
}

// ==================== QUOTE MODE MODAL (double-tap) ====================
(function initQuoteModeFeature() {
  // Inject CSS for the quote mode modal
  const quoteModalCSS = document.createElement('style');
  quoteModalCSS.textContent = `
    .bloom-progress-quote {
      cursor: pointer;
      position: relative;
      -webkit-user-select: none;
      user-select: none;
    }
    .bloom-progress-quote::after {
      content: '••';
      position: absolute;
      bottom: -2px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 0.4rem;
      color: var(--primary);
      opacity: 0.4;
      letter-spacing: 3px;
      transition: opacity 0.3s;
    }
    .bloom-progress-quote:active::after {
      opacity: 0.8;
    }
    .quote-mode-modal {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.45);
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      animation: qmFadeIn 0.25s ease;
    }
    .quote-mode-modal.hidden { display: none !important; }
    @keyframes qmFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes qmSlideUp {
      from { transform: translateY(30px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    .quote-mode-card {
      background: var(--card-bg, #fff);
      border-radius: 24px;
      padding: 28px 24px 20px;
      max-width: 380px;
      width: 100%;
      box-shadow: 0 25px 60px rgba(0,0,0,0.15), 0 0 0 1px rgba(255,140,66,0.1);
      animation: qmSlideUp 0.3s ease;
    }
    .quote-mode-header {
      text-align: center;
      margin-bottom: 20px;
    }
    .quote-mode-icon {
      font-size: 2rem;
      display: block;
      margin-bottom: 8px;
    }
    .quote-mode-header h3 {
      margin: 0 0 4px;
      font-size: 1.15rem;
      color: var(--text-main, #1e293b);
      font-weight: 700;
    }
    .quote-mode-sub {
      margin: 0;
      font-size: 0.75rem;
      color: var(--text-muted, #94a3b8);
    }
    .quote-mode-options {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-bottom: 16px;
    }
    .quote-mode-option {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 14px 16px;
      border-radius: 16px;
      border: 2px solid var(--border, #e2e8f0);
      background: var(--bg-input, #f8fafc);
      cursor: pointer;
      transition: all 0.25s ease;
      text-align: left;
      color: var(--text-main, #1e293b);
      font-family: inherit;
    }
    .quote-mode-option:hover {
      border-color: rgba(255,140,66,0.3);
      background: rgba(255,140,66,0.04);
    }
    .quote-mode-option.active {
      border-color: var(--primary, #FF8C42);
      background: rgba(255,140,66,0.08);
      box-shadow: 0 0 0 3px rgba(255,140,66,0.1);
    }
    .quote-mode-option-icon {
      font-size: 1.6rem;
      flex-shrink: 0;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 12px;
      background: rgba(255,140,66,0.08);
    }
    .quote-mode-option-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .quote-mode-option-title {
      font-size: 0.95rem;
      font-weight: 700;
    }
    .quote-mode-option-desc {
      font-size: 0.72rem;
      color: var(--text-muted, #94a3b8);
    }
    .quote-mode-check {
      width: 22px; height: 22px;
      border-radius: 50%;
      border: 2px solid var(--border, #e2e8f0);
      flex-shrink: 0;
      position: relative;
      transition: all 0.25s;
    }
    .quote-mode-option.active .quote-mode-check {
      border-color: var(--primary, #FF8C42);
      background: var(--primary, #FF8C42);
    }
    .quote-mode-option.active .quote-mode-check::after {
      content: '✓';
      position: absolute;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      color: #fff;
      font-size: 0.7rem;
      font-weight: 800;
    }
    .custom-quote-editor {
      margin-bottom: 14px;
      animation: qmSlideUp 0.25s ease;
    }
    .custom-quote-editor.hidden { display: none !important; }
    .custom-quote-editor textarea {
      width: 100%;
      padding: 12px 14px;
      border-radius: 14px;
      border: 2px solid var(--border, #e2e8f0);
      background: var(--bg-input, #f8fafc);
      color: var(--text-main, #1e293b);
      font-family: inherit;
      font-size: 0.9rem;
      font-style: italic;
      resize: none;
      outline: none;
      box-sizing: border-box;
      transition: border-color 0.3s;
      line-height: 1.5;
    }
    .custom-quote-editor textarea:focus {
      border-color: var(--primary, #FF8C42);
      box-shadow: 0 0 0 3px rgba(255,140,66,0.08);
    }
    .custom-quote-editor input[type="text"] {
      width: 100%;
      padding: 10px 14px;
      margin-top: 8px;
      border-radius: 12px;
      border: 2px solid var(--border, #e2e8f0);
      background: var(--bg-input, #f8fafc);
      color: var(--text-main, #1e293b);
      font-family: inherit;
      font-size: 0.82rem;
      font-weight: 600;
      outline: none;
      box-sizing: border-box;
      transition: border-color 0.3s;
    }
    .custom-quote-editor input[type="text"]:focus {
      border-color: var(--primary, #FF8C42);
    }
    .save-custom-quote-btn {
      width: 100%;
      margin-top: 10px;
      padding: 12px;
      border-radius: 14px;
      border: none;
      background: linear-gradient(135deg, #FF8C42, #FF6B35);
      color: #fff;
      font-size: 0.9rem;
      font-weight: 700;
      font-family: inherit;
      cursor: pointer;
      transition: all 0.25s;
      box-shadow: 0 6px 20px rgba(255,140,66,0.25);
    }
    .save-custom-quote-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 8px 25px rgba(255,140,66,0.35);
    }
    .save-custom-quote-btn:active {
      transform: scale(0.98);
    }
    .quote-mode-close-btn {
      width: 100%;
      padding: 12px;
      border-radius: 14px;
      border: 1px solid var(--border, #e2e8f0);
      background: transparent;
      color: var(--text-muted, #94a3b8);
      font-size: 0.9rem;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      transition: all 0.2s;
    }
    .quote-mode-close-btn:hover {
      background: var(--bg-input, #f8fafc);
      color: var(--text-main, #1e293b);
    }
  `;
  document.head.appendChild(quoteModalCSS);

  // ---- Double-tap detection (works on touch + mouse) ----
  let lastTapTime = 0;
  const DOUBLE_TAP_THRESHOLD = 400; // ms

  function handleQuoteDoubleTap(e) {
    const now = Date.now();
    if (now - lastTapTime < DOUBLE_TAP_THRESHOLD) {
      e.preventDefault();
      e.stopPropagation();
      showQuoteModeModal();
      lastTapTime = 0;
    } else {
      lastTapTime = now;
    }
  }

  document.addEventListener('DOMContentLoaded', function() {
    const quoteBar = document.querySelector('.bloom-progress-quote');
    if (!quoteBar) return;

    // Touch double-tap
    quoteBar.addEventListener('touchend', handleQuoteDoubleTap, { passive: false });
    // Mouse double-click fallback
    quoteBar.addEventListener('dblclick', function(e) {
      e.preventDefault();
      showQuoteModeModal();
    });
  });
})();

function showQuoteModeModal() {
  const modal = document.getElementById('quote-mode-modal');
  if (!modal) return;
  modal.classList.remove('hidden');

  const currentMode = appStorage.getItem('quoteMode') || 'default';
  const customBtn = document.getElementById('quote-mode-custom');
  const defaultBtn = document.getElementById('quote-mode-default');
  const editor = document.getElementById('custom-quote-editor');

  // Set active state
  customBtn.classList.toggle('active', currentMode === 'custom');
  defaultBtn.classList.toggle('active', currentMode !== 'custom');
  editor.classList.toggle('hidden', currentMode !== 'custom');

  // Pre-fill editor if custom quote exists
  if (currentMode === 'custom') {
    const savedText = appStorage.getItem('customQuoteText') || '';
    const savedAuthor = appStorage.getItem('customQuoteAuthor') || '';
    document.getElementById('custom-quote-input').value = savedText;
    document.getElementById('custom-quote-author').value = savedAuthor;
  }

  // ---- Event listeners (use onclick to avoid stacking) ----
  customBtn.onclick = function() {
    customBtn.classList.add('active');
    defaultBtn.classList.remove('active');
    editor.classList.remove('hidden');
    // Pre-fill
    const savedText = appStorage.getItem('customQuoteText') || '';
    const savedAuthor = appStorage.getItem('customQuoteAuthor') || '';
    document.getElementById('custom-quote-input').value = savedText;
    document.getElementById('custom-quote-author').value = savedAuthor;
    setTimeout(() => document.getElementById('custom-quote-input').focus(), 100);
  };

  defaultBtn.onclick = function() {
    defaultBtn.classList.add('active');
    customBtn.classList.remove('active');
    editor.classList.add('hidden');
    appStorage.setItem('quoteMode', 'default');
    // Clear the stored date to force a fresh fetch
    appStorage.removeItem('quoteLastFetchedDate');
    updateDailyQuote();
  };

  document.getElementById('save-custom-quote-btn').onclick = function() {
    const text = document.getElementById('custom-quote-input').value.trim();
    const author = document.getElementById('custom-quote-author').value.trim();
    if (!text) {
      document.getElementById('custom-quote-input').style.borderColor = '#ef4444';
      setTimeout(() => { document.getElementById('custom-quote-input').style.borderColor = ''; }, 1500);
      return;
    }
    appStorage.setItem('quoteMode', 'custom');
    appStorage.setItem('customQuoteText', text);
    appStorage.setItem('customQuoteAuthor', author);
    updateDailyQuote();
    // Brief visual feedback
    const btn = document.getElementById('save-custom-quote-btn');
    btn.textContent = '✅ Saved!';
    btn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
    setTimeout(() => {
      btn.textContent = '💾 Save Quote';
      btn.style.background = '';
    }, 1200);
  };

  document.getElementById('quote-mode-close').onclick = function() {
    hideQuoteModeModal();
  };

  // Close on backdrop click
  modal.onclick = function(e) {
    if (e.target === modal) hideQuoteModeModal();
  };
}

function hideQuoteModeModal() {
  const modal = document.getElementById('quote-mode-modal');
  if (modal) modal.classList.add('hidden');
}


function renderDashboard() {
  // Update Greeting
  updateGreeting();

  // Update Streak
  const dashStreak = document.getElementById("dash-streak");
  if (dashStreak) dashStreak.textContent = count.toString();

  // Update Tasks
  const items = Array.from(taskContainer.querySelectorAll("li"));
  const totalTasks = items.length;
  const completedTasks = items.filter(li => {
    const cb = li.querySelector("input[type='checkbox']:not(.task-select-cb)");
    return cb && cb.checked;
  }).length;
  const dashTasks = document.getElementById("dash-tasks");
  if (dashTasks) dashTasks.textContent = `${completedTasks}/${totalTasks}`;

  // Update Daily Vitality & Home Progress logic
  if (typeof updateBloomWidgets === "function") updateBloomWidgets();

  // Update Water
  const dashWater = document.getElementById("dash-water");
  if (dashWater && typeof waterGoal !== 'undefined') {
    dashWater.textContent = waterGoal > 0 ? `${waterConsumed} / ${waterGoal}ml` : `${waterConsumed}ml`;
  } else if (dashWater) {
    dashWater.textContent = `${waterConsumed}ml`;
  }
  const dashWaterProgress = document.getElementById("dash-water-progress");
  if (dashWaterProgress && typeof waterGoal !== 'undefined') {
    const wPercentage = waterGoal > 0 ? Math.min(100, (waterConsumed / waterGoal) * 100) : 0;
    dashWaterProgress.style.width = `${wPercentage}%`;
  }

  // Update Mood
  const dashMood = document.getElementById("dash-mood");
  if (dashMood && moodHistory.length > 0) {
    const lastMood = moodHistory[0];
    dashMood.textContent = `${getMoodEmoji(lastMood.mood)} ${lastMood.mood}`;
  }

  // Update Daily Focus Selection
  const focusSelect = document.getElementById("daily-focus-select");
  const focusSelectionDiv = document.getElementById("daily-focus-selection");
  const focusDisplayDiv = document.getElementById("daily-focus-display");
  const focusTextEl = document.getElementById("daily-focus-text");
  const focusEmojiEl = document.getElementById("daily-focus-emoji");
  const savedFocus = appStorage.getItem("dailyFocus");

  let focusTaskExists = false;
  let focusTaskEmoji = "🎯";

  if (focusSelect) {
    focusSelect.innerHTML = '<option value="">Select your most important task...</option>';

    items.forEach(li => {
      const cb = li.querySelector("input[type='checkbox']:not(.task-select-cb)");
      const span = li.querySelector("span:not(.task-emoji):not(.task-tag)");
      const emojiBadge = li.querySelector(".task-emoji");

      if (span) {
        const text = span.textContent || "";
        const emoji = emojiBadge ? emojiBadge.textContent : "✅";

        if (savedFocus === text) {
          focusTaskExists = true;
          focusTaskEmoji = emoji;
        }

        if (cb && !cb.checked) {
          const option = document.createElement("option");
          option.value = text;
          option.textContent = `${emoji} ${text}`;
          focusSelect.appendChild(option);
        }
      }
    });

    if (savedFocus && focusTaskExists) {
      if (focusSelectionDiv) focusSelectionDiv.classList.add("hidden");
      if (focusDisplayDiv) focusDisplayDiv.classList.remove("hidden");
      if (focusTextEl) focusTextEl.textContent = savedFocus;
      if (focusEmojiEl) focusEmojiEl.textContent = focusTaskEmoji;
    } else {
      if (focusSelectionDiv) focusSelectionDiv.classList.remove("hidden");
      if (focusDisplayDiv) focusDisplayDiv.classList.add("hidden");
    }
  }
  updateDailyFocusHighlights();
}

function saveDailyFocus() {
  const select = /** @type {HTMLSelectElement} */ (document.getElementById("daily-focus-select"));
  if (select && select.value) {
    appStorage.setItem("dailyFocus", select.value);
    saveState();
    showNotification("🎯 Daily focus updated!");
    renderDashboard();
  }
}

function clearDailyFocus() {
  appStorage.removeItem("dailyFocus");
  saveState();
  showNotification("🎯 Daily focus cleared.");
  renderDashboard();
}

function updateDailyFocusHighlights() {
  const savedFocus = appStorage.getItem("dailyFocus");
  const items = Array.from(taskContainer.querySelectorAll("li"));

  items.forEach(li => {
    const span = li.querySelector("span:not(.task-emoji):not(.task-tag)");
    if (!span) return;
    const taskText = span.textContent || "";

    if (savedFocus && taskText === savedFocus) {
      li.classList.add("daily-focus-task");
    } else {
      li.classList.remove("daily-focus-task");
    }
  });
}

// --- 7. WATER HISTORY LOGIC ---
let waterHistory = JSON.parse(appStorage.getItem("waterHistory") || "[]");

function recordWaterIntake() {
  const today = new Date().toDateString();
  let entry = waterHistory.find(e => e.date === today);
  if (!entry) {
    entry = { date: today, amount: 0 };
    waterHistory.push(entry);
  }
  entry.amount = waterConsumed;
  if (waterHistory.length > 7) waterHistory.shift();
  appStorage.setItem("waterHistory", JSON.stringify(waterHistory));
  renderWaterChart();
}

function renderWaterChart() {
  const chart = document.getElementById("water-history-chart");
  if (!chart) return;
  chart.innerHTML = "";

  const maxAmount = Math.max(waterGoal, ...waterHistory.map(e => e.amount), 1);

  for (let i = 0; i < 7; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    const dateStr = date.toDateString();
    const entry = waterHistory.find(e => e.date === dateStr);
    const amount = entry ? entry.amount : 0;
    const percentage = Math.min(100, (amount / maxAmount) * 100);

    const barContainer = document.createElement("div");
    barContainer.className = "chart-bar-container";
    barContainer.innerHTML = `
            <div class="chart-bar" style="height: 100px;">
                <div class="chart-bar-fill" style="height: ${percentage}%;"></div>
            </div>
            <span class="chart-label">${dateStr.split(' ')[0]}</span>
        `;
    chart.appendChild(barContainer);
  }
}

// --- 10. BACKUP & RESTORE ---
function exportData() {
  const data = JSON.stringify(appStorage);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `habittracker_backup_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showNotification("📤 Data exported successfully!");
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const data = JSON.parse(e.target.result);
      appStorage.clear();
      for (const key in data) {
        appStorage.setItem(key, data[key]);
      }
      showNotification("📥 Data restored! Reloading...");
      setTimeout(() => location.reload(), 1500);
    } catch (err) {
      alert("Error importing data: " + err.message);
    }
  };
  reader.readAsText(file);
}




// Event listeners for new Pomodoro timer
document.getElementById('start-pomodoro-new')?.addEventListener('click', startNewPomodoro);
document.getElementById('pause-pomodoro-new')?.addEventListener('click', pauseNewPomodoro);
document.getElementById('reset-pomodoro-new')?.addEventListener('click', resetNewPomodoro);

// ==================== ADVANCED CUSTOM THEME STUDIO ====================
const ctsInputs = {
  bg: document.getElementById("custom-bg-color"),
  card: document.getElementById("custom-card-color"),
  primary: document.getElementById("custom-primary-color"),
  secondary: document.getElementById("custom-secondary-color"),
  text: document.getElementById("custom-text-color"),
  border: document.getElementById("custom-border-color")
};

const ctsState = {
  colors: { bg: '#f4f7f6', card: '#ffffff', primary: '#667eea', secondary: '#764ba2', text: '#2d3748', border: '#e0e0e0' },
  anim: 'none',
  font: 'default',
  radius: '12',
  btnStyle: 'solid',
  cardStyle: 'shadow'
};

function applyCtsStateToUI() {
  if (!ctsInputs.bg) return;
  // Update Color Inputs
  Object.keys(ctsInputs).forEach(key => {
    if (ctsInputs[key]) ctsInputs[key].value = ctsState.colors[key];
  });

  // Update Animation Buttons
  document.querySelectorAll('.cts-anim-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.anim === ctsState.anim);
  });

  // Update Font Buttons
  document.querySelectorAll('.cts-font-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.font === ctsState.font);
  });

  // Update Radius Slider
  const slider = document.getElementById("cts-radius-slider");
  if (slider) slider.value = ctsState.radius;

  // Update Style Picks
  document.querySelectorAll('.cts-style-pick[data-btnstyle]').forEach(b => {
    b.classList.toggle('active', b.dataset.btnstyle === ctsState.btnStyle);
  });
  document.querySelectorAll('.cts-style-pick[data-cardstyle]').forEach(b => {
    b.classList.toggle('active', b.dataset.cardstyle === ctsState.cardStyle);
  });
}

function applyCtsStateToDom() {
  // Apply Colors
  document.documentElement.style.setProperty('--bg-base', ctsState.colors.bg);
  document.documentElement.style.setProperty('--bg-card', ctsState.colors.card);
  document.documentElement.style.setProperty('--primary', ctsState.colors.primary);
  document.documentElement.style.setProperty('--secondary', ctsState.colors.secondary);
  document.documentElement.style.setProperty('--text-main', ctsState.colors.text);
  document.documentElement.style.setProperty('--border', ctsState.colors.border);
  document.documentElement.style.setProperty('--custom-radius', ctsState.radius + 'px');

  // Set body classes for styling modes
  document.body.className = `theme-custom anim-${ctsState.anim} font-${ctsState.font} btnstyle-${ctsState.btnStyle} cardstyle-${ctsState.cardStyle}`;
}

// Wire up Color Inputs
Object.keys(ctsInputs).forEach(key => {
  ctsInputs[key]?.addEventListener("input", function () {
    ctsState.colors[key] = this.value;
    applyCtsStateToDom();
  });
});

// Wire up Animations
document.querySelectorAll('.cts-anim-btn').forEach(btn => {
  btn.addEventListener("click", function () {
    ctsState.anim = this.dataset.anim;
    applyCtsStateToUI();
    applyCtsStateToDom();
  });
});

// Wire up Fonts
document.querySelectorAll('.cts-font-btn').forEach(btn => {
  btn.addEventListener("click", function () {
    ctsState.font = this.dataset.font;
    applyCtsStateToUI();
    applyCtsStateToDom();
  });
});

// Wire up Slider
document.getElementById("cts-radius-slider")?.addEventListener("input", function () {
  ctsState.radius = this.value;
  applyCtsStateToDom();
});

// Wire up Styles
document.querySelectorAll('.cts-style-pick[data-btnstyle]').forEach(btn => {
  btn.addEventListener("click", function () {
    ctsState.btnStyle = this.dataset.btnstyle;
    applyCtsStateToUI();
    applyCtsStateToDom();
  });
});
document.querySelectorAll('.cts-style-pick[data-cardstyle]').forEach(btn => {
  btn.addEventListener("click", function () {
    ctsState.cardStyle = this.dataset.cardstyle;
    applyCtsStateToUI();
    applyCtsStateToDom();
  });
});

// Load Custom Theme
function loadCustomTheme() {
  const saved = appStorage.getItem("customThemeStudio");
  if (saved) {
    Object.assign(ctsState, JSON.parse(saved));
  }
}

// Wire up Theme Builder activation
document.querySelectorAll(".theme-btn").forEach(btn => {
  btn.addEventListener("click", function () {
    const theme = this.getAttribute("data-theme");
    appStorage.setItem("appTheme", theme);
    document.querySelectorAll(".theme-btn").forEach(b => b.classList.remove("active"));
    this.classList.add("active");

    const builder = document.getElementById("custom-theme-builder");
    if (theme === "custom") {
      builder.classList.remove("hidden");
      loadCustomTheme();
      applyCtsStateToUI();
      applyCtsStateToDom();
    } else {
      builder.classList.add("hidden");
      // Clean up DOM overrides
      document.body.className = `theme-${theme}`;
      document.documentElement.style.removeProperty('--bg-base');
      document.documentElement.style.removeProperty('--bg-card');
      document.documentElement.style.removeProperty('--primary');
      document.documentElement.style.removeProperty('--secondary');
      document.documentElement.style.removeProperty('--text-main');
      document.documentElement.style.removeProperty('--border');
      document.documentElement.style.removeProperty('--custom-radius');
    }
  });
});

// Save Custom Theme
document.getElementById("save-custom-theme-btn")?.addEventListener("click", function () {
  appStorage.setItem("customThemeStudio", JSON.stringify(ctsState));
  showNotification("💾 Studio Theme Saved Successfully!");
});

// Reset Custom Theme
document.getElementById("reset-custom-theme-btn")?.addEventListener("click", function () {
  ctsState.colors = { bg: '#f4f7f6', card: '#ffffff', primary: '#667eea', secondary: '#764ba2', text: '#2d3748', border: '#e0e0e0' };
  ctsState.anim = 'none';
  ctsState.font = 'default';
  ctsState.radius = '12';
  ctsState.btnStyle = 'solid';
  ctsState.cardStyle = 'shadow';
  applyCtsStateToUI();
  applyCtsStateToDom();
  appStorage.removeItem("customThemeStudio");
  showNotification("🔄 Studio Theme Reset to Default!");
});

// Preset logic
const ctsPresets = {
  midnight: { colors: { bg: '#0f0c29', card: '#1a1a2e', primary: '#bb86fc', secondary: '#03dac6', text: '#e0e0e0', border: '#2d2d44' }, anim: 'pulse-glow', font: 'jetbrains', radius: '8', btnStyle: 'outline', cardStyle: 'glass' },
  aurora: { colors: { bg: '#e0f7fa', card: '#ffffff', primary: '#00c9ff', secondary: '#92fe9d', text: '#004d40', border: '#b2dfdb' }, anim: 'float', font: 'outfit', radius: '20', btnStyle: 'gradient', cardStyle: 'flat' },
  sakura: { colors: { bg: '#fff0f5', card: '#ffffff', primary: '#ff9a9e', secondary: '#fecfef', text: '#5d4037', border: '#f8bbd0' }, anim: 'shimmer', font: 'playfair', radius: '30', btnStyle: 'solid', cardStyle: 'shadow' },
  emerald: { colors: { bg: '#f1f8e9', card: '#ffffff', primary: '#11998e', secondary: '#38ef7d', text: '#1b5e20', border: '#c8e6c9' }, anim: 'none', font: 'inter', radius: '12', btnStyle: 'ghost', cardStyle: 'neumorphic' },
  lava: { colors: { bg: '#212121', card: '#303030', primary: '#f12711', secondary: '#f5af19', text: '#ffffff', border: '#424242' }, anim: 'neon', font: 'space-grotesk', radius: '0', btnStyle: 'outline', cardStyle: 'flat' },
  pastel: { colors: { bg: '#fdfbfb', card: '#ffffff', primary: '#ffecd2', secondary: '#fcb69f', text: '#5c4e4e', border: '#f5ebeb' }, anim: 'float', font: 'outfit', radius: '16', btnStyle: 'gradient', cardStyle: 'glass' }
};

document.querySelectorAll('.cts-preset-btn').forEach(btn => {
  btn.addEventListener("click", function () {
    const presetId = this.dataset.preset;
    if (ctsPresets[presetId]) {
      Object.assign(ctsState, ctsPresets[presetId]);
      applyCtsStateToUI();
      applyCtsStateToDom();
      // Optional: auto-save on preset click (can leave to user)
    }
  });
});


// Initialize display
updateNewTimerDisplay();

// ==================== PRODUCTIVITY HUB MODAL LOGIC ====================
const hubBtn = document.getElementById("cheatsheet-btn");
const hubModal = document.getElementById("cheatsheet-modal");
const closeHubBtn = document.getElementById("close-cheatsheet");
const backToHubBtn = document.getElementById("back-to-hub");
const hubCategoriesView = document.getElementById("hub-categories-view");
const hubContentView = document.getElementById("hub-content-view");
const hubContentTitle = document.getElementById("hub-content-title");
const hubCards = document.querySelectorAll(".hub-card");

if (hubBtn && hubModal) {
  hubBtn.addEventListener("click", () => {
    // Reset to categories view on open
    hubCategoriesView?.classList.remove("hidden");
    hubContentView?.classList.add("hidden");
    hubModal.classList.remove("hidden");
  });

  closeHubBtn?.addEventListener("click", () => {
    hubModal.classList.add("hidden");
  });

  // Close on click outside
  hubModal.addEventListener("click", (e) => {
    if (e.target === hubModal) {
      hubModal.classList.add("hidden");
    }
  });

  // Handle Category Selection
  hubCards.forEach(card => {
    card.addEventListener("click", () => {
      const category = card.getAttribute("data-category");
      const label = card.querySelector("span").textContent;

      // Update Title
      if (hubContentTitle) hubContentTitle.textContent = label;

      // Switch Views
      hubCategoriesView?.classList.add("hidden");
      hubContentView?.classList.remove("hidden");

      // Hide all contents and show specific one
      document.querySelectorAll(".cat-content").forEach(el => el.classList.add("hidden"));
      const targetContent = document.getElementById(`cat-${category}`);
      if (targetContent) {
        targetContent.classList.remove("hidden");
        // Reset scroll to top
        const scrollContainer = document.querySelector(".hub-scrollable-content");
        if (scrollContainer) scrollContainer.scrollTop = 0;
      }
    });
  });

  // Back to Categories
  backToHubBtn?.addEventListener("click", () => {
    hubContentView?.classList.add("hidden");
    hubCategoriesView?.classList.remove("hidden");
  });

  // Handle Escape key
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !hubModal.classList.contains("hidden")) {
      hubModal.classList.add("hidden");
    }
  });
}

// ==================== GAME CHANGING TIPS GENERATOR ====================
const generateTipBtn = document.getElementById("generate-tip-btn");
const tipDisplayArea = document.getElementById("tip-display-area");
const tipText = document.getElementById("tip-text");

if (generateTipBtn && tipDisplayArea && tipText) {
  generateTipBtn.addEventListener("click", () => {
    if (window.gameChangingTips && window.gameChangingTips.length > 0) {
      // Pick a random tip from the 1000 generated
      const randomIndex = Math.floor(Math.random() * window.gameChangingTips.length);
      const selectedTip = window.gameChangingTips[randomIndex];

      // Add a small animation effect
      tipDisplayArea.style.opacity = 0;
      setTimeout(() => {
        tipText.textContent = `"${selectedTip}"`;
        tipDisplayArea.classList.remove("hidden");
        tipDisplayArea.style.opacity = 1;
      }, 150);
    } else {
      tipText.textContent = "Tips are still loading... Check back in a moment!";
      tipDisplayArea.classList.remove("hidden");
    }
  });
}

// ==================== IMAGE LIGHTBOX / EXPANSION ====================
// Create the overlay dynamically once
const lightboxOverlay = document.createElement("div");
lightboxOverlay.className = "lightbox-overlay";
const lightboxImg = document.createElement("img");
lightboxImg.className = "lightbox-img";
lightboxOverlay.appendChild(lightboxImg);
document.body.appendChild(lightboxOverlay);

// Close lightbox on click
lightboxOverlay.addEventListener("click", () => {
  lightboxOverlay.classList.remove("active");
  setTimeout(() => { lightboxImg.src = ""; }, 300); // clear src after fade out
});

// Bind all expandable images
const expandableImages = document.querySelectorAll(".expandable-img");
expandableImages.forEach(img => {
  img.addEventListener("click", () => {
    lightboxImg.src = img.src;
    lightboxImg.alt = img.alt;
    lightboxOverlay.classList.add("active");
  });
});

// Initialize storage (restores from IndexedDB if localStorage was wiped), then load state
let _appInitPromise = appStorage.init().then(async () => {
  await loadAIChatsFromForage(); // Safely load the AI chat history cache NOW
  loadState();
}).catch(async () => {
  await loadAIChatsFromForage(); 
  loadState(); // Fallback: load from whatever localStorage has
});

// ==================== ANMOL AI CHATBOT ====================
let aiConversationHistory = [];
let currentAIChatId = null;

// --- Chat History Management (IndexedDB) ---
let _aiChatSessionsCache = [];

// This function must be called exactly once ON STARTUP, strictly AFTER appStorage.init() configures localForage!!
async function loadAIChatsFromForage() {
  if (typeof localforage !== 'undefined') {
    try {
      const stored = await localforage.getItem("aiChatSessions");
      if (stored && Array.isArray(stored)) {
        _aiChatSessionsCache = stored;
      } else {
        // Fallback: load legacy from localStorage just in case it wasn't migrated
        try {
          const oldStorage = JSON.parse(appStorage.getItem("aiChatSessions") || "[]");
          if (Array.isArray(oldStorage) && oldStorage.length > 0) {
            _aiChatSessionsCache = oldStorage;
            await localforage.setItem("aiChatSessions", oldStorage);
          }
        } catch(e) {}
      }
    } catch(e) {}
  }
}

function getAIChatSessions() {
  return _aiChatSessionsCache;
}

function saveAIChatSessions(sessions) {
  _aiChatSessionsCache = sessions;
  if (typeof localforage !== 'undefined') {
    localforage.setItem("aiChatSessions", sessions).catch(e => console.warn(e));
  }
}

function createNewAIChat() {
  const sessions = getAIChatSessions();
  const newChat = {
    id: Date.now().toString(),
    title: "New Chat",
    messages: [],
    createdAt: new Date().toISOString()
  };
  sessions.unshift(newChat);
  saveAIChatSessions(sessions);
  loadAIChat(newChat.id);
  renderAIChatSidebar();
}

function loadAIChat(chatId) {
  const sessions = getAIChatSessions();
  const session = sessions.find(s => s.id === chatId);
  if (!session) return;

  currentAIChatId = chatId;
  aiConversationHistory = session.messages.map(m => ({ role: m.role, text: m.text }));

  // Render messages
  const messagesEl = document.getElementById("ai-chat-messages");
  if (!messagesEl) return;

  // Keep the welcome message
  messagesEl.innerHTML = `
    <div class="ai-message ai-bot-message">
      <div class="ai-msg-avatar" style="padding:0; overflow:hidden;"><img src="anmol-ai-avatar.jpeg" style="width:100%; height:100%; object-fit:cover;"></div>
      <div class="ai-msg-bubble">
        Namaste! 🇳🇵👋🔥 I'm <strong>Anmol AI</strong>, an advanced assistant built by the brilliant <strong>Anmol Jha</strong>. 
        <br><br>My core purpose is to <strong>enhance your productivity</strong> and <strong>faithfully follow your exact instructions</strong>. 
        <br><br>What makes me special? I have <strong>full real-time access to your dashboard!</strong> 👀 I know these things about you: your <strong>Daily Habits</strong>, your <strong>Vitality Score</strong>, your <strong>Sleep Logs</strong>, and your current <strong>Mood</strong>. I use these stats to give you deeply personalized coaching and recommend specific app features! 🚀
        <br><br>I also specialize in the <strong>Nepali Language</strong> 🇳🇵 (and Ninglish!) — just tell me if you prefer to chat in it!
        <br><br>Ask me to <em>"Review my habits today"</em>, <em>"Analyze my vitality"</em>, or just let me help you crush your tasks! 💯
      </div>
    </div>
  `;

  // Re-render past messages
  for (const msg of session.messages) {
    appendAIMessage(msg.text, msg.role === "user", true);
  }

  renderAIChatSidebar();
}

function saveCurrentChat() {
  if (!currentAIChatId) return;
  const sessions = getAIChatSessions();
  const session = sessions.find(s => s.id === currentAIChatId);
  if (!session) return;

  session.messages = aiConversationHistory.map(m => ({ role: m.role, text: m.text }));

  // Auto-title from first user message
  const firstUserMsg = session.messages.find(m => m.role === "user");
  if (firstUserMsg && session.title === "New Chat") {
    session.title = firstUserMsg.text.substring(0, 40) + (firstUserMsg.text.length > 40 ? "..." : "");
  }

  saveAIChatSessions(sessions);
  renderAIChatSidebar();
}

function deleteAIChat(chatId) {
  let sessions = getAIChatSessions();
  sessions = sessions.filter(s => s.id !== chatId);
  saveAIChatSessions(sessions);

  if (currentAIChatId === chatId) {
    if (sessions.length > 0) {
      loadAIChat(sessions[0].id);
    } else {
      createNewAIChat();
    }
  }
  renderAIChatSidebar();
}

function renderAIChatSidebar() {
  const sidebar = document.getElementById("ai-chat-sidebar-list");
  if (!sidebar) return;

  const sessions = getAIChatSessions();
  sidebar.innerHTML = "";

  sessions.forEach(s => {
    const item = document.createElement("div");
    item.className = "ai-sidebar-item" + (s.id === currentAIChatId ? " active" : "");

    const titleSpan = document.createElement("span");
    titleSpan.className = "ai-sidebar-title";
    titleSpan.textContent = s.title;
    titleSpan.addEventListener("click", () => loadAIChat(s.id));

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "ai-sidebar-delete";
    deleteBtn.textContent = "🗑";
    deleteBtn.title = "Delete chat";
    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      deleteAIChat(s.id);
    });

    item.appendChild(titleSpan);
    item.appendChild(deleteBtn);
    sidebar.appendChild(item);
  });
}

// --- Privacy-First Context Gathering ---
function gatherAppContext() {
  const userName = getUserName() || "friend";

  // Habits (Numbers only)
  let hbTasks = 0;
  let hbCompleted = 0;
  try {
    const loadedHabits = JSON.parse(appStorage.getItem("userHabits") || "[]");
    hbTasks = loadedHabits.length;
    hbCompleted = loadedHabits.filter(h => h.completedToday).length;
  } catch (e) {}

  // Vitality Score
  let vitalityScore = 0;
  if (typeof getVitalityScore === "function") {
    vitalityScore = getVitalityScore();
  }

  // Mood
  let latestMood = null;
  if (typeof moodHistory !== 'undefined' && moodHistory.length > 0) {
    latestMood = moodHistory[0];
  }

  // Sleep
  let sleepAvg = null;
  if (typeof sleepLogs !== 'undefined' && sleepLogs.length > 0) {
    const totalSleep = sleepLogs.reduce((sum, log) => sum + (log.hours || 0), 0);
    sleepAvg = (totalSleep / sleepLogs.length).toFixed(1);
  }

  return {
    userName,
    currentTime: new Date().toLocaleString(),
    habits: {
      total: hbTasks,
      completed: hbCompleted
    },
    vitality: vitalityScore,
    mood: latestMood,
    sleepAvg,
    aiPersonality: appStorage.getItem("aiPersonality") || "savage",
    globalMemory: appStorage.getItem("aiGlobalMemory") || ""
  };
}

function appendAIMessage(text, isUser, skipScroll) {
  const messagesEl = document.getElementById("ai-chat-messages");
  if (!messagesEl) return;

  const msgDiv = document.createElement("div");
  msgDiv.className = "ai-message " + (isUser ? "ai-user-message" : "ai-bot-message");

  const avatar = document.createElement("div");
  avatar.className = "ai-msg-avatar";
  if (isUser) { avatar.textContent = '👤'; } else { avatar.style.padding = '0'; avatar.style.overflow = 'hidden'; avatar.innerHTML = '<img src="anmol-ai-avatar.jpeg" style="width:100%; height:100%; object-fit:cover;">'; }

  const bubble = document.createElement("div");
  bubble.className = "ai-msg-bubble";

  if (isUser) {
    bubble.textContent = text;
  } else {
    let formatted = text
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');
    bubble.innerHTML = formatted;
  }

  msgDiv.appendChild(avatar);
  msgDiv.appendChild(bubble);
  messagesEl.appendChild(msgDiv);

  if (!skipScroll) {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }
}

function showAITyping() {
  const indicator = document.getElementById("ai-typing-indicator");
  if (indicator) indicator.classList.remove("hidden");
  const messagesEl = document.getElementById("ai-chat-messages");
  if (messagesEl) messagesEl.scrollTop = messagesEl.scrollHeight;
}

function hideAITyping() {
  const indicator = document.getElementById("ai-typing-indicator");
  if (indicator) indicator.classList.add("hidden");
}

let currentAttachedFileData = null;

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function attachFile(file) {
  if (!file) return;
  const preview = document.getElementById("ai-attachment-preview");
  const nameLabel = document.getElementById("ai-attachment-name");
  const sizeLabel = document.getElementById("ai-attachment-size");
  const thumb = document.getElementById("ai-attach-thumb");
  const fileIcon = document.getElementById("ai-attach-file-icon");

  if (file.size > 2 * 1024 * 1024) {
    alert("File is too large! Please select a file under 2MB.");
    const input = document.getElementById("ai-file-input");
    if (input) input.value = '';
    return;
  }

  const isImage = file.type && file.type.startsWith("image/");

  const reader = new FileReader();
  reader.onload = function (e) {
    currentAttachedFileData = {
      name: file.name,
      mimeType: file.type || "text/plain",
      data: e.target.result.split(',')[1] // Base64 chunk
    };
    if (nameLabel) nameLabel.textContent = file.name;
    if (sizeLabel) sizeLabel.textContent = formatFileSize(file.size);

    // Show image thumbnail or file icon
    if (isImage && thumb) {
      thumb.src = e.target.result;
      thumb.style.display = "block";
      if (fileIcon) fileIcon.style.display = "none";
    } else {
      if (thumb) { thumb.style.display = "none"; thumb.src = ""; }
      if (fileIcon) {
        // Pick an icon based on extension
        const ext = file.name.split('.').pop().toLowerCase();
        const icons = { js: '📜', py: '🐍', html: '🌐', css: '🎨', json: '📋', md: '📝', csv: '📊', txt: '📄' };
        fileIcon.textContent = icons[ext] || '📄';
        fileIcon.style.display = "flex";
      }
    }

    if (preview) preview.style.display = "block";
  };
  reader.readAsDataURL(file);
}

function clearAttachment() {
  currentAttachedFileData = null;
  const preview = document.getElementById("ai-attachment-preview");
  const input = document.getElementById("ai-file-input");
  const thumb = document.getElementById("ai-attach-thumb");
  const fileIcon = document.getElementById("ai-attach-file-icon");
  if (preview) preview.style.display = "none";
  if (input) input.value = "";
  if (thumb) { thumb.style.display = "none"; thumb.src = ""; }
  if (fileIcon) fileIcon.style.display = "none";
}

async function sendMessageToAnmolAI(userMessage) {
  if (!userMessage.trim() && !currentAttachedFileData) return;

  // Auto-create a chat if none exists
  if (!currentAIChatId) {
    const sessions = getAIChatSessions();
    if (sessions.length === 0) {
      createNewAIChat();
    } else {
      currentAIChatId = sessions[0].id;
    }
  }

  const context = gatherAppContext();

  const payload = {
    message: userMessage,
    context: context,
    // Send history before we push the current message to it
    history: aiConversationHistory.slice(-20)
  };

  if (currentAttachedFileData) {
    payload.attachedFile = currentAttachedFileData;
    // Visually append that a file was sent
    appendAIMessage(`📎 [Attached: ${currentAttachedFileData.name}]<br>` + userMessage, true);
    aiConversationHistory.push({ role: "user", text: `[Attached File: ${currentAttachedFileData.name}]\n${userMessage}` });
    clearAttachment(); // reset for next message
  } else {
    appendAIMessage(userMessage, true);
    aiConversationHistory.push({ role: "user", text: userMessage });
  }

  saveCurrentChat();
  showAITyping();

  try {
    const response = await fetch("/.netlify/functions/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    hideAITyping();

    if (!response.ok) {
      const errText = await response.text();
      let errMsg = `Something went wrong (HTTP ${response.status}).`;
      try {
        const errData = JSON.parse(errText);
        if (errData.error) errMsg += ` Details: ${errData.error}`;
        if (errData.details) errMsg += ` - ${errData.details}`;
      } catch (e) {
        // If it's HTML (like 404 not found), show a snippet
        errMsg += ` Server says: ${errText.substring(0, 60)}`;
      }
      appendAIMessage("⚠️ " + errMsg, false);
      aiConversationHistory.pop(); // Remove the user message that failed
      saveCurrentChat();
      return;
    }

    const data = await response.json();
    let reply = data.reply || "Hmm... I got nothing. Try asking again! 🤷";

    // Extract [MEMORY_APPEND: fact] commands
    const memoryMatchRegex = /\[MEMORY_APPEND:\s*(.*?)\]/gi;
    let memoriesFound = [];
    let match;
    while ((match = memoryMatchRegex.exec(reply)) !== null) {
      if (match[1]) memoriesFound.push(match[1].trim());
    }

    if (memoriesFound.length > 0) {
      // Append to the local storage global memory block
      let currentMemory = appStorage.getItem("aiGlobalMemory") || "";
      memoriesFound.forEach(mem => {
        if (!currentMemory.includes(mem)) {
          currentMemory += `\n- ${mem}`;
        }
      });
      appStorage.setItem("aiGlobalMemory", currentMemory.trim());
      
      // Clean the bot's response by stripping out the hidden commands
      reply = reply.replace(memoryMatchRegex, "").trim();
    }

    aiConversationHistory.push({ role: "model", text: reply });
    saveCurrentChat();
    appendAIMessage(reply, false);

  } catch (err) {
    hideAITyping();
    console.error("Anmol AI error:", err);
    appendAIMessage("⚠️ Couldn't reach Anmol AI. Make sure you're online and the app is deployed on Netlify! 🌐", false);
    aiConversationHistory.pop(); // Remove the user message that failed
    saveCurrentChat();
  }
}

async function showAnmolAIPage() {
  // Prevent race conditions: Ensure app load (and IndexedDB fetch) is totally finished first
  if (typeof _appInitPromise !== "undefined" && _appInitPromise) {
    await _appInitPromise;
  }

  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  const aiPage = document.getElementById("anmol-ai-page");
  if (aiPage) {
    aiPage.classList.add("active");
    aiPage.style.display = "block";
  }
  // Removed old FAB hide logic

  // Load last chat or create new
  const sessions = getAIChatSessions();
  if (sessions.length === 0) {
    createNewAIChat();
  } else if (!currentAIChatId) {
    loadAIChat(sessions[0].id);
  }
  renderAIChatSidebar();

  setTimeout(() => {
    const input = document.getElementById("ai-chat-input");
    if (input) input.focus();
  }, 300);
}

function closeAnmolAIPage() {
  const aiPage = document.getElementById("anmol-ai-page");
  if (aiPage) {
    aiPage.classList.remove("active");
    aiPage.style.display = "none";
  }
  // Removed old FAB show logic
  showPage("main");
}

function toggleAIChatSidebar() {
  const sidebar = document.getElementById("ai-chat-sidebar");
  const container = document.querySelector(".ai-chat-container");
  if (sidebar) {
    sidebar.classList.toggle("open");
    if (container) container.classList.toggle("sidebar-open", sidebar.classList.contains("open"));
  }
}

function closeAIChatSidebar() {
  const sidebar = document.getElementById("ai-chat-sidebar");
  const container = document.querySelector(".ai-chat-container");
  if (sidebar) sidebar.classList.remove("open");
  if (container) container.classList.remove("sidebar-open");
}

// Wire up events
document.addEventListener("DOMContentLoaded", function () {
  const aiFab = document.getElementById("anmol-ai-header-btn");
  if (aiFab) aiFab.addEventListener("click", showAnmolAIPage);

  const closeBtn = document.getElementById("closeAnmolAI");
  if (closeBtn) closeBtn.addEventListener("click", closeAnmolAIPage);

  const historyBtn = document.getElementById("ai-history-btn");
  if (historyBtn) historyBtn.addEventListener("click", toggleAIChatSidebar);

  const sidebarCloseBtn = document.getElementById("ai-sidebar-close-btn");
  if (sidebarCloseBtn) sidebarCloseBtn.addEventListener("click", closeAIChatSidebar);

  // Close sidebar when clicking the dimmed backdrop
  const chatContainer = document.querySelector(".ai-chat-container");
  if (chatContainer) {
    chatContainer.addEventListener("click", function (e) {
      if (e.target === chatContainer && chatContainer.classList.contains("sidebar-open")) {
        closeAIChatSidebar();
      }
    });
  }

  const newChatBtn = document.getElementById("ai-new-chat-btn");
  if (newChatBtn) newChatBtn.addEventListener("click", () => {
    createNewAIChat();
    closeAIChatSidebar();
  });

  const sendBtn = document.getElementById("ai-send-btn");
  const chatInput = document.getElementById("ai-chat-input");
  const attachBtn = document.getElementById("ai-attach-btn");
  const fileInput = document.getElementById("ai-file-input");
  const removeAttachBtn = document.getElementById("ai-attachment-remove");

  if (attachBtn && fileInput) {
    attachBtn.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", (e) => {
      if (e.target.files && e.target.files.length > 0) attachFile(e.target.files[0]);
    });
  }

  if (removeAttachBtn) {
    removeAttachBtn.addEventListener("click", clearAttachment);
  }

  if (sendBtn && chatInput) {
    sendBtn.addEventListener("click", function () {
      const msg = chatInput.value.trim();
      if (msg || currentAttachedFileData) { chatInput.value = ""; sendMessageToAnmolAI(msg); }
    });
    chatInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        const msg = chatInput.value.trim();
        if (msg || currentAttachedFileData) { chatInput.value = ""; sendMessageToAnmolAI(msg); }
      }
    });
  }
});


// --- Meditation Ambient Background Generator ---
function initMeditationAmbient() {
  const container = document.getElementById("med-particles");
  if (!container) return;
  container.innerHTML = "";
  for (let i = 0; i < 20; i++) {
    const p = document.createElement("div");
    p.className = "med-particle";
    const size = Math.random() * 4 + 2;
    p.style.width = size + "px";
    p.style.height = size + "px";
    p.style.left = Math.random() * 100 + "%";
    p.style.animationDuration = (8 + Math.random() * 8) + "s";
    p.style.animationDelay = "-" + (Math.random() * 8) + "s";
    p.style.opacity = Math.random() * 0.4 + 0.1;
    container.appendChild(p);
  }
}
document.addEventListener("DOMContentLoaded", initMeditationAmbient);

// ==================== BIG GOAL UI & LOGIC ====================
document.addEventListener("DOMContentLoaded", () => {
  const display = document.getElementById("big-goal-display");
  const input = document.getElementById("big-goal-input");
  const editBtn = document.getElementById("edit-big-goal-btn");
  const saveBtn = document.getElementById("save-big-goal-btn");
  const editArea = document.getElementById("big-goal-edit-area");

  if (!display || !input || !editBtn || !saveBtn || !editArea) return;

  // Load initial
  const savedGoal = appStorage.getItem("bigGoal");
  if (savedGoal) {
    display.textContent = savedGoal;
  }

  editBtn.addEventListener("click", () => {
    input.value = appStorage.getItem("bigGoal") || "";
    display.classList.add("hidden");
    display.style.display = "none";
    editArea.classList.remove("hidden");
    editArea.style.display = "flex";
    input.focus();
  });

  const saveGoal = () => {
    const val = input.value.trim();
    if (val) {
      appStorage.setItem("bigGoal", val);
      display.textContent = val;
    } else {
      appStorage.removeItem("bigGoal");
      display.textContent = "Set your ultimate big goal...";
    }
    editArea.classList.add("hidden");
    editArea.style.display = "none";
    display.classList.remove("hidden");
    display.style.display = "block";
  };

  saveBtn.addEventListener("click", saveGoal);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") saveGoal();
    if (e.key === "Escape") {
      editArea.classList.add("hidden");
      editArea.style.display = "none";
      display.classList.remove("hidden");
      display.style.display = "block";
    }
  });

  // ==================== AI PERSONALITY SELECTOR ====================
  const personalitySelectors = document.querySelectorAll("#ai-personality-selector .theme-btn");
  const currentPersonality = appStorage.getItem("aiPersonality") || "savage";

  personalitySelectors.forEach(btn => {
    if (btn.dataset.personality === currentPersonality) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }

    btn.addEventListener("click", () => {
      personalitySelectors.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      appStorage.setItem("aiPersonality", btn.dataset.personality);
      if (typeof showNotification === "function") {
        showNotification(`🤖 AI Personality set to: ${btn.textContent.trim()}`);
      }
    });
  });
});

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

// End of file


document.addEventListener("DOMContentLoaded", () => {
  const taskCard = document.querySelector(".bloom-tasks-card");
  const taskTitle = document.querySelector(".bloom-tasks-card .bloom-card-title");

  function setTaskTextExpanded(expanded) {
    const spans = taskCard.querySelectorAll("#task li span.task-text, #task li span[style]");
    spans.forEach(span => {
      // Skip emoji/tag/priority badge spans
      if (span.classList.contains('task-emoji') || span.classList.contains('task-tag') || span.classList.contains('task-priority-badge') || span.classList.contains('task-select-cb')) return;
      
      if (expanded) {
        // Must use setProperty with 'important' to beat CSS !important rules
        span.style.setProperty('white-space', 'normal', 'important');
        span.style.setProperty('overflow', 'visible', 'important');
        span.style.setProperty('text-overflow', 'unset', 'important');
        span.style.setProperty('word-break', 'break-word', 'important');
        span.style.setProperty('display', 'block', 'important');
        span.style.setProperty('height', 'auto', 'important');
      } else {
        span.style.setProperty('white-space', 'nowrap', 'important');
        span.style.setProperty('overflow', 'hidden', 'important');
        span.style.setProperty('text-overflow', 'ellipsis', 'important');
        span.style.removeProperty('word-break');
        span.style.setProperty('display', 'block', 'important');
      }
    });
  }

  if (taskCard && taskTitle) {
    taskCard.addEventListener("click", (e) => {
      if (!taskCard.classList.contains("expanded")) {
        taskCard.classList.add("expanded");
        setTaskTextExpanded(true);
      }
    });

    taskTitle.addEventListener("click", (e) => {
      if (taskCard.classList.contains("expanded")) {
        taskCard.classList.remove("expanded");
        setTaskTextExpanded(false);
        e.stopPropagation();
      }
    });
  }
});
document.addEventListener("DOMContentLoaded", () => {
  const backBtn = document.getElementById("tasks-back-btn");
  const taskCard = document.querySelector(".bloom-tasks-card");

  function setTaskTextExpanded(expanded) {
    const spans = taskCard.querySelectorAll("#task li span.task-text, #task li span[style]");
    spans.forEach(span => {
      if (span.classList.contains('task-emoji') || span.classList.contains('task-tag') || span.classList.contains('task-priority-badge') || span.classList.contains('task-select-cb')) return;
      
      if (expanded) {
        span.style.setProperty('white-space', 'normal', 'important');
        span.style.setProperty('overflow', 'visible', 'important');
        span.style.setProperty('text-overflow', 'unset', 'important');
        span.style.setProperty('word-break', 'break-word', 'important');
        span.style.setProperty('display', 'block', 'important');
        span.style.setProperty('height', 'auto', 'important');
      } else {
        span.style.setProperty('white-space', 'nowrap', 'important');
        span.style.setProperty('overflow', 'hidden', 'important');
        span.style.setProperty('text-overflow', 'ellipsis', 'important');
        span.style.removeProperty('word-break');
        span.style.setProperty('display', 'block', 'important');
      }
    });
  }

  if (backBtn && taskCard) {
    backBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      taskCard.classList.remove("expanded");
      setTaskTextExpanded(false);
    });
  }
});

// ==================== DYNAMIC LANDSCAPE TIME-OF-DAY ====================
function updateHeroTimeOfDay() {
  var hero = document.querySelector('.bloom-hero');
  if (!hero) return;
  var hour = new Date().getHours();
  var timeClass;
  if (hour >= 5 && hour < 12) {
    timeClass = 'time-morning';
  } else if (hour >= 12 && hour < 17) {
    timeClass = 'time-afternoon';
  } else if (hour >= 17 && hour < 19) {
    timeClass = 'time-evening';
  } else {
    timeClass = 'time-night';
  }
  hero.classList.remove('time-morning', 'time-afternoon', 'time-evening', 'time-night');
  hero.classList.add(timeClass);
  // Notify the 3D landscape engine of time change
  window.dispatchEvent(new CustomEvent('heroTimeChanged', { detail: { timeClass: timeClass } }));
}

// ==================== HABITS MANAGER ====================
// Load from localStorage as quick sync cache; localForage is source of truth
let userHabits = JSON.parse(appStorage.getItem("userHabits") || "[]");
let _habitsLoadedFromForage = false;

// On startup, load from localForage (async) and override localStorage cache
(async function loadHabitsFromForage() {
    if (typeof localforage === 'undefined') return;
    try {
        const stored = await localforage.getItem("userHabits");
        if (stored && Array.isArray(stored)) {
            userHabits = stored;
            _habitsLoadedFromForage = true;
            appStorage.setItem("userHabits", JSON.stringify(userHabits));
            processHabitsNewDay();
            renderHabits();
        } else if (userHabits.length > 0 && !_habitsLoadedFromForage) {
            await localforage.setItem("userHabits", userHabits);
        }
    } catch (e) {
        console.warn("[Habits] localForage load failed, using localStorage fallback", e);
    }
})();

function saveUserHabits() {
    appStorage.setItem("userHabits", JSON.stringify(userHabits));
    if (typeof localforage !== 'undefined') {
        localforage.setItem("userHabits", userHabits).catch(e =>
            console.warn("[Habits] localForage save failed", e)
        );
    }
}

function processHabitsNewDay() {
    const todayStr = new Date().toDateString();
    const yesterdayStr = new Date(Date.now() - 86400000).toDateString();
    let changed = false;

    userHabits.forEach(h => {
        if (!Array.isArray(h.history)) h.history = [];
        if (h.completedToday && h.lastCompletedDate !== todayStr) {
            h.completedToday = false;
            changed = true;
        }
        if (h.lastCompletedDate && h.lastCompletedDate !== todayStr && h.lastCompletedDate !== yesterdayStr) {
            if (h.streak > 0) {
                h.streak = 0;
                changed = true;
            }
        }
    });

    if (changed) saveUserHabits();
}

let habitSelectionMode = false;
let selectedHabitIndices = [];

function renderHabits() {
    const habitsList = document.getElementById("habits-list");
    if (!habitsList) return;
    habitsList.innerHTML = "";
    
    // Toggle menu items visibility based on selection mode
    const hInputContainer = document.querySelector("#habits-view .input-container");
    const hSelectControls = document.getElementById("habit-selection-controls");
    const hMenuBtn = document.getElementById("habitMenuBtn");
    
    if (habitSelectionMode) {
        if (hInputContainer) hInputContainer.classList.add("hidden");
        if (hSelectControls) hSelectControls.classList.remove("hidden");
        if (hMenuBtn) hMenuBtn.classList.add("hidden");
        
        const selCount = document.getElementById("habitSelectedCount");
        if (selCount) selCount.textContent = selectedHabitIndices.length.toString();
    } else {
        if (hInputContainer) hInputContainer.classList.remove("hidden");
        if (hSelectControls) hSelectControls.classList.add("hidden");
        if (hMenuBtn) hMenuBtn.classList.remove("hidden");
    }

    if (userHabits.length === 0) {
        habitsList.innerHTML = `
            <div class="habit-empty-state">
                <div class="habit-empty-icon">🌱</div>
                <h4 class="habit-empty-title">Build Your Routine</h4>
                <p class="habit-empty-desc">Habits are the foundation of growth. Add your first daily habit and watch your streak grow!</p>
                <button class="habit-empty-cta" onclick="document.getElementById('habit-input').focus();">
                    ✨ Add First Habit
                </button>
            </div>`;
        return;
    }

    userHabits.forEach((h, index) => {
        const li = document.createElement("li");
        li.className = `habit-item ${h.completedToday ? "completed" : ""}`;

        // Emoji badge
        const emoji = h.emoji || getEmojiForTask(h.text);
        const emojiBadge = document.createElement("span");
        emojiBadge.className = "habit-emoji";
        emojiBadge.textContent = emoji;
        emojiBadge.style.cssText = `
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 50px;
            height: 50px;
            border-radius: 16px;
            background: linear-gradient(145deg, rgba(255,255,255,0.6), rgba(255,255,255,0.3));
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            border: 1.5px solid rgba(255, 255, 255, 0.7);
            margin-right: 12px;
            font-size: 28px;
            flex-shrink: 0;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1), inset 0 1px 2px rgba(255, 255, 255, 0.8);
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.15));
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        `;
        
        if (!h.color) {
            h.color = getNextColor(); // Persist unique color per habit
        }

        // Checkbox — locked once checked today
        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.className = "habit-checkbox";
        cb.checked = h.completedToday;
        if (h.completedToday) {
            cb.disabled = true;
            cb.title = "Already completed today ✔";
        }
        cb.onchange = () => toggleHabit(index, cb.checked);

        // Text
        const span = document.createElement("span");
        span.className = "habit-text";
        span.textContent = h.text;
        span.style.backgroundColor = h.color;
        span.style.color = "white"; 
        span.style.cssText += " flex: 1 1 0; min-width: 0; overflow-wrap: break-word; word-break: normal; display: block; padding: 6px 12px; border-radius: 8px; font-weight: 600; font-size: 0.9rem; line-height: 1.4;";

        // Double-click to edit if not completed
        if (!h.completedToday) {
            span.addEventListener("dblclick", (e) => {
                if (habitSelectionMode) return;
                e.stopPropagation();
                
                const input = document.createElement("input");
                input.type = "text";
                input.className = "habit-edit-input";
                input.value = h.text;
                
                // Styling to match text
                input.style.border = "1px solid var(--primary)";
                input.style.borderRadius = "8px";
                input.style.padding = "4px 8px";
                input.style.background = "var(--bg-card)";
                input.style.color = "var(--text-main)";
                input.style.fontSize = "1.05rem";
                input.style.width = "calc(100% - 20px)";
                input.style.outline = "none";

                span.replaceWith(input);
                input.focus();

                const saveEdit = () => {
                    const newText = input.value.trim();
                    if (newText && newText !== h.text) {
                        h.text = newText;
                        saveUserHabits();
                    }
                    renderHabits();
                    if (typeof updateBloomWidgets === 'function') updateBloomWidgets();
                };

                input.addEventListener("blur", saveEdit);
                input.addEventListener("keydown", (ev) => {
                    if (ev.key === "Enter") {
                        input.removeEventListener("blur", saveEdit);
                        saveEdit();
                    } else if (ev.key === "Escape") {
                        input.removeEventListener("blur", saveEdit);
                        renderHabits();
                    }
                });
            });
        }

        const contentDiv = document.createElement("div");
        contentDiv.className = "habit-content";
        
        // Render selection checkbox if in selection mode, otherwise emoji mapping
        if (habitSelectionMode) {
            const selCb = document.createElement("input");
            selCb.type = "checkbox";
            selCb.className = "habit-select-cb";
            selCb.style.width = "22px";
            selCb.style.height = "22px";
            selCb.style.accentColor = "#ef4444";
            selCb.style.cursor = "pointer";
            selCb.checked = selectedHabitIndices.includes(index);
            selCb.onchange = (e) => {
                if (e.target.checked) {
                    selectedHabitIndices.push(index);
                } else {
                    selectedHabitIndices = selectedHabitIndices.filter(i => i !== index);
                }
                renderHabits();
            };
            contentDiv.appendChild(selCb);
            li.style.cursor = "pointer";
            li.onclick = (e) => {
                if(e.target !== selCb) {
                    selCb.checked = !selCb.checked;
                    selCb.dispatchEvent(new Event("change"));
                }
            };
        } else {
            contentDiv.appendChild(emojiBadge);
            contentDiv.appendChild(cb);
        }
        
        contentDiv.appendChild(span);

        // Streak badge
        const streakDiv = document.createElement("div");
        streakDiv.className = "habit-streak";
        streakDiv.innerHTML = `<span class="habit-streak-fire">🔥</span><span class="habit-streak-num">${h.streak}</span>`;

        // Focus/Pomodoro button — unique design for habits
        const focusBtn = document.createElement("button");
        focusBtn.className = "habit-focus-btn";
        focusBtn.innerHTML = `<span class="habit-focus-icon">⏱</span>`;
        focusBtn.title = `Start a focus session for "${h.text}"`;
        if (h.completedToday || habitSelectionMode) {
            focusBtn.style.opacity = "0.3";
            focusBtn.style.pointerEvents = "none";
        }
        focusBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            startHabitFocusSession(h.text, index);
        });

        const rightDiv = document.createElement("div");
        rightDiv.className = "habit-actions";
        if (!habitSelectionMode) {
            rightDiv.appendChild(streakDiv);
            rightDiv.appendChild(focusBtn);
        }

        li.appendChild(contentDiv);
        li.appendChild(rightDiv);

        // Entry animation
        li.style.opacity = "0";
        li.style.transform = "translateY(10px)";
        setTimeout(() => {
            li.style.transition = "all 0.3s ease-out";
            li.style.opacity = "1";
            li.style.transform = "translateY(0)";
        }, index * 50);

        habitsList.appendChild(li);
    });
}

// Start a focus Pomodoro session for a habit
function startHabitFocusSession(habitName, habitIndex) {
    showPage('pomodoro-page');
    currentFocusHabitIndex = habitIndex;
    currentFocusTaskCheckbox = null; // Clear any task focus

    const heading = document.getElementById('pomodoro-heading');
    if (heading) heading.textContent = `🍅 Pomodoro Timer`;

    const banner = document.getElementById('focus-task-banner');
    if (banner) {
        const emoji = getEmojiForTask(habitName);
        banner.innerHTML = `
            <div class="focus-banner-label">HABIT FOCUS SESSION</div>
            <span class="focus-banner-emoji">${emoji}</span>
            <div class="focus-banner-task">${habitName}</div>
        `;
        banner.classList.remove('hidden');
        banner.classList.add('habit-focus-active');
    }

    showNotification(`⏱ Habit focus: "${habitName}". Complete the pomodoro to auto-check!`);
}

function toggleHabit(index, isChecked) {
    const h = userHabits[index];
    const todayStr = new Date().toDateString();
    if (!Array.isArray(h.history)) h.history = [];

    if (isChecked && !h.completedToday) {
        h.completedToday = true;
        h.streak++;
        h.lastCompletedDate = todayStr;
        if (!h.history.includes(todayStr)) {
            h.history.push(todayStr);
        }
        showNotification(`🔥 "${h.text}" done! Streak: ${h.streak}`);
    }

    saveUserHabits();
    renderHabits();
    if (typeof updateBloomWidgets === "function") updateBloomWidgets();
    if (typeof tryVitalityStreak === "function") tryVitalityStreak();
}

// ==================== HABIT STATS PAGE ====================
let _habitStatsMonth = new Date().getMonth();
let _habitStatsYear = new Date().getFullYear();

function showHabitStats() {
    _habitStatsMonth = new Date().getMonth();
    _habitStatsYear = new Date().getFullYear();
    _renderHabitStatsOverlay();
}

function _renderHabitStatsOverlay() {
    let overlay = document.getElementById("habit-stats-overlay");
    if (overlay) overlay.remove();

    overlay = document.createElement("div");
    overlay.id = "habit-stats-overlay";
    overlay.style.cssText = `
        position:fixed;top:0;left:0;width:100%;height:100%;
        background:var(--bg-color,#fff);
        z-index:10000;overflow-y:auto;
        animation:fadeIn 0.3s ease;
        padding:20px;box-sizing:border-box;
    `;

    const now = new Date();
    const year = _habitStatsYear;
    const month = _habitStatsMonth;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthName = new Date(year, month).toLocaleString('default', { month: 'long', year: 'numeric' });
    const isCurrentMonth = (year === now.getFullYear() && month === now.getMonth());

    let html = `
        <div style="max-width:600px;margin:0 auto;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
                <h2 style="margin:0;color:var(--text-main);font-size:1.3rem;">📊 Habit Insights</h2>
                <button id="close-habit-stats" style="background:none;border:none;font-size:1.5rem;cursor:pointer;color:var(--text-main);">×</button>
            </div>

            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;">
                <button id="habit-cal-prev" class="habit-cal-nav-btn">←</button>
                <span style="font-weight:700;font-size:1rem;color:var(--text-main);">${monthName}</span>
                <button id="habit-cal-next" class="habit-cal-nav-btn" ${isCurrentMonth ? 'disabled style="opacity:0.3;cursor:default;"' : ''}>→</button>
            </div>
    `;

    if (userHabits.length === 0) {
        html += `<p style="color:var(--text-muted);text-align:center;padding:40px;">No habits to show yet.</p>`;
    } else {
        userHabits.forEach(h => {
            if (!Array.isArray(h.history)) h.history = [];
            const emoji = h.emoji || getEmojiForTask(h.text);

            // Determine the created date for this habit
            const createdDate = h.createdDate ? new Date(h.createdDate) : null;

            // Count completed days this month
            const completedThisMonth = h.history.filter(d => {
                const dt = new Date(d);
                return dt.getFullYear() === year && dt.getMonth() === month;
            }).length;

            // Count trackable days (days from creation date to today within this month)
            let trackableDays = 0;
            for (let day = 1; day <= daysInMonth; day++) {
                const dt = new Date(year, month, day);
                if (dt > now) break; // future
                if (createdDate && dt < new Date(createdDate.getFullYear(), createdDate.getMonth(), createdDate.getDate())) continue;
                trackableDays++;
            }
            const completionRate = trackableDays > 0 ? Math.round((completedThisMonth / trackableDays) * 100) : 0;

            html += `
                <div class="habit-stats-card">
                    <div class="habit-stats-header">
                        <span class="habit-stats-emoji">${emoji}</span>
                        <div>
                            <div class="habit-stats-name">${h.text}</div>
                            <div class="habit-stats-meta">🔥 ${h.streak} day streak &bull; ${completionRate}% completion</div>
                        </div>
                    </div>
                    <div class="habit-calendar-grid">`;

            const dayLabels = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
            dayLabels.forEach(d => {
                html += `<div class="habit-cal-header">${d}</div>`;
            });

            const firstDay = new Date(year, month, 1).getDay();
            for (let i = 0; i < firstDay; i++) {
                html += `<div class="habit-cal-cell empty"></div>`;
            }

            for (let day = 1; day <= daysInMonth; day++) {
                const dt = new Date(year, month, day);
                const dateStr = dt.toDateString();
                const isCompleted = h.history.includes(dateStr);
                const isToday = isCurrentMonth && day === now.getDate();
                const isFuture = dt > now;
                const isBeforeCreation = createdDate && dt < new Date(createdDate.getFullYear(), createdDate.getMonth(), createdDate.getDate());
                const isPast = !isFuture && !isToday;
                const isMissed = isPast && !isCompleted && !isBeforeCreation;

                let cellClass = 'habit-cal-cell';
                if (isBeforeCreation || isFuture) cellClass += ' inactive';
                else if (isCompleted) cellClass += ' done';
                else if (isMissed) cellClass += ' missed';
                if (isToday) cellClass += ' today';

                let icon = '';
                if (isCompleted) icon = '✓';
                else if (isMissed) icon = '✗';

                html += `<div class="${cellClass}"><span class="cal-day-num">${day}</span>${icon ? `<span class="cal-icon">${icon}</span>` : ''}</div>`;
            }

            html += `</div></div>`;
        });

        // Summary
        const totalHabits = userHabits.length;
        const completedToday = userHabits.filter(h => h.completedToday).length;
        const longestStreak = Math.max(...userHabits.map(h => h.streak), 0);

        html += `
            <div class="habit-stats-summary">
                <div class="habit-summary-item">
                    <div class="habit-summary-val">${completedToday}/${totalHabits}</div>
                    <div class="habit-summary-lbl">Done Today</div>
                </div>
                <div class="habit-summary-item">
                    <div class="habit-summary-val">${longestStreak}</div>
                    <div class="habit-summary-lbl">Best Streak</div>
                </div>
                <div class="habit-summary-item">
                    <div class="habit-summary-val">${totalHabits}</div>
                    <div class="habit-summary-lbl">Total Habits</div>
                </div>
            </div>`;
    }

    html += `</div>`;
    overlay.innerHTML = html;
    document.body.appendChild(overlay);

    document.getElementById("close-habit-stats").addEventListener("click", () => overlay.remove());
    document.getElementById("habit-cal-prev").addEventListener("click", () => {
        _habitStatsMonth--;
        if (_habitStatsMonth < 0) { _habitStatsMonth = 11; _habitStatsYear--; }
        _renderHabitStatsOverlay();
    });
    const nextBtn = document.getElementById("habit-cal-next");
    if (nextBtn && !nextBtn.disabled) {
        nextBtn.addEventListener("click", () => {
            _habitStatsMonth++;
            if (_habitStatsMonth > 11) { _habitStatsMonth = 0; _habitStatsYear++; }
            _renderHabitStatsOverlay();
        });
    }
}

function initHabitsUI() {
    // ── ALL DOM LOOKUPS FIRST ──
    const btnTasks = document.getElementById("tab-tasks");
    const btnHabits = document.getElementById("tab-habits");
    const viewTasks = document.getElementById("tasks-view");
    const viewHabits = document.getElementById("habits-view");
    const menuWrapper = document.getElementById("tasks-menu-wrapper");
    const habitsMenuWrapper = document.getElementById("habits-menu-wrapper");
    const hInput = document.getElementById("habit-input");
    const hBtn = document.getElementById("habit-plus");
    const habitMenuBtn = document.getElementById("habitMenuBtn");
    const habitMenuDropdown = document.getElementById("habitMenuDropdown");
    const habitSelectionModeBtn = document.getElementById("habitSelectionModeBtn");
    const deleteSelectedHabitsBtn = document.getElementById("deleteSelectedHabits");
    const cancelHabitSelection = document.getElementById("cancelHabitSelection");
    const shuffleHabitsBtn = document.getElementById("shuffleHabitsBtn");
    const habitStatsNavBtn = document.getElementById("habitStatsNavBtn");

    const activeTab = appStorage.getItem("trackerActiveTab") || "habits";

    // ── TAB TOGGLE ──
    const showTasks = () => {
        if (btnTasks) btnTasks.classList.add("active");
        if (btnHabits) btnHabits.classList.remove("active");
        if (viewTasks) viewTasks.classList.remove("hidden");
        if (viewHabits) viewHabits.classList.add("hidden");
        if (menuWrapper) menuWrapper.style.display = "";
        if (habitsMenuWrapper) habitsMenuWrapper.style.display = "none";
        appStorage.setItem("trackerActiveTab", "tasks");
    };

    const showHabits = () => {
        if (btnHabits) btnHabits.classList.add("active");
        if (btnTasks) btnTasks.classList.remove("active");
        if (viewHabits) viewHabits.classList.remove("hidden");
        if (viewTasks) viewTasks.classList.add("hidden");
        if (menuWrapper) menuWrapper.style.display = "none";
        if (habitsMenuWrapper) habitsMenuWrapper.style.display = "";
        renderHabits();
        appStorage.setItem("trackerActiveTab", "habits");
    };

    if (btnTasks && btnHabits) {
        btnTasks.addEventListener("click", showTasks);
        btnHabits.addEventListener("click", showHabits);

        if (activeTab === "tasks") {
            showTasks();
        } else {
            showHabits();
        }
    }

    // ── ADD HABIT ──
    window.addHabitFromUI = () => {
        if (!hInput) return;
        const text = hInput.value.trim();
        if (text) {
            const emoji = getEmojiForTask(text);
            const color = getNextColor();
            userHabits.push({ text, emoji, color, completedToday: false, streak: 0, lastCompletedDate: null, history: [], createdDate: new Date().toDateString() });
            saveUserHabits();
            renderHabits();
            hInput.value = "";
            if (typeof updateBloomWidgets === "function") updateBloomWidgets();
            if (typeof tryVitalityStreak === "function") tryVitalityStreak();
        }
    };

    if (hBtn) hBtn.addEventListener("click", window.addHabitFromUI);
    if (hInput) hInput.addEventListener("keypress", (e) => { if (e.key === "Enter") window.addHabitFromUI(); });

    // ── HABIT MENU ──
    if (habitMenuBtn && habitMenuDropdown) {
        habitMenuBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            habitMenuDropdown.classList.toggle("hidden");
        });
        document.addEventListener("click", (e) => {
            if (!habitMenuBtn.contains(e.target) && !habitMenuDropdown.contains(e.target)) {
                habitMenuDropdown.classList.add("hidden");
            }
        });
    }

    if (habitSelectionModeBtn) {
        habitSelectionModeBtn.addEventListener("click", () => {
            if (habitMenuDropdown) habitMenuDropdown.classList.add("hidden");
            habitSelectionMode = true;
            selectedHabitIndices = [];
            renderHabits();
        });
    }

    if (cancelHabitSelection) {
        cancelHabitSelection.addEventListener("click", () => {
            habitSelectionMode = false;
            selectedHabitIndices = [];
            renderHabits();
        });
    }

    if (deleteSelectedHabitsBtn) {
        deleteSelectedHabitsBtn.addEventListener("click", () => {
            if (selectedHabitIndices.length === 0) return;
            if (confirm(`Delete ${selectedHabitIndices.length} selected habits?`)) {
                selectedHabitIndices.sort((a, b) => b - a);
                selectedHabitIndices.forEach(idx => { userHabits.splice(idx, 1); });
                saveUserHabits();
                habitSelectionMode = false;
                selectedHabitIndices = [];
                renderHabits();
                if (typeof updateBloomWidgets === "function") updateBloomWidgets();
            }
        });
    }

    if (shuffleHabitsBtn) {
        shuffleHabitsBtn.addEventListener("click", () => {
            if (habitMenuDropdown) habitMenuDropdown.classList.add("hidden");
            for (let i = userHabits.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [userHabits[i], userHabits[j]] = [userHabits[j], userHabits[i]];
            }
            saveUserHabits();
            renderHabits();
        });
    }

    if (habitStatsNavBtn) {
        habitStatsNavBtn.addEventListener("click", () => {
            if (habitMenuDropdown) habitMenuDropdown.classList.add("hidden");
            if (typeof showHabitStats === "function") showHabitStats();
        });
    }

    processHabitsNewDay();
    renderHabits();
}

// Initialize landscape on load
document.addEventListener('DOMContentLoaded', function() {
  initHabitsUI();
  updateHeroTimeOfDay();

  // ── 1. Zen Mode Logic (Force Hide UI elements) ── //
  const zenBtn = document.getElementById("zenModeBtn");
  if (zenBtn) {
      const newZenBtn = zenBtn.cloneNode(true);
      zenBtn.parentNode.replaceChild(newZenBtn, zenBtn);
      newZenBtn.addEventListener("click", () => {
          document.body.classList.toggle("zen-mode");
          const dropdown = document.getElementById("menuDropdown");
          if(dropdown) dropdown.classList.add("hidden");
          if(typeof showPage === 'function'){ showPage('main'); }
      });
  }

  // ── 2. Full App Format & Reset ── //
  const resetBtn = document.getElementById("resetApp");
  if (resetBtn) {
      const newResetBtn = resetBtn.cloneNode(true);
      resetBtn.parentNode.replaceChild(newResetBtn, resetBtn);
      newResetBtn.addEventListener("click", async () => {
          if(confirm("🚨 WARNING: Are you ABSOLUTELY sure you want to reset Ultradian? This will delete ALL tasks, streaks, library books, and settings.")) {
              if(confirm("Final Warning! This action CANNOT be undone. Proceed with format?")) {
                  localStorage.clear();
                  sessionStorage.clear();
                  if(typeof localforage !== 'undefined') {
                      try { await localforage.clear(); } catch(e) { console.error("LocalForage error", e); }
                  }
                  if ('serviceWorker' in navigator) {
                      const regs = await navigator.serviceWorker.getRegistrations();
                      for(let reg of regs) { await reg.unregister(); }
                  }
                  window.location.reload();
              }
          }
      });
  }
});
