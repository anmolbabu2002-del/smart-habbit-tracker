const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'styles.css');
let content = fs.readFileSync(filePath, 'utf-8');
if (content.charCodeAt(0) === 0xFEFF) content = content.slice(1);

const searchTerms = ['.ai-chat-container', '.ai-chat-input-area', '@media', '#anmol-ai-page'];

searchTerms.forEach(term => {
  const indices = [];
  let i = -1;
  while ((i = content.indexOf(term, i + 1)) !== -1) {
    indices.push(i);
  }
  
  if (indices.length > 0) {
    console.log(`\n=== Found ${term} ===`);
    // print the first occurrence
    const start = Math.max(0, indices[0] - 50);
    const end = Math.min(content.length, indices[0] + 500);
    console.log(content.substring(start, end));
  }
});
