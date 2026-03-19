const fs = require('fs');
const path = require('path');

// --- 1. Append CSS for header buttons + sidebar close ---
const cssPath = path.join(__dirname, 'styles.css');
let css = fs.readFileSync(cssPath, 'utf8');

// Fix btn-icon size
css = css.replace(
  '.become-productive-inline .btn-icon {\r\n    font-size: 1.2rem;\r\n}',
  '.become-productive-inline .btn-icon {\r\n    font-size: 1.1rem;\r\n}'
);

const newCss = `

/* --- Header Action Buttons (Anmol AI + Productive) --- */
.header-action-btns {
    display: flex;
    flex-direction: row;
    gap: 10px;
    margin-top: 12px;
    justify-content: flex-start;
    flex-wrap: wrap;
}

@media (max-width: 480px) {
    .header-action-btns {
        flex-direction: column;
        gap: 8px;
        width: 100%;
    }
    .header-action-btns .become-productive-inline {
        width: 100%;
        justify-content: center;
    }
}

/* --- Chat Sidebar Close Button --- */
.ai-sidebar-close {
    background: none;
    border: none;
    color: #aaa;
    font-size: 1.4rem;
    cursor: pointer;
    padding: 6px 10px;
    border-radius: 8px;
    transition: all 0.2s;
    line-height: 1;
    min-width: 44px;
    min-height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
}
.ai-sidebar-close:hover {
    color: #ff6b6b;
    background: rgba(255,107,107,0.12);
}
.ai-sidebar-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}
`;

css += newCss;
fs.writeFileSync(cssPath, css, 'utf8');
console.log('✅ CSS: Added header-action-btns + sidebar close button styles');

// --- 2. Wire up sidebar close button in JS ---
const jsPath = path.join(__dirname, 'script.js');
let js = fs.readFileSync(jsPath, 'utf8');

// Add close button listener after the history button listener
const historyLine = 'if (historyBtn) historyBtn.addEventListener("click", toggleAIChatSidebar);';
const closeListener = `

  const sidebarCloseBtn = document.getElementById("ai-sidebar-close-btn");
  if (sidebarCloseBtn) sidebarCloseBtn.addEventListener("click", toggleAIChatSidebar);`;

if (!js.includes('ai-sidebar-close-btn')) {
    js = js.replace(historyLine, historyLine + closeListener);
    fs.writeFileSync(jsPath, js, 'utf8');
    console.log('✅ JS: Wired up sidebar close button');
} else {
    console.log('ℹ️ JS: Sidebar close button already wired');
}

console.log('\n🎉 All layout fixes applied!');
