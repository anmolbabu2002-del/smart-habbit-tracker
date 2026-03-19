const fs = require('fs');

try {
  let scriptJs = fs.readFileSync('script.js', 'utf8');
  let isUTF16Script = false;
  
  if (scriptJs.charCodeAt(0) === 0xFEFF) {
    isUTF16Script = true;
    scriptJs = scriptJs.slice(1);
  }

  // The Exact string we are looking for inside those template literals
  const oldWelcomeAvatar = '<div class="ai-msg-avatar">🤖</div>';
  const newWelcomeAvatar = '<div class="ai-msg-avatar" style="padding:0; overflow:hidden;"><img src="anmol-ai-avatar.jpeg" style="width:100%; height:100%; object-fit:cover;"></div>';

  if (scriptJs.includes(oldWelcomeAvatar)) {
    scriptJs = scriptJs.split(oldWelcomeAvatar).join(newWelcomeAvatar);
    
    fs.writeFileSync('script.js', (isUTF16Script ? '\\uFEFF' : '') + scriptJs, 'utf8');
    console.log('✅ Updated script.js to replace the innerHTML welcome message robot avatar.');
  } else {
    console.log('⚠️ Could not find the exact avatar string inside script.js template literals.');
  }

} catch (e) {
  console.log('Error updating script.js:', e.message);
}
