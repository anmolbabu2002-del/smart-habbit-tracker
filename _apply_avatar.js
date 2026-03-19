const fs = require('fs');
const path = require('path');

const oldImageName = 'WhatsApp Image 2026-03-19 at 19.43.26.jpeg';
const newImageName = 'anmol-ai-profile.jpg';
const oldImagePath = path.join(__dirname, oldImageName);
const newImagePath = path.join(__dirname, newImageName);

// 1. Rename the image
if (fs.existsSync(oldImagePath)) {
  fs.renameSync(oldImagePath, newImagePath);
  console.log('✅ Image renamed to anmol-ai-profile.jpg');
} else if (fs.existsSync(newImagePath)) {
  console.log('✅ Image already renamed.');
} else {
  console.log('❌ Could not find the WhatsApp image!');
}

// 2. Update index.html
const indexPath = path.join(__dirname, 'index.html');
let indexHtml = fs.readFileSync(indexPath, 'utf-8');
const isUTF16Index = indexHtml.charCodeAt(0) === 0xFEFF;
if (isUTF16Index) indexHtml = indexHtml.slice(1); // Strip BOM

// Replace 🤖 in the header with the image
const oldAvatarHTML = '<div class="ai-avatar">🤖</div>';
const newAvatarHTML = '<img src="anmol-ai-profile.jpg" class="ai-avatar" alt="Anmol AI" style="object-fit: cover; padding: 0; border: 2px solid rgba(255,255,255,0.8);">';

if (indexHtml.includes(oldAvatarHTML)) {
  indexHtml = indexHtml.replace(oldAvatarHTML, newAvatarHTML);
  fs.writeFileSync(indexPath, (isUTF16Index ? '\\uFEFF' : '') + indexHtml, 'utf-8');
  console.log('✅ index.html updated: Avatar replaced with image');
} else {
  console.log('⚠️ Could not find exact avatar HTML in index.html to replace. (Maybe already replaced?)');
}

// 3. Update script.js (for message bubbles)
const scriptPath = path.join(__dirname, 'script.js');
let scriptJs = fs.readFileSync(scriptPath, 'utf-8');
const isUTF16Script = scriptJs.charCodeAt(0) === 0xFEFF;
if (isUTF16Script) scriptJs = scriptJs.slice(1);

const oldMsgAvatar = 'avatar.textContent = isUser ? "👤" : "🤖";';
const newMsgAvatar = \`if (isUser) {
    avatar.textContent = "👤";
  } else {
    avatar.innerHTML = '<img src="anmol-ai-profile.jpg" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">';
  }\`;

if (scriptJs.includes(oldMsgAvatar)) {
  scriptJs = scriptJs.replace(oldMsgAvatar, newMsgAvatar);
  fs.writeFileSync(scriptPath, (isUTF16Script ? '\\uFEFF' : '') + scriptJs, 'utf-8');
  console.log('✅ script.js updated: Chat bubble avatars replaced with image');
} else {
  console.log('⚠️ Could not find exact msg avatar generation in script.js.');
}

// 4. Update the FAB button and Main Header button in index.html as well
const oldFab = '<button id="anmol-ai-fab" class="anmol-ai-fab">🤖</button>';
const newFab = '<button id="anmol-ai-fab" class="anmol-ai-fab" style="padding:0; overflow:hidden;"><img src="anmol-ai-profile.jpg" style="width:100%; height:100%; object-fit:cover; border-radius:50%;"></button>';

if (indexHtml.includes(oldFab)) {
  indexHtml = indexHtml.replace(oldFab, newFab);
  fs.writeFileSync(indexPath, (isUTF16Index ? '\\uFEFF' : '') + indexHtml, 'utf-8');
  console.log('✅ index.html updated: Floating Action Button replaced with image');
}

const oldHeaderBtn = '<span class="btn-icon">🤖</span> Anmol AI';
const newHeaderBtn = '<img src="anmol-ai-profile.jpg" style="width:24px; height:24px; border-radius:50%; object-fit:cover; margin-right:6px; vertical-align:middle;"> Anmol AI';

if (indexHtml.includes(oldHeaderBtn)) {
  indexHtml = indexHtml.replace(oldHeaderBtn, newHeaderBtn);
  fs.writeFileSync(indexPath, (isUTF16Index ? '\\uFEFF' : '') + indexHtml, 'utf-8');
  console.log('✅ index.html updated: Main Header button replaced with image');
}

console.log('Done!');
