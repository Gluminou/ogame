// Assemble src/ into index.html: node tools/build.js
const fs = require('fs'); const path = require('path');
const root = path.join(__dirname, '..'); const src = f => fs.readFileSync(path.join(root, 'src', f), 'utf8');
let h = src('template.html');
h = h.replace('/*ENGINE*/', () => src('engine.js')).replace('/*COMBAT*/', () => src('combat.js')).replace('/*DATA*/', () => JSON.stringify(''));
h = h.replace('body{margin:0;', 'html{background:var(--bg)}body{margin:0;min-height:100vh;background-repeat:no-repeat;');
fs.writeFileSync(path.join(root, 'index.html'), h);
console.log('index.html construit (' + h.length + ' octets)');
