const fs = require('fs');
const path = require('path');

// 1. Rename the WhatsApp Image to 'anmol-ai-profile.jpeg'
const sourceImg = 'WhatsApp Image 2026-03-19 at 19.43.26.jpeg';
const targetImg = 'anmol-ai-profile.jpeg';

try {
  if (fs.existsSync(sourceImg)) {
    fs.renameSync(sourceImg, targetImg);
    console.log('✅ Image renamed to', targetImg);
  } else if (fs.existsSync(targetImg)) {
    console.log('✅ Image already renamed.');
  } else {
    console.log('❌ Source image not found. Please ensure the WhatsApp image is in this folder.');
  }
} catch (e) {
  console.log('Error renaming image:', e.message);
}

// 2. Read and update index.html
try {
  let indexHtml = fs.readFileSync('index.html', 'utf8');
  let isUTF16 = false;
  
  if (indexHtml.charCodeAt(0) === 0xFEFF) {
    isUTF16 = true;
    indexHtml = indexHtml.slice(1);
  }

  // Replace Header Avatar
  const oldHeaderAvatar = '<div class="ai-avatar">🤖</div>';
  const newHeaderAvatar = '<img src="' + targetImg + '" class="ai-avatar" alt="Anmol AI" style="object-fit: cover; padding: 0; border: 2px solid rgba(255,255,255,0.8);">';
  if (indexHtml.includes(oldHeaderAvatar)) {
    indexHtml = indexHtml.split(oldHeaderAvatar).join(newHeaderAvatar);
    console.log('✅ Replaced header avatar in index.html');
  }

  // Replace default Welcome Message Avatar
  const oldWelcomeAvatar = '<div class="ai-msg-avatar">🤖</div>';
  const newWelcomeAvatar = '<div class="ai-msg-avatar" style="padding:0; overflow:hidden;"><img src="' + targetImg + '" style="width:100%; height:100%; object-fit:cover;"></div>';
  if (indexHtml.includes(oldWelcomeAvatar)) {
    indexHtml = indexHtml.split(oldWelcomeAvatar).join(newWelcomeAvatar);
    console.log('✅ Replaced welcome message avatar in index.html');
  }

  // Replace Main Page Action Button Avatar
  const oldActionBtn = '<span class="btn-icon">🤖</span>';
  const newActionBtn = '<img src="' + targetImg + '" class="btn-icon" style="width:24px; height:24px; border-radius:50%; object-fit:cover; margin-right:6px; vertical-align:middle; display:inline-block;">';
  if (indexHtml.includes(oldActionBtn)) {
    indexHtml = indexHtml.split(oldActionBtn).join(newActionBtn);
    console.log('✅ Replaced main page header button avatar in index.html');
  }

  // Write changes
  fs.writeFileSync('index.html', (isUTF16 ? '\\uFEFF' : '') + indexHtml, 'utf8');

} catch (e) {
  console.log('Error updating index.html:', e.message);
}

// 3. Read and update script.js
try {
  let scriptJs = fs.readFileSync('script.js', 'utf8');
  let isUTF16Script = false;
  
  if (scriptJs.charCodeAt(0) === 0xFEFF) {
    isUTF16Script = true;
    scriptJs = scriptJs.slice(1);
  }

  const oldScriptAvatar = 'avatar.textContent = isUser ? "👤" : "🤖";';
  
  const newScriptAvatar = 'if (isUser) {\\n' +
    '    avatar.textContent = "👤";\\n' +
    '  } else {\\n' +
    '    avatar.style.padding = "0";\\n' +
    '    avatar.style.overflow = "hidden";\\n' +
    '    avatar.innerHTML = \\'<img src="' + targetImg + '" style="width:100%; height:100%; object-fit:cover;">\\';\\n' +
    '  }';

  if (scriptJs.includes(oldScriptAvatar)) {
    scriptJs = scriptJs.replace(oldScriptAvatar, newScriptAvatar);
    fs.writeFileSync('script.js', (isUTF16Script ? '\\uFEFF' : '') + scriptJs, 'utf8');
    console.log('✅ script.js updated successfully for message bubbles.');
  } else {
    // Maybe already applied or missing
    console.log('⚠️ Could not find exact avatar string in script.js (already updated?)');
  }

} catch (e) {
  console.log('Error updating script.js:', e.message);
}
