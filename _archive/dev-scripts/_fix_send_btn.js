const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, 'styles.css');

const mobileCSSFixV2 = `

/* ==================== FIX FOR MOBILE SEND BUTTON ==================== */
@media screen and (max-width: 768px) {
    .ai-chat-input-bar {
        /* This ensures the input and send button stay vertically centered with each other */
        align-items: center !important;
        /* Reset padding to a normal state to prevent the button from vanishing/distorting */
        padding: 12px 14px !important;
        /* Move the safe-area padding to a margin or use a pseudo-element instead */
        padding-bottom: calc(12px + env(safe-area-inset-bottom, 12px)) !important;
    }
    
    .ai-send-btn {
        /* Enforce exact button dimensions so mobile safari doesn't squash it */
        width: 44px !important;
        height: 44px !important;
        min-width: 44px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
    }
    
    #ai-chat-input {
        width: 100% !important;
    }
}
`;

try {
  fs.appendFileSync(cssPath, mobileCSSFixV2, 'utf8');
  console.log('✅ Mobile Send Button Fix appended to styles.css.');
} catch (error) {
  console.error('❌ Failed to append to styles.css:', error);
}
