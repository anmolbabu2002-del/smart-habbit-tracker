const fs = require('fs');
const path = require('path');

const correctImg = 'anmol-ai-avatar.jpeg';
const wrongImg = 'anmol-ai-profile.jpeg';

// 1. Update index.html
try {
  let indexHtml = fs.readFileSync('index.html', 'utf8');
  let isUTF16 = false;
  
  if (indexHtml.charCodeAt(0) === 0xFEFF) {
    isUTF16 = true;
    indexHtml = indexHtml.slice(1);
  }

  // Restore the Dashboard Button
  const badActionBtn = '<img src="' + wrongImg + '" class="btn-icon" style="width:24px; height:24px; border-radius:50%; object-fit:cover; margin-right:6px; vertical-align:middle; display:inline-block;">';
  const goodActionBtn = '<span class="btn-icon">🤖</span>';
  
  if (indexHtml.includes(badActionBtn)) {
    indexHtml = indexHtml.split(badActionBtn).join(goodActionBtn);
    console.log('✅ Restored the dashboard button back to the robotic sign (🤖)');
  }

  // Fix the image paths from profile -> avatar
  if (indexHtml.includes(wrongImg)) {
    indexHtml = indexHtml.split(wrongImg).join(correctImg);
    console.log('✅ Updated index.html paths to use ' + correctImg);
  }

  fs.writeFileSync('index.html', (isUTF16 ? '\\uFEFF' : '') + indexHtml, 'utf8');

} catch (e) {
  console.log('Error updating index.html:', e.message);
}

// 2. Update script.js
try {
  let scriptJs = fs.readFileSync('script.js', 'utf8');
  let isUTF16Script = false;
  
  if (scriptJs.charCodeAt(0) === 0xFEFF) {
    isUTF16Script = true;
    scriptJs = scriptJs.slice(1);
  }

  if (scriptJs.includes(wrongImg)) {
    scriptJs = scriptJs.split(wrongImg).join(correctImg);
    console.log('✅ Updated script.js paths to use ' + correctImg);
  }

  fs.writeFileSync('script.js', (isUTF16Script ? '\\uFEFF' : '') + scriptJs, 'utf8');

} catch (e) {
  console.log('Error updating script.js:', e.message);
}
