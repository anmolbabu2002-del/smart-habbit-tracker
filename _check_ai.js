const fs = require('fs');
const path = require('path');

const filesToCheck = ['script.js', 'index.html', '_inject_ai_page.js', '_enhance_ai.js'];

filesToCheck.forEach(filename => {
  const filePath = path.join(__dirname, filename);
  if (!fs.existsSync(filePath)) return;
  
  let content = fs.readFileSync(filePath, 'utf-8');
  if (content.charCodeAt(0) === 0xFEFF) content = content.slice(1);
  
  // Look for AI related keywords
  const keywords = ['gemini', 'llama', 'model', 'fallback', 'fetch', 'anmol-ai', 'ai-chat'];
  let found = false;
  
  keywords.forEach(kw => {
    const idx = content.toLowerCase().indexOf(kw);
    if (idx !== -1) {
      if (!found) console.log(`\n--- Matches in ${filename} ---`);
      found = true;
      console.log(`Keyword '${kw}' found.`);
      
      // Print context
      const start = Math.max(0, idx - 100);
      const end = Math.min(content.length, idx + 200);
      console.log(content.substring(start, end));
      console.log('---');
    }
  });
});
