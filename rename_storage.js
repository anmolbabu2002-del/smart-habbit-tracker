const fs = require('fs');
try {
  let content = fs.readFileSync('script.js', 'utf8');
  content = content.replace(/localStorage/g, 'appStorage');
  fs.writeFileSync('script.js', content, 'utf8');
  console.log('Successfully completed rename.');
} catch (e) {
  console.error('Error:', e);
}
