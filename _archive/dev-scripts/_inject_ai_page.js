const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, 'index.html');
let html = fs.readFileSync(htmlPath, 'utf8');

const chatbotHTML = `
    <!-- ==================== ANMOL AI CHATBOT PAGE ==================== -->
    <div id="anmol-ai-page" class="page">
        <div class="ai-chat-container">
            <div class="ai-chat-header">
                <div class="ai-chat-header-info">
                    <div class="ai-avatar">🤖</div>
                    <div>
                        <div class="ai-chat-title">Anmol AI</div>
                        <div class="ai-chat-subtitle">Your savage productivity coach</div>
                    </div>
                </div>
                <button id="closeAnmolAI" class="ai-close-btn">✕</button>
            </div>

            <div class="ai-chat-messages" id="ai-chat-messages">
                <div class="ai-message ai-bot-message">
                    <div class="ai-msg-avatar">🤖</div>
                    <div class="ai-msg-bubble">
                        Yo! 👋🔥 I'm <strong>Anmol AI</strong> — your personal productivity roast master & hype beast.
                        <br><br>I can see everything you're doing in this app 👀 — your tasks, your streak, your water intake, ALL of it.
                        <br><br>Ask me anything like <em>"How am I doing today?"</em> or <em>"Roast my productivity"</em> and I'll keep it real 💯
                    </div>
                </div>
            </div>

            <div class="ai-typing-indicator hidden" id="ai-typing-indicator">
                <div class="ai-msg-avatar">🤖</div>
                <div class="ai-typing-dots">
                    <span></span><span></span><span></span>
                </div>
            </div>

            <div class="ai-chat-input-bar">
                <input type="text" id="ai-chat-input" placeholder="Ask Anmol AI anything..." autocomplete="off">
                <button id="ai-send-btn" class="ai-send-btn">
                    <span>➤</span>
                </button>
            </div>
        </div>
    </div>

    <!-- Floating AI Button -->
    <button id="anmol-ai-fab" class="anmol-ai-fab" title="Chat with Anmol AI">
        🤖
    </button>
`;

// Insert before </body>
html = html.replace('</body>', chatbotHTML + '\n</body>');

fs.writeFileSync(htmlPath, html, 'utf8');
console.log('✅ Anmol AI chatbot page injected into index.html');
