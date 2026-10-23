const path = require('path');
const { execSync } = require('child_process');

// Install sharp temporarily
execSync('npm install sharp', { cwd: __dirname, stdio: 'inherit' });

const sharp = require('sharp');

const srcFile = path.join(__dirname, 'ultradian_app_icon_1774120827802.png');

async function resize() {
    await sharp(srcFile).resize(192, 192).png().toFile(path.join(__dirname, 'icon-192.png'));
    console.log('Created icon-192.png (192x192)');
    
    await sharp(srcFile).resize(512, 512).png().toFile(path.join(__dirname, 'icon-512.png'));
    console.log('Created icon-512.png (512x512)');
    
    console.log('Done! Both icons created successfully.');
}

resize().catch(err => console.error('Error:', err));
