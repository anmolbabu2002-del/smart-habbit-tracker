document.addEventListener("DOMContentLoaded", () => {
    // Wait a brief moment to ensure appStorage is ready
    setTimeout(() => {
        // ----------------------------------------------------
        // ADVANCED MOOD TRACKER LOGIC
        // ----------------------------------------------------
        const moodEmojis = document.querySelectorAll(".mood-pick-emoji");
        const symptomBtns = document.querySelectorAll(".symptom-btn");
        const saveMoodBtn = document.getElementById("save-advanced-mood-btn");
        const moodJournalInput = document.getElementById("mood-journal-input");

        let selectedEmotion = null;
        let selectedSymptoms = new Set();

        moodEmojis.forEach(emoji => {
            emoji.addEventListener("click", () => {
                // Unselect all
                moodEmojis.forEach(e => {
                    e.style.transform = "scale(1)";
                    e.style.opacity = "0.5";
                });
                // Select this
                emoji.style.transform = "scale(1.3)";
                emoji.style.opacity = "1";
                selectedEmotion = emoji.getAttribute("data-mood");
            });
        });

        symptomBtns.forEach(btn => {
            btn.addEventListener("click", () => {
                const sym = btn.getAttribute("data-symptom");
                if (selectedSymptoms.has(sym)) {
                    selectedSymptoms.delete(sym);
                    btn.style.background = "transparent";
                    btn.style.borderColor = "var(--border)";
                } else {
                    selectedSymptoms.add(sym);
                    btn.style.background = "rgba(255,140,66,0.15)";
                    btn.style.borderColor = "var(--primary)";
                }
            });
        });

        if (saveMoodBtn) {
            saveMoodBtn.addEventListener("click", () => {
                if (!selectedEmotion) {
                    if (typeof showNotification === "function") showNotification("Please pick an emotion first!");
                    return;
                }

                const customInfInput = document.getElementById("custom-influence-input");
                if (customInfInput && customInfInput.value.trim() !== "") {
                    selectedSymptoms.add(customInfInput.value.trim());
                }

                // 1. Structure the data comprehensively to satisfy BOTH old insights and new radar.
                const now = new Date();
                const hour = now.getHours();
                let timeOfDay = "morning";
                if (hour >= 12 && hour < 17) timeOfDay = "afternoon";
                else if (hour >= 17) timeOfDay = "evening";

                // Map new emotions (amazing, good, etc.) back to old scale (great, good) for legacy heatmap/insights
                const emMapForOld = { amazing: "great", good: "good", okay: "okay", bad: "bad", awful: "terrible" };
                const legacyMood = emMapForOld[selectedEmotion] || "okay";

                const unifiedMoodData = {
                    // Legacy structure hooks
                    date: now.toLocaleDateString(),
                    dateISO: now.toISOString().split('T')[0],
                    mood: legacyMood,
                    note: moodJournalInput ? moodJournalInput.value : "", // Use journal text as old note
                    tags: Array.from(selectedSymptoms), // Use symptoms/influences as old tags for correlation
                    timeOfDay: timeOfDay,
                    time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    context: {
                        waterConsumed: typeof window.waterConsumed !== 'undefined' ? window.waterConsumed : 0,
                        waterGoal: typeof window.waterGoal !== 'undefined' ? window.waterGoal : 0,
                        streakCount: typeof window.count !== 'undefined' ? window.count : 0
                    },
                    // Advanced Radar New hooks
                    emotion: selectedEmotion,
                    energy: 3, // Default since slider is removed
                    symptoms: Array.from(selectedSymptoms),
                    journal: moodJournalInput ? moodJournalInput.value : ""
                };

                // 2. Save strictly using legacy appStorage mechanics
                let history = [];
                try {
                    const stored = appStorage.getItem("moodHistory");
                    history = stored ? JSON.parse(stored) : [];
                    if (!Array.isArray(history)) history = [];
                } catch (e) {
                    console.error("Error parsing mood history:", e);
                    history = [];
                }

                try {
                    // Enforce max 2 entries per day like the old system logic did
                    const todayCount = history.filter(m => m.dateISO === unifiedMoodData.dateISO).length;
                    if (todayCount >= 4) {
                        if (typeof showNotification === "function") showNotification("⚠️ Daily limit reached: Try logging again tomorrow.");
                        return; // Soft block
                    }

                    history.unshift(unifiedMoodData); // Match legacy array direction (newest first)
                    if (history.length > 100) history.pop();

                    appStorage.setItem("moodHistory", JSON.stringify(history));

                    // Expose globally for script.js
                    if (typeof window.moodHistory !== 'undefined') {
                        window.moodHistory = history;
                    }

                    // Update Dashboard Display Widget
                    const dashMood = document.getElementById("dash-mood");
                    if (dashMood) {
                        const emMap = { amazing: "🤩", good: "😊", okay: "😐", bad: "😔", awful: "😫" };
                        dashMood.textContent = emMap[selectedEmotion] || "😐";
                    }

                    if (typeof showNotification === "function") showNotification("Mood beautifully tracked!");

                    // Clear UI selection
                    selectedEmotion = null;
                    selectedSymptoms.clear();
                    moodEmojis.forEach(e => { e.style.transform = "scale(1)"; e.style.opacity = "0.5"; });
                    const currentSymptomBtns = document.querySelectorAll(".symptom-btn");
                    currentSymptomBtns.forEach(btn => { btn.style.background = "transparent"; btn.style.borderColor = "var(--border)"; });
                    if (moodJournalInput) moodJournalInput.value = "";
                    const customInf = document.getElementById("custom-influence-input");
                    if (customInf) customInf.value = "";

                    // Sync the UI graphs
                    if (typeof window.renderMoodHistory === "function") window.renderMoodHistory();
                    if (typeof window.renderMoodHeatmap === "function") window.renderMoodHeatmap();
                    if (typeof window.generateMoodInsights === "function") window.generateMoodInsights();
                    window.refreshAdvancedAnalytics();

                    // Scroll down to the insights / heatmaps
                    const moodHistoryEl = document.getElementById("mood-history");
                    if (moodHistoryEl) {
                        moodHistoryEl.scrollIntoView({ behavior: 'smooth' });
                    }

                } catch (err) {
                    console.error("Error during save checkin:", err);
                    if (typeof showNotification === "function") showNotification("Error saving mood. Please try again.");
                }
            });
        }

        // Modal Close
        const closeMood = document.getElementById("closeMood");
        if (closeMood) {
            closeMood.addEventListener("click", () => {
                if (typeof showPage === "function") showPage("main"); // back to dashboard
            });
        }

        // ----------------------------------------------------
        // ADVANCED DASHBOARD WIDGETS
        // ----------------------------------------------------

        window.refreshAdvancedAnalytics = function() {
            // These mock widgets were removed for clarity and core focus.
        };

    }, 500);
});
