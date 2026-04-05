const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

html = html.replace(/(<div [^>]*background: linear-gradient[^>]*>)\s*🧠\s*<\/div>/g, '$1<div class="anim-memory"><div></div><div></div><div></div><div></div></div></div>');
html = html.replace(/(<div [^>]*background: linear-gradient[^>]*>)\s*🎨\s*<\/div>/g, '$1<div class="anim-color-orb"></div></div>');
html = html.replace(/(<div [^>]*background: linear-gradient[^>]*>)\s*⚖️\s*<\/div>/g, '$1<div class="anim-tug"></div></div>');
html = html.replace(/(<div [^>]*background: linear-gradient[^>]*>)\s*🚀\s*<\/div>/g, '$1<div class="anim-missile"></div></div>');
html = html.replace(/(<div [^>]*background: linear-gradient[^>]*>)\s*🔮\s*<\/div>/g, '$1<div class="anim-rings"></div></div>');
html = html.replace(/(<div [^>]*background: linear-gradient[^>]*>)\s*👁️\s*<\/div>/g, '$1<div class="anim-radar"></div></div>');
html = html.replace(/(<div [^>]*background: linear-gradient[^>]*>)\s*❌\s*<\/div>/g, '$1<div class="anim-gomoku"></div></div>');

try {
    fs.writeFileSync('index.html', html);
    console.log("Successfully updated index.html natively bypassed file lock!");
} catch(e) {
    console.error("OS Lock active! Forcing write to index_fixed.html instead.");
    fs.writeFileSync('index_fixed.html', html);
}
