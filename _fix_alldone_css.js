// Add CSS for alldone-completed class
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'styles.css');
let content = fs.readFileSync(filePath, 'utf-8');

const cssToAdd = `
/* Daily completion limit — professional completed state */
#alldone.alldone-completed {
    background: linear-gradient(135deg, #43a047 0%, #2e7d32 100%);
    cursor: default;
    animation: none;
    opacity: 0.9;
    pointer-events: none;
    box-shadow: 0 2px 10px rgba(67, 160, 71, 0.3);
    position: relative;
    letter-spacing: 1px;
}

#alldone.alldone-completed::after {
    content: "Resets at midnight";
    display: block;
    font-size: 10px;
    font-weight: 400;
    text-transform: none;
    letter-spacing: 0.3px;
    opacity: 0.8;
    margin-top: 2px;
}

#alldone.alldone-completed:hover {
    transform: none;
    box-shadow: 0 2px 10px rgba(67, 160, 71, 0.3);
}
`;

// Insert after '#alldone:active {' block (after line with just "}")
const marker = '#alldone:active {';
const idx = content.indexOf(marker);
if (idx >= 0) {
  // Find the closing brace of #alldone:active
  const closingIdx = content.indexOf('}', idx + marker.length);
  if (closingIdx >= 0) {
    const insertPoint = closingIdx + 1;
    content = content.substring(0, insertPoint) + '\r\n' + cssToAdd + content.substring(insertPoint);
    console.log('✅ CSS for .alldone-completed added successfully');
  }
} else {
  // Fallback: append at end
  content += '\r\n' + cssToAdd;
  console.log('✅ CSS appended at end of file');
}

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Done!');
