const fs = require('fs');
const path = require('path');

let html = fs.readFileSync('index.html', 'utf8');

// Replace local CSS links
html = html.replace(/<link[^>]+href=["']([^"']+\.css)(\?[^"']*)?["'][^>]*>/gi, (match, src) => {
    if (src.startsWith('http') || src.startsWith('//')) return match;
    try {
        const cssPath = path.resolve(process.cwd(), src);
        const cssContent = fs.readFileSync(cssPath, 'utf8');
        console.log('Inlined CSS:', src);
        return '<style>\n' + cssContent + '\n</style>';
    } catch (e) {
        console.error('Failed to inline CSS:', src, e.message);
        return match;
    }
});

// Replace local JS scripts
html = html.replace(/<script[^>]+src=["']([^"']+\.js)(\?[^"']*)?["'][^>]*><\/script>/gi, (match, src) => {
    if (src.startsWith('http') || src.startsWith('//')) return match;
    try {
        const jsPath = path.resolve(process.cwd(), src);
        const jsContent = fs.readFileSync(jsPath, 'utf8');
        console.log('Inlined JS:', src);
        return '<script>\n' + jsContent + '\n</script>';
    } catch (e) {
        console.error('Failed to inline JS:', src, e.message);
        return match;
    }
});

fs.writeFileSync('books.html', html);
console.log('Successfully created books.html');
