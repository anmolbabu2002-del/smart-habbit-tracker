// Quick fix script: Patch script.js to use CSS class for alldone button
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'script.js');
let content = fs.readFileSync(filePath, 'utf-8');

// Check if the file was read as UTF-8 properly
if (content.charCodeAt(0) === 0xFEFF) {
  content = content.slice(1); // Remove BOM
}

// Fix 1: Replace inline styles with class in allchecked()
const oldAllchecked = `      donebtn.disabled = true;
      donebtn.style.opacity = "0.6";
      donebtn.style.cursor = "not-allowed";
    } else {
      donebtn.textContent = "🎉 All Tasks Completed!";
      donebtn.disabled = false;
      donebtn.style.opacity = "1";
      donebtn.style.cursor = "pointer";`;

const newAllchecked = `      donebtn.disabled = true;
      donebtn.classList.add("alldone-completed");
    } else {
      donebtn.textContent = "🎉 All Tasks Completed!";
      donebtn.disabled = false;
      donebtn.classList.remove("alldone-completed");`;

if (content.includes(oldAllchecked)) {
  content = content.replace(oldAllchecked, newAllchecked);
  console.log('✅ Fix 1 applied: allchecked() now uses CSS class');
} else {
  console.log('⚠️ Fix 1: Pattern not found. Checking encoding...');
  // Try with different line endings
  const oldCRLF = oldAllchecked.replace(/\n/g, '\r\n');
  if (content.includes(oldCRLF)) {
    content = content.replace(oldCRLF, newAllchecked.replace(/\n/g, '\r\n'));
    console.log('✅ Fix 1 applied (CRLF): allchecked() now uses CSS class');
  } else {
    console.log('❌ Fix 1 could not be applied. Dumping surrounding content...');
    const idx = content.indexOf('donebtn.style.opacity');
    if (idx >= 0) {
      console.log('Found donebtn.style.opacity at index', idx);
      console.log('Context:', JSON.stringify(content.substring(idx - 50, idx + 100)));
    } else {
      console.log('donebtn.style.opacity not found in file at all');
      // Check for UTF-16
      const buf = fs.readFileSync(filePath);
      console.log('First 4 bytes:', buf[0], buf[1], buf[2], buf[3]);
      console.log('File size:', buf.length, 'bytes');
    }
  }
}

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Done! File saved.');
