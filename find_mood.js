const fs = window ? undefined : require('fs');
const content = fs.readFileSync('script.js', 'utf8');

const lines = content.split('\n');
let results = [];
for (let i = 0; i < lines.length; i++) {
    if (lines[i].toLowerCase().includes('mood')) {
        results.push(`${i+1}: ${lines[i].trim()}`);
    }
}
fs.writeFileSync('mood_search.txt', results.join('\n'));
console.log(`Found ${results.length} lines with 'mood'. Saved to mood_search.txt`);
