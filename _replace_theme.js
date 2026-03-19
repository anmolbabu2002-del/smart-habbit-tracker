const fs = require('fs');
const path = require('path');
const filePath = path.join(__dirname, 'index.html');
let content = fs.readFileSync(filePath, 'utf8');

const newBuilderHTML = `            <!-- Advanced Custom Theme Studio -->
            <div id="custom-theme-builder" class="custom-theme-builder hidden">
                <div class="cts-header">
                    <h4>\u{1F3A8} Theme Studio</h4>
                    <span class="cts-subtitle">Design your perfect look</span>
                </div>
                <div class="cts-section">
                    <div class="cts-section-label">\u26A1 Quick Presets</div>
                    <div class="cts-presets-row" id="cts-presets">
                        <button class="cts-preset-btn" data-preset="midnight" style="background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);">\u{1F319} Midnight</button>
                        <button class="cts-preset-btn" data-preset="aurora" style="background: linear-gradient(135deg, #00c9ff, #92fe9d);">\u{1F30C} Aurora</button>
                        <button class="cts-preset-btn" data-preset="sakura" style="background: linear-gradient(135deg, #fbc2eb, #a6c1ee);">\u{1F338} Sakura</button>
                        <button class="cts-preset-btn" data-preset="emerald" style="background: linear-gradient(135deg, #11998e, #38ef7d);">\u{1F48E} Emerald</button>
                        <button class="cts-preset-btn" data-preset="lava" style="background: linear-gradient(135deg, #f12711, #f5af19);">\u{1F30B} Lava</button>
                        <button class="cts-preset-btn" data-preset="pastel" style="background: linear-gradient(135deg, #ffecd2, #fcb69f);">\u{1F36C} Pastel</button>
                    </div>
                </div>
                <div class="cts-section">
                    <div class="cts-section-label">\u{1F3A8} Colors</div>
                    <div class="cts-color-grid">
                        <div class="cts-color-item"><input type="color" id="custom-bg-color" value="#f4f7f6" class="cts-color-input"><span class="cts-color-label">Background</span></div>
                        <div class="cts-color-item"><input type="color" id="custom-card-color" value="#ffffff" class="cts-color-input"><span class="cts-color-label">Card</span></div>
                        <div class="cts-color-item"><input type="color" id="custom-primary-color" value="#667eea" class="cts-color-input"><span class="cts-color-label">Primary</span></div>
                        <div class="cts-color-item"><input type="color" id="custom-secondary-color" value="#764ba2" class="cts-color-input"><span class="cts-color-label">Secondary</span></div>
                        <div class="cts-color-item"><input type="color" id="custom-text-color" value="#2d3748" class="cts-color-input"><span class="cts-color-label">Text</span></div>
                        <div class="cts-color-item"><input type="color" id="custom-border-color" value="#e0e0e0" class="cts-color-input"><span class="cts-color-label">Border</span></div>
                    </div>
                </div>
                <div class="cts-section">
                    <div class="cts-section-label">\u2728 Animation Style</div>
                    <div class="cts-anim-grid" id="cts-anim-grid">
                        <button class="cts-anim-btn active" data-anim="none"><span class="cts-anim-icon">\u{1F6AB}</span><span>None</span></button>
                        <button class="cts-anim-btn" data-anim="pulse-glow"><span class="cts-anim-icon">\u{1F4AB}</span><span>Pulse Glow</span></button>
                        <button class="cts-anim-btn" data-anim="float"><span class="cts-anim-icon">\u{1F388}</span><span>Float</span></button>
                        <button class="cts-anim-btn" data-anim="neon"><span class="cts-anim-icon">\u26A1</span><span>Neon Flicker</span></button>
                        <button class="cts-anim-btn" data-anim="shimmer"><span class="cts-anim-icon">\u{1FA9E}</span><span>Shimmer</span></button>
                    </div>
                </div>
                <div class="cts-section">
                    <div class="cts-section-label">\u{1F524} Typography</div>
                    <div class="cts-font-grid" id="cts-font-grid">
                        <button class="cts-font-btn active" data-font="default" style="font-family: 'Segoe UI', sans-serif;">Aa Default</button>
                        <button class="cts-font-btn" data-font="inter" style="font-family: 'Inter', sans-serif;">Aa Inter</button>
                        <button class="cts-font-btn" data-font="outfit" style="font-family: 'Outfit', sans-serif;">Aa Outfit</button>
                        <button class="cts-font-btn" data-font="space-grotesk" style="font-family: 'Space Grotesk', sans-serif;">Aa Space</button>
                        <button class="cts-font-btn" data-font="jetbrains" style="font-family: 'JetBrains Mono', monospace;">Aa Mono</button>
                        <button class="cts-font-btn" data-font="playfair" style="font-family: 'Playfair Display', serif;">Aa Serif</button>
                    </div>
                </div>
                <div class="cts-section">
                    <div class="cts-section-label">\u{1F518} Shape &amp; Style</div>
                    <div class="cts-style-row">
                        <label class="cts-slider-label">Border Radius</label>
                        <div class="cts-slider-wrap"><span class="cts-slider-tag">Sharp</span><input type="range" id="cts-radius-slider" min="0" max="30" value="12" class="cts-slider"><span class="cts-slider-tag">Pill</span></div>
                    </div>
                    <div class="cts-style-row" style="margin-top: 12px;">
                        <label class="cts-slider-label">Button Style</label>
                        <div class="cts-btn-style-grid" id="cts-btn-style">
                            <button class="cts-style-pick active" data-btnstyle="solid">Solid</button>
                            <button class="cts-style-pick" data-btnstyle="outline">Outline</button>
                            <button class="cts-style-pick" data-btnstyle="ghost">Ghost</button>
                            <button class="cts-style-pick" data-btnstyle="gradient">Gradient</button>
                        </div>
                    </div>
                    <div class="cts-style-row" style="margin-top: 12px;">
                        <label class="cts-slider-label">Card Effect</label>
                        <div class="cts-btn-style-grid" id="cts-card-style">
                            <button class="cts-style-pick active" data-cardstyle="shadow">Shadow</button>
                            <button class="cts-style-pick" data-cardstyle="flat">Flat</button>
                            <button class="cts-style-pick" data-cardstyle="glass">Glass</button>
                            <button class="cts-style-pick" data-cardstyle="neumorphic">Neumorphic</button>
                        </div>
                    </div>
                </div>
                <div class="cts-section">
                    <div class="cts-section-label">\u{1F441}\uFE0F Live Preview</div>
                    <div class="cts-preview-card" id="cts-preview-card">
                        <div class="cts-preview-heading">Sample Heading</div>
                        <div class="cts-preview-task"><span class="cts-preview-emoji">\u{1F4DD}</span><span class="cts-preview-text">Example Task Item</span></div>
                        <div class="cts-preview-btn-row"><button class="cts-preview-btn" id="cts-preview-btn">Action Button</button></div>
                    </div>
                </div>
                <div class="cts-actions">
                    <button id="save-custom-theme-btn" class="cts-save-btn">\u{1F4BE} Save Theme</button>
                    <button id="reset-custom-theme-btn" class="cts-reset-btn">\u{1F504} Reset</button>
                </div>
            </div>`;

const startMarker = '<!-- Advanced Custom Theme Studio -->';
const startIdx = content.indexOf(startMarker);
if (startIdx === -1) { console.log('ERROR: start marker not found'); process.exit(1); }

// Try both & and &amp; for the end marker
let endBtnIdx = content.indexOf('Apply & Save Custom Theme</button>', startIdx);
if (endBtnIdx === -1) endBtnIdx = content.indexOf('Apply &amp; Save Custom Theme</button>', startIdx);
if (endBtnIdx === -1) { console.log('ERROR: end marker not found'); process.exit(1); }

const closingDiv = content.indexOf('</div>', endBtnIdx);
if (closingDiv === -1) { console.log('ERROR: closing div not found'); process.exit(1); }
const endIdx = closingDiv + '</div>'.length;

content = content.substring(0, startIdx) + newBuilderHTML + content.substring(endIdx);
fs.writeFileSync(filePath, content, 'utf8');
console.log('SUCCESS');
