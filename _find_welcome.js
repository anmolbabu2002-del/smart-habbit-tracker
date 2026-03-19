const fs = require('fs');

try {
  let content = fs.readFileSync('script.js', 'utf8');
  if (content.charCodeAt(0) === 0xFEFF) content = content.slice(1);

  const idx = content.indexOf('Yo! 👋🔥');
  if (idx !== -1) {
    const start = Math.max(0, idx - 500);
    const end = Math.min(content.length, idx + 500);
    console.log(content.substring(start, end));
  } else {
    // Check if it's in _enhance_ai.js
    const enhance = fs.readFileSync('_enhance_ai.js', 'utf8');
    const idx2 = enhance.indexOf('Yo! 👋🔥');
    if (idx2 !== -1) {
      console.log('Found in _enhance_ai.js');
    } else {
      console.log('Not found in script.js or _enhance_ai.js');
    }
  }
} catch(e) { console.error(e); }
