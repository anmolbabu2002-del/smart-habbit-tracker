document.addEventListener("DOMContentLoaded", () => {
    // Wait a brief moment to ensure appStorage is ready
    setTimeout(() => {
        // ════════════════════════════════════════════════════════════════
        // WORLD-CLASS MOOD TRACKER — ADVANCED DASHBOARD LOGIC
        // ════════════════════════════════════════════════════════════════

        // ─── SUB-EMOTION DATABASE ──────────────────────────────────────
        // Clinically-inspired emotional granularity based on CBT/DBT vocab.
        // Each primary emotion maps to 5 specific sub-emotions with emoji and
        // a brief description to help users build emotional vocabulary.
        const SUB_EMOTIONS = {
            amazing: [
                { id: "excited", label: "Excited", emoji: "🎉", desc: "Thrilled about something ahead" },
                { id: "proud", label: "Proud", emoji: "🦁", desc: "Accomplished something meaningful" },
                { id: "grateful", label: "Grateful", emoji: "🙏", desc: "Thankful for what you have" },
                { id: "energized", label: "Energized", emoji: "⚡", desc: "Full of vibrant energy" },
                { id: "inspired", label: "Inspired", emoji: "💡", desc: "Feeling creative and motivated" }
            ],
            good: [
                { id: "calm", label: "Calm", emoji: "🌊", desc: "Peaceful and centered" },
                { id: "content", label: "Content", emoji: "☺️", desc: "Satisfied with how things are" },
                { id: "hopeful", label: "Hopeful", emoji: "🌅", desc: "Optimistic about the future" },
                { id: "playful", label: "Playful", emoji: "🎈", desc: "Lighthearted and fun" },
                { id: "confident", label: "Confident", emoji: "💪", desc: "Secure in yourself" }
            ],
            okay: [
                { id: "bored", label: "Bored", emoji: "🥱", desc: "Nothing feels stimulating" },
                { id: "distracted", label: "Distracted", emoji: "🌀", desc: "Can't seem to focus" },
                { id: "indifferent", label: "Indifferent", emoji: "🤷", desc: "Not really feeling anything" },
                { id: "tired", label: "Tired", emoji: "😴", desc: "Low energy but not bad" },
                { id: "busy", label: "Busy", emoji: "⏳", desc: "Too occupied to feel much" }
            ],
            bad: [
                { id: "anxious", label: "Anxious", emoji: "😰", desc: "Worried about something" },
                { id: "sad", label: "Sad", emoji: "😢", desc: "Feeling down or blue" },
                { id: "frustrated", label: "Frustrated", emoji: "😤", desc: "Things aren't going your way" },
                { id: "lonely", label: "Lonely", emoji: "🥺", desc: "Missing connection" },
                { id: "overwhelmed", label: "Overwhelmed", emoji: "🤯", desc: "Too much to handle" }
            ],
            awful: [
                { id: "angry", label: "Angry", emoji: "😡", desc: "Intense frustration or rage" },
                { id: "hopeless", label: "Hopeless", emoji: "🕳️", desc: "Can't see a way forward" },
                { id: "panicked", label: "Panicked", emoji: "😱", desc: "Extreme anxiety or fear" },
                { id: "exhausted", label: "Exhausted", emoji: "🫠", desc: "Completely drained" },
                { id: "numb", label: "Numb", emoji: "🫥", desc: "Feeling nothing at all" }
            ]
        };

        // ─── EMPATHETIC RESPONSE DATABASE ──────────────────────────────
        // Context-aware, warm one-liners shown after picking a mood.
        // Multiple options per mood so it doesn't feel repetitive.
        const EMPATHETIC_RESPONSES = {
            amazing: [
                "Your energy is contagious today! Whatever you're doing, bottle it. 🌟",
                "Amazing days like this are what you're building towards. Soak it in. ✨",
                "You're radiating — remember this feeling when tough days come. 💫",
                "This is what showing up for yourself looks like. Pure gold. 🏆",
                "The universe is on your side today. Ride this wave! 🌊"
            ],
            good: [
                "Solid day — it's the consistent good ones that build greatness. 🌱",
                "You're in a good groove. Small wins compound into big transformations.",
                "This quiet contentment? It's the foundation of real happiness. 🏡",
                "Good is underrated. Most of life's best moments feel exactly like this. ☀️",
                "Your calm confidence today is setting up tomorrow's victory. 💪"
            ],
            okay: [
                "Neutral days are the canvas — you get to decide what to paint. 🎨",
                "Not every day needs to be extraordinary. Showing up matters. 🌿",
                "Okay is okay. You're still here, still logging. That's consistency. 📝",
                "Sometimes the quiet moments are where the real growth happens. 🌱",
                "A day without chaos is a good day. Give yourself credit. ✌️"
            ],
            bad: [
                "It's okay to feel this. You're still showing up, and that counts immensely. 💛",
                "Bad days are data, not destiny. This will pass. 🌤️",
                "The fact that you're checking in right now shows incredible self-awareness. 🧠",
                "You don't have to fix everything today. Just being honest with yourself is enough. 🫂",
                "Tough days sharpen your resilience. You're stronger than you think. 🔥"
            ],
            awful: [
                "This feeling is temporary. You've survived every bad day so far. 💛",
                "You're not alone in this. It takes courage to acknowledge when things are hard. 🤝",
                "Even on the darkest days, showing up here means you haven't given up. That's everything. 🌅",
                "Be gentle with yourself today. You deserve the same compassion you'd give a friend. 🫶",
                "Rock bottom builds the strongest foundations. You will rise from this. 🏔️"
            ]
        };

        // ─── DYNAMIC JOURNAL PROMPTS ───────────────────────────────────
        // CBT/DBT-inspired prompts that adapt to the user's mood.
        const DYNAMIC_PROMPTS = {
            amazing: [
                "What specifically made today amazing? Write it down so you can recreate it.",
                "Name 3 things you're grateful for right now.",
                "What did you do differently today that led to this feeling?",
                "Who or what deserves credit for this great mood?",
                "How can you spread this energy to someone else today?"
            ],
            good: [
                "What's one thing that went right today?",
                "What small habit contributed to this good feeling?",
                "Describe your ideal version of tomorrow in one sentence.",
                "What would make today even 10% better?",
                "What's a strength you used today that you're proud of?"
            ],
            okay: [
                "What would shift this 'okay' into 'good'? Is it within your control?",
                "Is there something you're avoiding thinking about?",
                "What's one thing you could do in the next hour to lift your mood?",
                "What does your body need right now — rest, movement, food, water?",
                "If you could do one thing with zero consequences, what would it be?"
            ],
            bad: [
                "What's one thing in your control right now?",
                "If you told a friend how you feel, what would you say?",
                "What's the smallest action you could take to feel 5% better?",
                "Is this feeling about something specific, or is it a general cloud?",
                "What would your best self say to your current self right now?"
            ],
            awful: [
                "You don't have to write anything. But if you want to — what hurts most right now?",
                "What's one thing that usually comforts you? Can you do it today?",
                "If this feeling had a shape, what would it look like? Sometimes naming it helps.",
                "What would you tell someone you love if they felt the way you do right now?",
                "Is there one person you could reach out to — even with just a 'hey'?"
            ]
        };

        // ─── STATE ─────────────────────────────────────────────────────
        let selectedEmotion = null;
        let selectedSubEmotion = null;
        let selectedSymptoms = new Set();

        // ─── DOM REFERENCES ────────────────────────────────────────────
        const primaryPicks = document.querySelectorAll(".mood-pick-primary");
        const symptomBtns = document.querySelectorAll(".symptom-btn");
        const saveMoodBtn = document.getElementById("save-advanced-mood-btn");
        const moodJournalInput = document.getElementById("mood-journal-input");
        const subEmotionCard = document.getElementById("mood-sub-emotion-card");
        const subEmotionsGrid = document.getElementById("mood-sub-emotions-grid");
        const empathyBanner = document.getElementById("mood-empathy-banner");
        const empathyText = document.getElementById("mood-empathy-text");
        const promptText = document.getElementById("cbt-prompt-text");
        const patternAlert = document.getElementById("mood-pattern-alert");
        const patternAlertText = document.getElementById("mood-pattern-alert-text");

        // ─── PRIMARY MOOD SELECTION ────────────────────────────────────
        primaryPicks.forEach(pick => {
            pick.addEventListener("click", () => {
                const mood = pick.getAttribute("data-mood");
                selectedEmotion = mood;
                selectedSubEmotion = null; // Reset sub

                // Visual: highlight selected, dim others
                primaryPicks.forEach(p => {
                    if (p === pick) {
                        p.style.transform = "scale(1.15)";
                        p.style.background = "rgba(255,140,66,0.12)";
                        p.style.filter = "none";
                        p.style.boxShadow = "0 0 20px rgba(255,140,66,0.15)";
                    } else {
                        p.style.transform = "scale(0.9)";
                        p.style.background = "transparent";
                        p.style.opacity = "0.45";
                        p.style.boxShadow = "none";
                        p.style.filter = "grayscale(40%)";
                    }
                });

                // ── Reveal sub-emotions ──
                showSubEmotions(mood);

                // ── Show empathetic response ──
                showEmpathyBanner(mood);

                // ── Update dynamic journal prompt ──
                updateDynamicPrompt(mood);
            });
        });

        // ─── SUB-EMOTION RENDERING ─────────────────────────────────────
        function showSubEmotions(mood) {
            if (!subEmotionCard || !subEmotionsGrid) return;
            const subs = SUB_EMOTIONS[mood];
            if (!subs || subs.length === 0) {
                subEmotionCard.classList.add("hidden");
                return;
            }

            subEmotionsGrid.innerHTML = "";
            subs.forEach(sub => {
                const btn = document.createElement("button");
                btn.className = "mood-sub-btn";
                btn.setAttribute("data-sub", sub.id);
                btn.style.cssText = `
                    display: flex; flex-direction: column; align-items: center; gap: 2px;
                    padding: 10px 14px; border-radius: 14px; border: 1.5px solid var(--border);
                    background: transparent; cursor: pointer; color: var(--text-main);
                    transition: all 0.3s ease; flex: 0 0 auto; min-width: 75px;
                    font-family: inherit;
                `;
                btn.innerHTML = `
                    <span style="font-size:1.4rem;">${sub.emoji}</span>
                    <span style="font-size:0.7rem; font-weight:700;">${sub.label}</span>
                    <span style="font-size:0.55rem; color:var(--text-muted); max-width:80px; text-align:center; line-height:1.2;">${sub.desc}</span>
                `;

                btn.addEventListener("click", () => {
                    selectedSubEmotion = sub.id;
                    // Highlight selected sub
                    subEmotionsGrid.querySelectorAll(".mood-sub-btn").forEach(b => {
                        b.style.background = "transparent";
                        b.style.borderColor = "var(--border)";
                        b.style.transform = "scale(1)";
                    });
                    btn.style.background = "rgba(255,140,66,0.12)";
                    btn.style.borderColor = "var(--primary)";
                    btn.style.transform = "scale(1.05)";

                    // Update empathetic response to match sub-emotion
                    showSubEmpathy(mood, sub);
                });

                subEmotionsGrid.appendChild(btn);
            });

            subEmotionCard.classList.remove("hidden");
        }

        // ─── EMPATHETIC RESPONSE ───────────────────────────────────────
        function showEmpathyBanner(mood) {
            if (!empathyBanner || !empathyText) return;
            const responses = EMPATHETIC_RESPONSES[mood];
            if (!responses || responses.length === 0) return;

            const randomResponse = responses[Math.floor(Math.random() * responses.length)];
            empathyText.textContent = randomResponse;
            empathyBanner.classList.remove("hidden");
        }

        function showSubEmpathy(mood, sub) {
            if (!empathyBanner || !empathyText) return;
            // Specific sub-emotion responses for deeper emotional intelligence
            const subResponses = {
                excited: "That excitement is fuel — channel it before it fades! 🚀",
                proud: "You earned this feeling. Don't downplay your wins. 🦁",
                grateful: "Gratitude rewires your brain for happiness. You're literally building a better mind. 🧠",
                energized: "This energy is your superpower today. Use it wisely! ⚡",
                inspired: "Inspiration is perishable — act on it now before it vanishes. 💡",
                calm: "Inner peace is the ultimate success metric. You've already won today. 🌊",
                content: "Contentment is what most people chase their whole lives. You have it right now. ☺️",
                hopeful: "Hope is the foundation of change. Hold onto this feeling. 🌅",
                playful: "Never lose your sense of play — it keeps your spirit young. 🎈",
                confident: "Confidence isn't about being perfect. It's about trusting yourself. 💪",
                bored: "Boredom is your brain asking for a challenge. What's one new thing you could try? 🎯",
                distracted: "Notice the distraction without judging it. Then gently redirect. 🌀",
                indifferent: "It's okay to feel flat sometimes. Not every moment needs intensity. 🤷",
                tired: "Your body is asking for rest. Listen to it — rest is productive. 😴",
                busy: "Being busy isn't the same as being fulfilled. What truly matters today? ⏳",
                anxious: "Anxiety is your brain trying to protect you, but it's overreacting. You're safe. 💛",
                sad: "It's okay to be sad. Let yourself feel it — suppressing emotions only makes them louder. 😢",
                frustrated: "Frustration means you care about the outcome. That's actually a strength. 😤",
                lonely: "Connection heals isolation. Even a simple text to someone can shift everything. 🥺",
                overwhelmed: "You don't have to carry it all at once. What's just ONE thing you can handle? 🤯",
                angry: "Your anger is valid. The question is: what will you do with this energy? 😡",
                hopeless: "Even in darkness, you found this app and checked in. That's a sign of resilience. 🕳️",
                panicked: "Breathe. In for 4, hold for 4, out for 6. You WILL get through this moment. 😱",
                exhausted: "Complete exhaustion means you've been pushing too hard. Permission to rest: granted. 🫠",
                numb: "Numbness is often a shield. It's okay to feel nothing — it won't last forever. 🫥"
            };

            if (subResponses[sub.id]) {
                empathyText.textContent = subResponses[sub.id];
            }
        }

        // ─── DYNAMIC JOURNAL PROMPT ────────────────────────────────────
        function updateDynamicPrompt(mood) {
            if (!promptText) return;
            const prompts = DYNAMIC_PROMPTS[mood];
            if (!prompts || prompts.length === 0) return;
            const randomPrompt = prompts[Math.floor(Math.random() * prompts.length)];
            promptText.textContent = randomPrompt;
        }

        // ─── SYMPTOM/INFLUENCE TAG TOGGLE ──────────────────────────────
        symptomBtns.forEach(btn => {
            btn.addEventListener("click", () => {
                const sym = btn.getAttribute("data-symptom");
                if (selectedSymptoms.has(sym)) {
                    selectedSymptoms.delete(sym);
                    btn.style.background = "transparent";
                    btn.style.borderColor = "var(--border)";
                    btn.style.fontWeight = "normal";
                } else {
                    selectedSymptoms.add(sym);
                    btn.style.background = "rgba(255,140,66,0.15)";
                    btn.style.borderColor = "var(--primary)";
                    btn.style.fontWeight = "700";
                }
            });
        });

        // ─── SAVE MOOD CHECK-IN ────────────────────────────────────────
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

                // 1. Structure the data comprehensively
                const now = new Date();
                const hour = now.getHours();
                let timeOfDay = "morning";
                if (hour >= 12 && hour < 17) timeOfDay = "afternoon";
                else if (hour >= 17) timeOfDay = "evening";

                // Map new emotions back to old scale for legacy compatibility
                const emMapForOld = { amazing: "great", good: "good", okay: "okay", bad: "bad", awful: "terrible" };
                const legacyMood = emMapForOld[selectedEmotion] || "okay";

                const unifiedMoodData = {
                    // Legacy structure hooks
                    date: now.toLocaleDateString(),
                    dateISO: now.toISOString().split('T')[0],
                    timestamp: Date.now(),
                    mood: legacyMood,
                    note: moodJournalInput ? moodJournalInput.value : "",
                    tags: Array.from(selectedSymptoms),
                    timeOfDay: timeOfDay,
                    time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    context: {
                        waterConsumed: typeof window.waterConsumed !== 'undefined' ? window.waterConsumed : 0,
                        waterGoal: typeof window.waterGoal !== 'undefined' ? window.waterGoal : 0,
                        streakCount: typeof window.count !== 'undefined' ? window.count : 0
                    },
                    // Advanced fields
                    emotion: selectedEmotion,
                    subEmotion: selectedSubEmotion || null,
                    energy: 3,
                    symptoms: Array.from(selectedSymptoms),
                    journal: moodJournalInput ? moodJournalInput.value : ""
                };

                // 2. Save using legacy appStorage mechanics
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
                    // Enforce max 2 entries per day
                    const todayCount = history.filter(m => m.dateISO === unifiedMoodData.dateISO).length;
                    if (todayCount >= 2) {
                        if (typeof showNotification === "function") showNotification("⚠️ Daily limit reached: Try logging again tomorrow.");
                        return;
                    }

                    history.unshift(unifiedMoodData);
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

                    if (typeof showNotification === "function") {
                        const celebrationMsgs = [
                            "✨ Check-in saved beautifully!",
                            "🧠 Emotional intelligence +1!",
                            "💎 Self-awareness recorded!",
                            "🌟 Beautiful. Your pattern data just got richer.",
                            "📊 Insight engine updated!"
                        ];
                        showNotification(celebrationMsgs[Math.floor(Math.random() * celebrationMsgs.length)]);
                    }

                    // ─── RESET UI ──────────────────────────────────────
                    selectedEmotion = null;
                    selectedSubEmotion = null;
                    selectedSymptoms.clear();

                    // Reset primary picks
                    primaryPicks.forEach(p => {
                        p.style.transform = "scale(1)";
                        p.style.opacity = "1";
                        p.style.background = "transparent";
                        p.style.boxShadow = "none";
                        p.style.filter = "";
                    });

                    // Hide sub-emotions and empathy banner
                    if (subEmotionCard) subEmotionCard.classList.add("hidden");
                    if (empathyBanner) empathyBanner.classList.add("hidden");

                    // Reset symptom buttons
                    const currentSymptomBtns = document.querySelectorAll(".symptom-btn");
                    currentSymptomBtns.forEach(btn => {
                        btn.style.background = "transparent";
                        btn.style.borderColor = "var(--border)";
                        btn.style.fontWeight = "normal";
                    });

                    // Reset inputs
                    if (moodJournalInput) moodJournalInput.value = "";
                    const customInf = document.getElementById("custom-influence-input");
                    if (customInf) customInf.value = "";

                    // Reset prompt
                    if (promptText) promptText.textContent = "What's one small thing you can control right now?";

                    // ─── SYNC UI ───────────────────────────────────────
                    if (typeof window.renderMoodHistory === "function") window.renderMoodHistory();
                    if (typeof window.renderMoodHeatmap === "function") window.renderMoodHeatmap();
                    if (typeof window.generateMoodInsights === "function") window.generateMoodInsights();
                    if (typeof window.updateWellbeingIndex === "function") window.updateWellbeingIndex();
                    if (typeof window.detectMoodPatterns === "function") window.detectMoodPatterns();
                    if (typeof window.updateVitalityUI === 'function') window.updateVitalityUI();
                    if (typeof window.tryVitalityStreak === 'function') window.tryVitalityStreak();
                    window.refreshAdvancedAnalytics();

                    // Scroll to insights
                    const moodHistoryEl = document.getElementById("mood-ai-insights");
                    if (moodHistoryEl) {
                        moodHistoryEl.scrollIntoView({ behavior: 'smooth' });
                    }

                } catch (err) {
                    console.error("Error during save checkin:", err);
                    if (typeof showNotification === "function") showNotification("Error saving mood. Please try again.");
                }
            });
        }

        // ─── MODAL CLOSE ───────────────────────────────────────────────
        const closeMood = document.getElementById("closeMood");
        if (closeMood) {
            closeMood.addEventListener("click", () => {
                if (typeof showPage === "function") showPage("main");
            });
        }

        // ─── WELLBEING INDEX CALCULATION ───────────────────────────────
        // Score from 0–100 based on: average mood, volatility, trend, logging frequency.
        window.updateWellbeingIndex = function() {
            const scoreEl = document.getElementById("wellbeing-score");
            const labelEl = document.getElementById("wellbeing-label");
            const descEl = document.getElementById("wellbeing-desc");
            const avgEl = document.getElementById("wellbeing-avg");
            const trendEl = document.getElementById("wellbeing-trend");
            const ringFill = document.getElementById("wellbeing-ring-fill");

            if (!scoreEl) return;

            let history = [];
            try {
                const stored = appStorage.getItem("moodHistory");
                history = stored ? JSON.parse(stored) : [];
                if (!Array.isArray(history)) history = [];
            } catch(e) { history = []; }

            if (history.length < 3) {
                scoreEl.textContent = "—";
                if (labelEl) labelEl.textContent = "Need more data";
                if (descEl) descEl.textContent = "Log at least 3 moods to calculate your wellbeing score.";
                return;
            }

            const moodScores = { great: 5, good: 4, okay: 3, bad: 2, terrible: 1 };
            const now = Date.now();
            const weekMs = 7 * 86400000;

            // Recent entries (last 14 days max)
            const recent = history.filter(m => {
                const ts = m.timestamp || new Date(m.dateISO || m.date).getTime();
                return now - ts < 14 * 86400000;
            });

            if (recent.length < 2) {
                scoreEl.textContent = "—";
                if (labelEl) labelEl.textContent = "Need recent data";
                if (descEl) descEl.textContent = "Your recent entries are too old. Log a mood to update your score.";
                return;
            }

            // 1. Average mood score (0-40 points)
            const scores = recent.map(m => moodScores[m.mood] || 3);
            const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
            const avgScore = ((avg - 1) / 4) * 40;

            // 2. Emotional stability — low volatility = good (0-25 points)
            const mean = avg;
            const variance = scores.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / scores.length;
            const stdDev = Math.sqrt(variance);
            const stabilityScore = Math.max(0, 25 - (stdDev * 12));

            // 3. Trend direction — improving = good (0-20 points)
            const last7 = recent.filter(m => {
                const ts = m.timestamp || new Date(m.dateISO || m.date).getTime();
                return now - ts < weekMs;
            });
            const prev7 = recent.filter(m => {
                const ts = m.timestamp || new Date(m.dateISO || m.date).getTime();
                return now - ts >= weekMs && now - ts < 2 * weekMs;
            });
            let trendScore = 10; // neutral
            let trendText = "Stable";
            if (last7.length >= 2 && prev7.length >= 2) {
                const avgLast = last7.reduce((s, m) => s + (moodScores[m.mood] || 3), 0) / last7.length;
                const avgPrev = prev7.reduce((s, m) => s + (moodScores[m.mood] || 3), 0) / prev7.length;
                const diff = avgLast - avgPrev;
                if (diff > 0.5) { trendScore = 20; trendText = "Rising ↑"; }
                else if (diff > 0.2) { trendScore = 15; trendText = "Slightly Up"; }
                else if (diff < -0.5) { trendScore = 0; trendText = "Declining ↓"; }
                else if (diff < -0.2) { trendScore = 5; trendText = "Slightly Down"; }
            }

            // 4. Logging frequency — consistency = good (0-15 points)
            const uniqueDays = new Set(recent.map(m => m.dateISO || new Date(m.timestamp || m.date).toISOString().split('T')[0]));
            const freqScore = Math.min(15, (uniqueDays.size / 14) * 15);

            // Total
            const total = Math.round(Math.min(100, avgScore + stabilityScore + trendScore + freqScore));

            // Update UI
            scoreEl.textContent = total;
            if (avgEl) avgEl.textContent = avg.toFixed(1) + "/5";
            if (trendEl) trendEl.textContent = trendText;

            // Label and description
            let label = "Calculating...";
            let desc = "";
            if (total >= 85) { label = "Thriving 🌟"; desc = "Your mental wellbeing is excellent. Keep doing what you're doing!"; }
            else if (total >= 70) { label = "Flourishing 🌿"; desc = "Strong emotional health. Small improvements can push you even higher."; }
            else if (total >= 55) { label = "Stable ☀️"; desc = "You're doing okay. Focus on consistency and your top mood boosters."; }
            else if (total >= 40) { label = "Managing 🌤️"; desc = "Room for improvement. Check your insights for actionable patterns."; }
            else if (total >= 25) { label = "Struggling 🌧️"; desc = "Your wellbeing needs attention. Prioritize self-care and reach out to someone."; }
            else { label = "In Crisis 🌩️"; desc = "Please take care of yourself. Talk to someone you trust or a professional. You matter."; }

            if (labelEl) labelEl.textContent = label;
            if (descEl) descEl.textContent = desc;

            // Animate ring
            if (ringFill) {
                const circumference = 314; // 2 * PI * 50
                const offset = circumference - (total / 100) * circumference;
                ringFill.style.strokeDashoffset = offset;
            }
        };

        // ─── PATTERN DETECTION ─────────────────────────────────────────
        // Analyzes moodHistory for concerning or useful patterns and shows alerts.
        window.detectMoodPatterns = function() {
            if (!patternAlert || !patternAlertText) return;

            let history = [];
            try {
                const stored = appStorage.getItem("moodHistory");
                history = stored ? JSON.parse(stored) : [];
                if (!Array.isArray(history)) history = [];
            } catch(e) { history = []; }

            if (history.length < 3) {
                patternAlert.classList.add("hidden");
                return;
            }

            const moodScores = { great: 5, good: 4, okay: 3, bad: 2, terrible: 1 };
            const alerts = [];

            // Pattern 1: Consecutive low moods (3+ entries of bad/terrible)
            let lowStreak = 0;
            for (let i = 0; i < Math.min(history.length, 10); i++) {
                const s = moodScores[history[i].mood] || 3;
                if (s <= 2) lowStreak++;
                else break;
            }
            if (lowStreak >= 3) {
                alerts.push(`You've logged a low mood ${lowStreak} times in a row. It's okay to not be okay — but please consider talking to someone you trust. 💛 You matter.`);
            }

            // Pattern 2: Day-of-week dip
            if (history.length >= 7) {
                const dayGroups = {};
                const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                history.forEach(m => {
                    const ts = m.timestamp || new Date(m.dateISO || m.date).getTime();
                    const day = new Date(ts).getDay();
                    if (!dayGroups[day]) dayGroups[day] = [];
                    dayGroups[day].push(moodScores[m.mood] || 3);
                });
                let worstDay = null, worstAvg = 6;
                for (const [day, scores] of Object.entries(dayGroups)) {
                    if (scores.length < 2) continue;
                    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
                    if (avg < worstAvg) { worstAvg = avg; worstDay = parseInt(day); }
                }
                if (worstDay !== null && worstAvg < 3) {
                    alerts.push(`Your mood tends to dip on ${dayNames[worstDay]}s (avg ${worstAvg.toFixed(1)}/5). Is there something about your ${dayNames[worstDay]} routine you could change?`);
                }
            }

            // Pattern 3: Exercise correlation
            const withExercise = history.filter(m => (m.tags || m.symptoms || []).includes("exercise"));
            const withoutExercise = history.filter(m => !(m.tags || m.symptoms || []).includes("exercise"));
            if (withExercise.length >= 3 && withoutExercise.length >= 3) {
                const avgWith = withExercise.reduce((s, m) => s + (moodScores[m.mood] || 3), 0) / withExercise.length;
                const avgWithout = withoutExercise.reduce((s, m) => s + (moodScores[m.mood] || 3), 0) / withoutExercise.length;
                if (avgWith > avgWithout + 0.5) {
                    const pct = Math.round(((avgWith - avgWithout) / avgWithout) * 100);
                    alerts.push(`Your mood is ${pct}% higher on days you exercise. 🏃 Try a 10-minute walk today?`);
                }
            }

            // Pattern 4: Evening dip
            const evening = history.filter(m => m.timeOfDay === "evening");
            const morning = history.filter(m => m.timeOfDay === "morning");
            if (evening.length >= 3 && morning.length >= 3) {
                const avgEve = evening.reduce((s, m) => s + (moodScores[m.mood] || 3), 0) / evening.length;
                const avgMorn = morning.reduce((s, m) => s + (moodScores[m.mood] || 3), 0) / morning.length;
                if (avgEve < avgMorn - 0.5) {
                    alerts.push("Your mood drops consistently in the evenings. Consider a wind-down routine — less screens, more calm. 🌙");
                }
            }

            // Show the most relevant alert (prioritize concerning patterns)
            if (alerts.length > 0) {
                patternAlertText.innerHTML = alerts[0];
                patternAlert.classList.remove("hidden");
            } else {
                patternAlert.classList.add("hidden");
            }
        };

        // ─── ADVANCED DASHBOARD WIDGETS ────────────────────────────────
        window.refreshAdvancedAnalytics = function() {
            if (typeof window.updateWellbeingIndex === "function") window.updateWellbeingIndex();
            if (typeof window.detectMoodPatterns === "function") window.detectMoodPatterns();
        };

        // ─── INITIAL LOAD ──────────────────────────────────────────────
        // Calculate wellbeing index and detect patterns on page load
        window.refreshAdvancedAnalytics();

    }, 500);
});
