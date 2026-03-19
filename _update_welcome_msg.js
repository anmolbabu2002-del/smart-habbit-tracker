const fs = require('fs');

try {
  let scriptJs = fs.readFileSync('script.js', 'utf8');
  let isUTF16Script = false;
  
  if (scriptJs.charCodeAt(0) === 0xFEFF) {
    isUTF16Script = true;
    scriptJs = scriptJs.slice(1);
  }

  const oldWelcomeText = `Yo! 👋🔥 I'm <strong>Anmol AI</strong> — your personal productivity roast master & hype beast, made by the brilliant <strong>Anmol Jha</strong>.
        <br><br>I can see everything you're doing in this app 👀 — your tasks, streak, water, mood, meditation, ALL of it.
        <br><br>Ask me anything like <em>"How am I doing today?"</em> or <em>"Roast my productivity"</em> and I'll keep it real 💯`;

  const newWelcomeText = `Yo! 👋 I'm <strong>Anmol AI</strong> — your personal productivity roast master, hype beast, and highly capable AI assistant, made by the brilliant <strong>Anmol Jha</strong>.
        <br><br>I can roast your laziness, but I'm also here to solve complex tasks, write code, analyze data, or tackle creative challenges.
        <br><br>Ask me anything — whether it's <em>"Roast my productivity"</em> or <em>"Solve this complex coding problem"</em> — and I'll keep it real.`;

  if (scriptJs.includes(oldWelcomeText)) {
    scriptJs = scriptJs.replace(oldWelcomeText, newWelcomeText);
    fs.writeFileSync('script.js', (isUTF16Script ? '\\uFEFF' : '') + scriptJs, 'utf8');
    console.log('✅ script.js welcome message updated perfectly!');
  } else {
    // try exact regex if spaces differ
    console.log('⚠️ Could not find exact welcome message text in script.js (already updated?)');
  }

} catch(e) { console.error('Error updating script.js:', e.message); }
