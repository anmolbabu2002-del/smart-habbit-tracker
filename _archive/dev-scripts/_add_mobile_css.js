const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, 'styles.css');
let css = fs.readFileSync(cssPath, 'utf8');

const mobileCss = `

/* ==================== COMPREHENSIVE SMARTPHONE RESPONSIVENESS ==================== */

/* --- Tablets & Small Laptops (max-width: 768px) --- */
@media (max-width: 768px) {

    /* Greeting row: stack buttons below heading */
    .greeting-row {
        flex-wrap: wrap;
        gap: 8px;
    }

    .greeting-row h1 {
        width: 100%;
        font-size: 1.6rem !important;
        flex: unset;
    }

    .become-productive-inline {
        padding: 8px 14px;
        font-size: 0.82rem;
        gap: 5px;
    }

    .become-productive-inline .btn-icon {
        font-size: 1rem;
    }

    /* AI Chat Page */
    .ai-chat-container {
        border-radius: 0 !important;
        max-width: 100% !important;
        height: 100vh !important;
        max-height: 100vh !important;
    }

    .ai-chat-header {
        padding: 12px 15px;
    }

    .ai-chat-title {
        font-size: 1.1rem;
    }

    .ai-chat-subtitle {
        font-size: 0.75rem;
    }

    .ai-chat-messages {
        padding: 12px;
    }

    .ai-msg-bubble {
        max-width: 88%;
        font-size: 0.92rem;
        padding: 10px 14px;
    }

    .ai-chat-input-bar {
        padding: 10px 12px;
    }

    #ai-chat-input {
        font-size: 15px;
        padding: 10px 14px;
    }

    /* Chat sidebar full-width on mobile */
    .ai-chat-sidebar {
        width: 85% !important;
    }

    /* Modals */
    .modal-content,
    .cheatsheet-modal-content,
    .priority-modal {
        width: 95% !important;
        max-width: 95% !important;
        max-height: 85vh;
        overflow-y: auto;
    }

    /* Sleep page cards */
    .sleep-log-entry {
        flex-direction: column;
        gap: 8px;
    }

    /* Settings */
    .settings-section {
        padding: 15px;
    }

    .settings-option {
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
    }

    /* Close/delete buttons — larger touch targets */
    .close-btn,
    .delete-btn {
        min-width: 44px;
        min-height: 44px;
        font-size: 1.3rem;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    /* Castle visual */
    .castle-visual {
        transform: scale(0.85);
        transform-origin: center top;
    }

    /* Orb achievements */
    .orb-visual {
        width: 120px;
        height: 120px;
    }

    /* Milestone badges */
    .milestone-badge {
        flex-direction: column;
        text-align: center;
        padding: 12px;
    }

    /* Productivity Hub */
    .hub-grid {
        grid-template-columns: 1fr 1fr;
        gap: 10px;
    }

    .hub-card {
        padding: 12px;
        font-size: 0.9rem;
    }

    /* Quote box */
    #quotes {
        font-size: 0.9rem;
        padding: 12px;
    }

    /* Water bottle visual */
    .water-bottle-visual {
        max-width: 200px;
        margin: 0 auto;
    }
}

/* --- Smartphones (max-width: 480px) --- */
@media (max-width: 480px) {

    body {
        padding: 5px;
        padding-bottom: 75px !important;
    }

    /* Even smaller containers */
    #main,
    .page {
        padding: 15px 10px;
        border-radius: 12px;
    }

    /* Greeting row: stack fully */
    .greeting-row {
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
    }

    .greeting-row h1 {
        font-size: 1.4rem !important;
    }

    .become-productive-inline {
        padding: 7px 12px;
        font-size: 0.78rem;
    }

    /* Headings */
    h1, .page h1 {
        font-size: 1.5rem !important;
    }

    h2 {
        font-size: 1rem;
    }

    /* Dashboard stat cards */
    .stat-card {
        padding: 12px;
    }

    .stat-value {
        font-size: 1.6rem;
    }

    /* Progress circle */
    .progress-circle {
        width: 100px;
        height: 100px;
    }

    /* Task items */
    li {
        font-size: 0.9rem;
        padding: 10px 12px;
    }

    /* Nav bar */
    .nav-bar {
        padding: 6px 8px;
        gap: 3px;
    }

    .nav-btn {
        font-size: 12px;
        padding: 8px 10px;
        border-radius: 16px;
    }

    /* Pomodoro timer display */
    .timer-display {
        font-size: 3rem;
    }

    .pomodoro-presets {
        flex-wrap: wrap;
        gap: 6px;
    }

    .preset-btn {
        padding: 6px 12px;
        font-size: 0.8rem;
    }

    /* Meditation */
    .meditation-card {
        max-width: 100%;
        margin: 1rem auto;
        padding: 1.5rem 1rem;
    }

    #med-countdown {
        font-size: 2.2rem;
    }

    /* AI Chat */
    .ai-chat-container {
        height: calc(100vh - 0px) !important;
    }

    .ai-msg-bubble {
        max-width: 92%;
        font-size: 0.88rem;
        padding: 8px 12px;
    }

    .ai-msg-avatar {
        width: 28px;
        height: 28px;
        font-size: 14px;
    }

    .ai-chat-sidebar {
        width: 90% !important;
    }

    /* Streak page */
    .streak-hero {
        padding: 15px;
    }

    .streak-count-display {
        font-size: 1rem;
    }

    #streak-number {
        font-size: 3rem;
    }

    /* Journal */
    .journal-entry-card {
        padding: 12px;
    }

    .journal-entry-card h3 {
        font-size: 1rem;
    }

    /* Mood tracker */
    .mood-tags-grid {
        grid-template-columns: repeat(3, 1fr);
        gap: 6px;
    }

    .mood-tag-btn {
        padding: 8px;
        font-size: 0.8rem;
    }

    .heatmap-block {
        width: 20px;
        height: 20px;
        font-size: 11px;
    }

    /* Water buttons */
    .water-quick-btns {
        flex-wrap: wrap;
        gap: 6px;
    }

    .water-quick-btns button {
        flex: 1 1 calc(50% - 6px);
        font-size: 0.85rem;
        padding: 10px;
    }

    /* Sleep page */
    .sleep-input-group {
        flex-direction: column;
        gap: 8px;
    }

    .sleep-input-group input,
    .sleep-input-group select,
    .sleep-input-group button {
        width: 100%;
    }

    /* Settings */
    .theme-selector {
        grid-template-columns: repeat(2, 1fr);
    }

    /* Priority modal */
    .priority-modal {
        width: 98% !important;
        padding: 20px 16px;
    }

    /* Productivity hub */
    .hub-grid {
        grid-template-columns: 1fr;
    }

    /* Castle */
    .castle-visual {
        transform: scale(0.7);
    }

    /* Quote */
    #quotes {
        font-size: 0.85rem;
        padding: 10px;
    }
}

/* --- Extra Small Phones (max-width: 360px) --- */
@media (max-width: 360px) {

    .greeting-row h1 {
        font-size: 1.2rem !important;
    }

    .become-productive-inline {
        padding: 6px 10px;
        font-size: 0.72rem;
        gap: 4px;
    }

    .nav-btn {
        font-size: 11px;
        padding: 6px 8px;
    }

    .stat-value {
        font-size: 1.3rem;
    }

    #streak-number {
        font-size: 2.5rem;
    }

    .ai-msg-bubble {
        font-size: 0.82rem;
    }
}

/* --- Touch-Friendly Enhancements --- */
@media (hover: none) and (pointer: coarse) {

    /* Ensure all interactive elements have minimum 44px touch targets */
    button, 
    .nav-btn, 
    input[type="checkbox"],
    select {
        min-height: 44px;
    }

    /* Remove hover effects that look stuck on touch devices */
    .become-productive-inline:hover {
        transform: none;
    }

    .nav-btn:hover {
        background: transparent;
        color: var(--text-muted);
    }

    .nav-btn.active:hover {
        background: var(--primary);
        color: white;
    }

    /* Active state instead of hover for touch */
    .become-productive-inline:active {
        transform: scale(0.96);
        opacity: 0.9;
    }

    .nav-btn:active {
        opacity: 0.7;
    }

    /* Increase input font size to prevent iOS zoom on focus */
    input[type="text"],
    input[type="number"],
    input[type="email"],
    input[type="password"],
    textarea,
    select {
        font-size: 16px !important;
    }

    /* Disable text selection on buttons */
    button {
        -webkit-user-select: none;
        user-select: none;
    }

    /* Smooth scrolling for mobile */
    * {
        -webkit-overflow-scrolling: touch;
    }
}
`;

css += mobileCss;
fs.writeFileSync(cssPath, css, 'utf8');
console.log('✅ Comprehensive smartphone CSS appended to styles.css!');
