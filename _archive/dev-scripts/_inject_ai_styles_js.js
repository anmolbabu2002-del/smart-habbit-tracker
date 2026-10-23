const fs = require('fs');
const path = require('path');

// ==================== APPEND CSS ====================
const cssPath = path.join(__dirname, 'styles.css');
const chatCSS = `

/* ==================== ANMOL AI CHATBOT ==================== */
#anmol-ai-page {
    position: fixed;
    inset: 0;
    z-index: 9999;
    background: var(--bg-card, #f5f5f5);
    display: none;
}
#anmol-ai-page.active {
    display: block;
}

.ai-chat-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    max-width: 600px;
    margin: 0 auto;
    background: var(--bg-card, #fff);
}

/* Header */
.ai-chat-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: white;
    flex-shrink: 0;
}
.ai-chat-header-info {
    display: flex;
    align-items: center;
    gap: 12px;
}
.ai-avatar {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: rgba(255,255,255,0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    backdrop-filter: blur(10px);
    border: 2px solid rgba(255,255,255,0.3);
}
.ai-chat-title {
    font-size: 1.15rem;
    font-weight: 700;
    letter-spacing: 0.5px;
}
.ai-chat-subtitle {
    font-size: 0.75rem;
    opacity: 0.8;
    font-weight: 400;
}
.ai-close-btn {
    background: rgba(255,255,255,0.15);
    border: none;
    color: white;
    font-size: 1.2rem;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s;
}
.ai-close-btn:hover {
    background: rgba(255,255,255,0.3);
}

/* Messages Area */
.ai-chat-messages {
    flex: 1;
    overflow-y: auto;
    padding: 20px 16px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    scroll-behavior: smooth;
}

.ai-message {
    display: flex;
    gap: 10px;
    max-width: 88%;
    animation: aiMsgSlideIn 0.35s ease-out;
}

@keyframes aiMsgSlideIn {
    from { opacity: 0; transform: translateY(15px); }
    to { opacity: 1; transform: translateY(0); }
}

.ai-bot-message {
    align-self: flex-start;
}
.ai-user-message {
    align-self: flex-end;
    flex-direction: row-reverse;
}

.ai-msg-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: linear-gradient(135deg, #667eea, #764ba2);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    flex-shrink: 0;
    box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
}

.ai-user-message .ai-msg-avatar {
    background: linear-gradient(135deg, #f093fb, #f5576c);
}

.ai-msg-bubble {
    padding: 12px 16px;
    border-radius: 18px;
    font-size: 0.92rem;
    line-height: 1.55;
    word-wrap: break-word;
    white-space: pre-wrap;
}

.ai-bot-message .ai-msg-bubble {
    background: rgba(102, 126, 234, 0.08);
    border: 1px solid rgba(102, 126, 234, 0.15);
    color: var(--text-main, #333);
    border-bottom-left-radius: 4px;
}

.ai-user-message .ai-msg-bubble {
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: white;
    border-bottom-right-radius: 4px;
    box-shadow: 0 3px 12px rgba(102, 126, 234, 0.3);
}

/* Typing Indicator */
.ai-typing-indicator {
    display: flex;
    gap: 10px;
    padding: 0 16px 10px;
    align-items: center;
}
.ai-typing-indicator.hidden {
    display: none;
}
.ai-typing-dots {
    display: flex;
    gap: 5px;
    padding: 10px 16px;
    background: rgba(102, 126, 234, 0.08);
    border-radius: 18px;
    border-bottom-left-radius: 4px;
}
.ai-typing-dots span {
    width: 8px;
    height: 8px;
    background: #667eea;
    border-radius: 50%;
    animation: aiBounce 1.4s infinite ease-in-out;
}
.ai-typing-dots span:nth-child(2) { animation-delay: 0.2s; }
.ai-typing-dots span:nth-child(3) { animation-delay: 0.4s; }

@keyframes aiBounce {
    0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
    40% { transform: scale(1); opacity: 1; }
}

/* Input Bar */
.ai-chat-input-bar {
    display: flex;
    gap: 10px;
    padding: 14px 16px;
    background: var(--bg-card, #fff);
    border-top: 1px solid rgba(0,0,0,0.08);
    flex-shrink: 0;
}

#ai-chat-input {
    flex: 1;
    padding: 12px 18px;
    border-radius: 25px;
    border: 2px solid rgba(102, 126, 234, 0.2);
    font-size: 0.95rem;
    outline: none;
    background: rgba(102, 126, 234, 0.04);
    color: var(--text-main, #333);
    transition: border-color 0.2s, box-shadow 0.2s;
    font-family: inherit;
}
#ai-chat-input:focus {
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.15);
}
#ai-chat-input::placeholder {
    color: var(--text-muted, #999);
}

.ai-send-btn {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: linear-gradient(135deg, #667eea, #764ba2);
    border: none;
    color: white;
    font-size: 1.3rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.15s, box-shadow 0.2s;
    box-shadow: 0 3px 12px rgba(102, 126, 234, 0.35);
    flex-shrink: 0;
}
.ai-send-btn:hover {
    transform: scale(1.05);
    box-shadow: 0 5px 20px rgba(102, 126, 234, 0.5);
}
.ai-send-btn:active {
    transform: scale(0.95);
}

/* Floating AI FAB Button */
.anmol-ai-fab {
    position: fixed;
    bottom: 24px;
    right: 24px;
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: linear-gradient(135deg, #667eea, #764ba2);
    border: none;
    color: white;
    font-size: 28px;
    cursor: pointer;
    box-shadow: 0 6px 25px rgba(102, 126, 234, 0.5);
    z-index: 9000;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.2s, box-shadow 0.2s;
    animation: aiFabPulse 3s ease-in-out infinite;
}
.anmol-ai-fab:hover {
    transform: scale(1.1);
    box-shadow: 0 8px 30px rgba(102, 126, 234, 0.65);
}
.anmol-ai-fab.hidden {
    display: none;
}

@keyframes aiFabPulse {
    0%, 100% { box-shadow: 0 6px 25px rgba(102, 126, 234, 0.5); }
    50% { box-shadow: 0 6px 35px rgba(102, 126, 234, 0.8), 0 0 60px rgba(102, 126, 234, 0.2); }
}

/* Error message style */
.ai-error-bubble {
    background: rgba(255, 87, 87, 0.08) !important;
    border: 1px solid rgba(255, 87, 87, 0.25) !important;
    color: #d32f2f !important;
}
`;

fs.appendFileSync(cssPath, chatCSS, 'utf8');
console.log('✅ Chat CSS appended to styles.css');

// ==================== APPEND JS ====================
const jsPath = path.join(__dirname, 'script.js');
const chatJS = `

// ==================== ANMOL AI CHATBOT ====================
let aiConversationHistory = [];

function gatherAppContext() {
  const userName = getUserName() || "friend";
  
  // Gather tasks
  const items = Array.from(taskContainer.querySelectorAll("li"));
  const totalTasks = items.length;
  const completedItems = items.filter(li => {
    const cb = li.querySelector("input[type='checkbox']:not(.task-select-cb)");
    return cb && cb.checked;
  });
  const completedTasks = completedItems.length;
  const pendingItems = items.filter(li => {
    const cb = li.querySelector("input[type='checkbox']:not(.task-select-cb)");
    return cb && !cb.checked;
  });

  const allTaskNames = items.map(li => {
    const span = li.querySelector("span:not(.task-emoji):not(.task-tag):not(.task-priority-badge)");
    return span ? span.textContent : "";
  }).filter(Boolean);

  const completedNames = completedItems.map(li => {
    const span = li.querySelector("span:not(.task-emoji):not(.task-tag):not(.task-priority-badge)");
    return span ? span.textContent : "";
  }).filter(Boolean);

  const pendingNames = pendingItems.map(li => {
    const span = li.querySelector("span:not(.task-emoji):not(.task-tag):not(.task-priority-badge)");
    return span ? span.textContent : "";
  }).filter(Boolean);

  // Water
  const waterData = {
    consumed: waterConsumed || 0,
    goal: waterGoal || 2000
  };

  // Mood
  let latestMood = null;
  if (typeof moodHistory !== 'undefined' && moodHistory.length > 0) {
    latestMood = moodHistory[0];
  }

  // Journal
  let recentJournals = [];
  try {
    const entries = JSON.parse(localStorage.getItem("journalEntries") || "[]");
    recentJournals = entries.slice(-3).map(e => e.title || "Untitled").reverse();
  } catch(e){}

  // Daily focus
  const dailyFocus = localStorage.getItem("dailyFocus") || null;

  return {
    userName: userName,
    currentTime: new Date().toLocaleString(),
    tasks: {
      total: totalTasks,
      completed: completedTasks,
      pending: totalTasks - completedTasks,
      taskList: allTaskNames.slice(0, 15),
      completedList: completedNames.slice(0, 10),
      pendingList: pendingNames.slice(0, 10)
    },
    streak: count,
    water: waterData,
    mood: latestMood,
    recentJournals: recentJournals,
    dailyFocus: dailyFocus
  };
}

function appendAIMessage(text, isUser) {
  const messagesEl = document.getElementById("ai-chat-messages");
  if (!messagesEl) return;

  const msgDiv = document.createElement("div");
  msgDiv.className = "ai-message " + (isUser ? "ai-user-message" : "ai-bot-message");

  const avatar = document.createElement("div");
  avatar.className = "ai-msg-avatar";
  avatar.textContent = isUser ? "👤" : "🤖";

  const bubble = document.createElement("div");
  bubble.className = "ai-msg-bubble";
  
  if (isUser) {
    bubble.textContent = text;
  } else {
    // Parse basic markdown-like formatting
    let formatted = text
      .replace(/\\*\\*(.+?)\\*\\*/g, '<strong>$1</strong>')
      .replace(/\\*(.+?)\\*/g, '<em>$1</em>')
      .replace(/\\n/g, '<br>');
    bubble.innerHTML = formatted;
  }

  msgDiv.appendChild(avatar);
  msgDiv.appendChild(bubble);
  messagesEl.appendChild(msgDiv);

  // Scroll to bottom
  messagesEl.scrollTop = messagesEl.scrollHeight;
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

async function sendMessageToAnmolAI(userMessage) {
  if (!userMessage.trim()) return;

  // Show user's message
  appendAIMessage(userMessage, true);

  // Add to history
  aiConversationHistory.push({ role: "user", text: userMessage });

  // Show typing indicator
  showAITyping();

  // Gather context
  const context = gatherAppContext();

  try {
    const response = await fetch("/.netlify/functions/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: userMessage,
        context: context,
        history: aiConversationHistory.slice(-10)
      })
    });

    hideAITyping();

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const errMsg = errData.error || "Something went wrong. Try again!";
      appendAIMessage("⚠️ " + errMsg, false);
      return;
    }

    const data = await response.json();
    const reply = data.reply || "Hmm... I got nothing. Try asking again! 🤷";

    // Add to history
    aiConversationHistory.push({ role: "model", text: reply });

    // Display the AI's response
    appendAIMessage(reply, false);

  } catch (err) {
    hideAITyping();
    console.error("Anmol AI error:", err);
    appendAIMessage("⚠️ Couldn't reach Anmol AI. Make sure you're online and the app is deployed on Netlify! 🌐", false);
  }
}

function showAnmolAIPage() {
  // Hide all pages
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  
  // Show AI page
  const aiPage = document.getElementById("anmol-ai-page");
  if (aiPage) {
    aiPage.classList.add("active");
    aiPage.style.display = "block";
  }

  // Hide FAB
  const fab = document.getElementById("anmol-ai-fab");
  if (fab) fab.classList.add("hidden");

  // Focus input
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

  // Show FAB
  const fab = document.getElementById("anmol-ai-fab");
  if (fab) fab.classList.remove("hidden");

  // Go back to main
  showPage("main");
}

// Wire up events
document.addEventListener("DOMContentLoaded", function() {
  // FAB button
  const aiFab = document.getElementById("anmol-ai-fab");
  if (aiFab) {
    aiFab.addEventListener("click", showAnmolAIPage);
  }

  // Close button
  const closeBtn = document.getElementById("closeAnmolAI");
  if (closeBtn) {
    closeBtn.addEventListener("click", closeAnmolAIPage);
  }

  // Send button
  const sendBtn = document.getElementById("ai-send-btn");
  const chatInput = document.getElementById("ai-chat-input");

  if (sendBtn && chatInput) {
    sendBtn.addEventListener("click", function() {
      const msg = chatInput.value.trim();
      if (msg) {
        chatInput.value = "";
        sendMessageToAnmolAI(msg);
      }
    });

    chatInput.addEventListener("keydown", function(e) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        const msg = chatInput.value.trim();
        if (msg) {
          chatInput.value = "";
          sendMessageToAnmolAI(msg);
        }
      }
    });
  }
});
`;

fs.appendFileSync(jsPath, chatJS, 'utf8');
console.log('✅ Chat JS appended to script.js');
console.log('\\n🎉 Anmol AI is fully wired! Deploy to Netlify and set GEMINI_API_KEY in env variables.');
