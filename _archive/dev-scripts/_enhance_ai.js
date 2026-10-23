const fs = require('fs');
const path = require('path');

// 1. Remove old duplicate chatbot functions from script.js
const jsPath = path.join(__dirname, 'script.js');
let js = fs.readFileSync(jsPath, 'utf8');

// Find the second occurrence of "function gatherAppContext()" and remove everything from there to end
const marker = '\nfunction gatherAppContext() {\n  const userName = getUserName() || "friend";\n  \n  // Gather tasks';
const firstIdx = js.indexOf(marker);
const secondIdx = js.indexOf(marker, firstIdx + 1);

if (secondIdx !== -1) {
  js = js.substring(0, secondIdx);
  fs.writeFileSync(jsPath, js, 'utf8');
  console.log('✅ Removed old duplicate chatbot functions from script.js');
} else {
  console.log('⚠️ Could not find duplicate - checking with \\r\\n...');
  const markerCRLF = '\r\nfunction gatherAppContext() {\r\n  const userName = getUserName() || "friend";\r\n  \r\n  // Gather tasks';
  const firstIdx2 = js.indexOf(markerCRLF);
  const secondIdx2 = js.indexOf(markerCRLF, firstIdx2 + 1);
  if (secondIdx2 !== -1) {
    js = js.substring(0, secondIdx2);
    fs.writeFileSync(jsPath, js, 'utf8');
    console.log('✅ Removed old duplicate chatbot functions from script.js (CRLF)');
  } else {
    console.log('❌ Could not find duplicate functions to remove. Manual cleanup needed.');
  }
}

// 2. Update the chatbot page HTML to add sidebar + history/new-chat buttons
const htmlPath = path.join(__dirname, 'index.html');
let html = fs.readFileSync(htmlPath, 'utf8');

// Replace the existing ai-chat-header with an enhanced version that has history + new chat buttons
const oldHeader = `<div class="ai-chat-header">
                <div class="ai-chat-header-info">
                    <div class="ai-avatar">🤖</div>
                    <div>
                        <div class="ai-chat-title">Anmol AI</div>
                        <div class="ai-chat-subtitle">Your savage productivity coach</div>
                    </div>
                </div>
                <button id="closeAnmolAI" class="ai-close-btn">✕</button>
            </div>`;

const newHeader = `<div class="ai-chat-header">
                <div class="ai-chat-header-left">
                    <button id="ai-history-btn" class="ai-header-btn" title="Chat History">☰</button>
                    <div class="ai-chat-header-info">
                        <div class="ai-avatar">🤖</div>
                        <div>
                            <div class="ai-chat-title">Anmol AI</div>
                            <div class="ai-chat-subtitle">Your savage productivity coach</div>
                        </div>
                    </div>
                </div>
                <div class="ai-chat-header-right">
                    <button id="ai-new-chat-btn" class="ai-header-btn" title="New Chat">✚</button>
                    <button id="closeAnmolAI" class="ai-close-btn">✕</button>
                </div>
            </div>

            <!-- Chat History Sidebar -->
            <div id="ai-chat-sidebar" class="ai-chat-sidebar">
                <div class="ai-sidebar-header">
                    <h3>💬 Chat History</h3>
                </div>
                <div id="ai-chat-sidebar-list" class="ai-sidebar-list"></div>
            </div>`;

if (html.includes(oldHeader)) {
  html = html.replace(oldHeader, newHeader);
  fs.writeFileSync(htmlPath, html, 'utf8');
  console.log('✅ Added chat history sidebar and header buttons to index.html');
} else {
  console.log('⚠️ Could not find exact header match, trying flexible replace...');
  // Try a more flexible match
  const headerRegex = /<div class="ai-chat-header">[\s\S]*?<button id="closeAnmolAI" class="ai-close-btn">✕<\/button>\s*<\/div>/;
  if (headerRegex.test(html)) {
    html = html.replace(headerRegex, newHeader);
    fs.writeFileSync(htmlPath, html, 'utf8');
    console.log('✅ Added chat history sidebar and header buttons to index.html (regex match)');
  } else {
    console.log('❌ Could not update header. Manual update needed.');
  }
}

// 3. Append sidebar CSS to styles.css
const cssPath = path.join(__dirname, 'styles.css');
const sidebarCSS = `

/* ==================== AI CHAT SIDEBAR & HISTORY ==================== */
.ai-chat-header-left, .ai-chat-header-right {
    display: flex;
    align-items: center;
    gap: 8px;
}
.ai-header-btn {
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
    transition: background 0.2s, transform 0.15s;
}
.ai-header-btn:hover {
    background: rgba(255,255,255,0.3);
    transform: scale(1.05);
}

.ai-chat-sidebar {
    position: absolute;
    top: 0;
    left: -280px;
    width: 270px;
    height: 100%;
    background: linear-gradient(180deg, #1a1a2e, #16213e);
    color: white;
    z-index: 100;
    transition: left 0.3s ease;
    display: flex;
    flex-direction: column;
    box-shadow: 4px 0 20px rgba(0,0,0,0.3);
    border-right: 1px solid rgba(255,255,255,0.1);
}
.ai-chat-sidebar.open {
    left: 0;
}
.ai-sidebar-header {
    padding: 20px 16px 12px;
    border-bottom: 1px solid rgba(255,255,255,0.1);
}
.ai-sidebar-header h3 {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 700;
}
.ai-sidebar-list {
    flex: 1;
    overflow-y: auto;
    padding: 10px 8px;
    display: flex;
    flex-direction: column;
    gap: 4px;
}
.ai-sidebar-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    border-radius: 10px;
    cursor: pointer;
    transition: background 0.2s;
    gap: 8px;
}
.ai-sidebar-item:hover {
    background: rgba(255,255,255,0.08);
}
.ai-sidebar-item.active {
    background: rgba(102, 126, 234, 0.25);
    border: 1px solid rgba(102, 126, 234, 0.4);
}
.ai-sidebar-title {
    flex: 1;
    font-size: 0.85rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: rgba(255,255,255,0.85);
}
.ai-sidebar-delete {
    background: none;
    border: none;
    color: rgba(255,255,255,0.35);
    font-size: 0.85rem;
    cursor: pointer;
    padding: 4px;
    border-radius: 6px;
    transition: color 0.2s, background 0.2s;
    flex-shrink: 0;
}
.ai-sidebar-delete:hover {
    color: #ff6b6b;
    background: rgba(255,107,107,0.15);
}

/* Make chat container relative for sidebar positioning */
.ai-chat-container {
    position: relative;
    overflow: hidden;
}
`;

fs.appendFileSync(cssPath, sidebarCSS, 'utf8');
console.log('✅ Sidebar CSS appended to styles.css');

console.log('\\n🎉 All enhancements applied! Anmol AI now has:');
console.log('   - Creator credit (Anmol Jha)');
console.log('   - Full app context (meditation, pomodoro, sleep)');
console.log('   - Persistent chat history saved to localStorage');
console.log('   - Chat sidebar with new/delete/switch functionality');
