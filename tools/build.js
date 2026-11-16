// Assemble src/ into index.html and stamp a new version: node tools/build.js
// Installed home-screen apps compare their version with version.json and reload themselves.
const fs = require('fs'); const path = require('path');
const root = path.join(__dirname, '..'); const src = f => fs.readFileSync(path.join(root, 'src', f), 'utf8');
let h = src('template.html');
h = h.replace('/*ENGINE*/', () => src('engine.js')).replace('/*COMBAT*/', () => src('combat.js')).replace('/*DATA*/', () => JSON.stringify(''));
h = h.replace('body{margin:0;', 'html{background:var(--bg)}body{margin:0;min-height:100vh;background-repeat:no-repeat;');
const d = new Date(); const p = n => String(n).padStart(2, '0');
const V = `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}${p(d.getUTCHours())}${p(d.getUTCMinutes())}`;
h = h.replace('/*VERSION*/', V);
fs.writeFileSync(path.join(root, 'index.html'), h);
fs.writeFileSync(path.join(root, 'version.json'), JSON.stringify({ v: V }) + '\n');
console.log('index.html construit (' + h.length + ' octets), version ' + V);
