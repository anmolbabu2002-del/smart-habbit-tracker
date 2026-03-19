const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'script.js');
let content = fs.readFileSync(filePath, 'utf-8');
if (content.charCodeAt(0) === 0xFEFF) content = content.slice(1);

const searchStr = 'ata.reply || "Hmm... I got nothing';
const idx = content.indexOf(searchStr);

if (idx !== -1) {
  const start = Math.max(0, idx - 1500);
  const end = Math.min(content.length, idx + 1000);
  console.log(content.substring(start, end));
} else {
  console.log("Not found.");
}
