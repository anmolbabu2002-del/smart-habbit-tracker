const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'styles.css');
let content = fs.readFileSync(filePath, 'utf-8');
if (content.charCodeAt(0) === 0xFEFF) content = content.slice(1);

const searchStr = '.ai-chat-input-area';
const idx = content.indexOf(searchStr);

if (idx !== -1) {
  const start = Math.max(0, content.lastIndexOf('}', idx) + 1);
  const end = Math.min(content.length, content.indexOf('/*', idx + 100) > -1 ? content.indexOf('/*', idx + 100) : idx + 800);
  console.log(content.substring(start, end));
} else {
  console.log("Not found.");
}
