const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'script.js');
let content = fs.readFileSync(filePath, 'utf-8');
if (content.charCodeAt(0) === 0xFEFF) content = content.slice(1);

const searchStr = 'function gatherAppContext';
const idx = content.indexOf(searchStr);

if (idx !== -1) {
  const end = content.indexOf('return context;', idx);
  console.log(content.substring(idx, end + 20));
} else {
  console.log("Not found.");
}
