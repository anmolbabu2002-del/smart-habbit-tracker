const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, 'styles.css');
let css = fs.readFileSync(cssPath, 'utf8');

const oldStr = "content: 'âœ“';";
const newStr = "content: '\\\\2713';";

if (css.includes("content: 'âœ“';")) {
    css = css.replace("content: 'âœ“';", "content: '\\\\2713';");
    fs.writeFileSync(cssPath, css, 'utf8');
    console.log('✅ Fixed checkmark encoding in styles.css');
} else if (css.includes('content: "âœ“";')) {
    css = css.replace('content: "âœ“";', "content: '\\\\2713';");
    fs.writeFileSync(cssPath, css, 'utf8');
    console.log('✅ Fixed checkmark encoding in styles.css (double quotes)');
} else {
    // Try regex
    const regex = /content:\s*['"]âœ“['"];/g;
    if (regex.test(css)) {
        css = css.replace(regex, "content: '\\2713';");
        fs.writeFileSync(cssPath, css, 'utf8');
        console.log('✅ Fixed checkmark encoding in styles.css (regex)');
    } else {
        console.log('❌ Could not find the corrupted checkmark in styles.css.');
    }
}
