const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, 'styles.css');
let css = fs.readFileSync(cssPath, 'utf8');

// 1. Fix the previously injected literal string '\\2713'
css = css.replace("content: '\\\\2713';", "content: '\\2713';");
css = css.replace('content: "\\\\2713";', "content: '\\2713';");

// 2. Fix Lock emoji (ðŸ”’) -> \\1F512
css = css.replace(/content:\s*['"]ðŸ”’['"];/g, "content: '\\1F512';");

// 3. Fix Glowing Star emoji (ðŸŒŸ) -> \\1F31F
css = css.replace(/content:\s*['"]ðŸŒŸ['"];/g, "content: '\\1F31F';");

// 4. Fix Triangular Flag emoji (ðŸš©) -> \\1F6A9
css = css.replace(/content:\s*['"]ðŸš©['"];/g, "content: '\\1F6A9';");

fs.writeFileSync(cssPath, css, 'utf8');
console.log('✅ Replaced all CSS encoding mojibakes with proper Unicode escapes!');
