// Assemble src/ into index.html and stamp a new version: node tools/build.js
// Installed home-screen apps compare their version with version.json and reload themselves.
// The export bookmarklet is minified with terser (npm install) when available.
const fs = require('fs'); const path = require('path');
const root = path.join(__dirname, '..'); const src = f => fs.readFileSync(path.join(root, 'src', f), 'utf8');

(async () => {
  let bm = src('exporter.js');
  try { const { minify } = require('terser'); bm = (await minify(bm, { compress: true, mangle: true })).code; }
  catch (e) { console.warn('terser absent : favori non minifié'); bm = bm.split('\n').filter(l => !l.trim().startsWith('//')).join('\n'); }
  const bookmarklet = 'javascript:' + encodeURIComponent(bm);

  const d = new Date(); const p = n => String(n).padStart(2, '0');
  const V = `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}${p(d.getUTCHours())}${p(d.getUTCMinutes())}`;

  let h = src('template.html');
  h = h.replace('/*ENGINE*/', () => src('engine.js')).replace('/*COMBAT*/', () => src('combat.js'))
    .replace('/*DATA*/', () => JSON.stringify('')).replace('/*BOOKMARKLET*/', () => JSON.stringify(bookmarklet))
    .replace('/*VERSION*/', V);
  h = h.replace('body{margin:0;', 'html{background:var(--bg)}body{margin:0;min-height:100vh;background-repeat:no-repeat;');
  fs.writeFileSync(path.join(root, 'index.html'), h);
  // Keep the version number, date and notes written by tools/release.mjs; only the build stamp changes.
  let vj = {}; try { vj = JSON.parse(fs.readFileSync(path.join(root, 'version.json'), 'utf8')); } catch (e) {}
  fs.writeFileSync(path.join(root, 'version.json'), JSON.stringify({ ...vj, v: V }, null, 2) + '\n');
  console.log(`index.html construit (${h.length} octets), version ${V}, favori ${bookmarklet.length} caractères`);
})();
