const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, 'styles.css');

const mobileCSSFix = `

/* ==================== MOBILE CHATBOT LAYOUT FIX ==================== */
@media screen and (max-width: 768px) {
    #anmol-ai-page {
        /* Use dynamic viewport height to account for mobile keyboards and URL bars */
        height: 100dvh !important;
        bottom: auto !important;
    }
    
    .ai-chat-container {
        height: 100dvh !important;
    }
    
    .ai-chat-input-bar {
        /* Add extra padding at the bottom for iPhone home bars and mobile navigation */
        padding-bottom: max(20px, env(safe-area-inset-bottom, 24px)) !important;
        /* Ensure it stays above everything */
        position: relative;
        z-index: 10000;
    }
    
    .ai-chat-messages {
        /* Give messages a bit more breathing room at the bottom */
        padding-bottom: 25px !important;
    }
}
`;

try {
  // Append the fix to the end of styles.css
  fs.appendFileSync(cssPath, mobileCSSFix, 'utf8');
  console.log('✅ Mobile chat layout fix appended to styles.css successfully.');
} catch (error) {
  console.error('❌ Failed to append to styles.css:', error);
}
