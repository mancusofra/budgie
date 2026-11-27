/**
 * After `expo export --platform web` (see `npm run build:web`):
 *
 * 1. adds to every page the PWA tags (manifest, icons, theme color) and the
 *    script that registers the service worker; where the server doesn't send
 *    the cross-origin isolation headers SQLite needs (GitHub Pages) the page
 *    reloads once, as soon as the service worker controls it and adds them;
 * 2. lists every file of the build in precache.json for the service worker
 *    (offline cache), with a version derived from the contents.
 *
 * Usage: node scripts/web-postbuild.js <dist dir> [base url, e.g. /budgie]
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const dist = path.resolve(process.argv[2] ?? 'dist');
const base = (process.argv[3] ?? process.env.EXPO_BASE_URL ?? '').replace(/\/$/, '');

const files = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else files.push(path.relative(dist, full).split(path.sep).join('/'));
  }
})(dist);

// Startup diagnostics: errors from the very first script, and a report on screen
// if the app hasn't started after 12 s (no console on iPhone without a Mac)
const buildStamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
const diagnostics = `(function () {
  var errors = [];
  window.addEventListener('error', function (e) { errors.push(String(e.message || e)); });
  window.addEventListener('unhandledrejection', function (e) {
    var r = e.reason; errors.push('Promise: ' + String((r && (r.stack || r.message)) || r));
  });
  setTimeout(function () {
    if (window.__budgieBoot === 'ready') return;
    var sw = navigator.serviceWorker;
    var info = [
      'Budgie non si è avviato / did not start',
      'build: ${buildStamp} UTC',
      'step: ' + (window.__budgieBoot || 'app code not started'),
      'crossOriginIsolated: ' + window.crossOriginIsolated,
      'SharedArrayBuffer: ' + (typeof SharedArrayBuffer),
      'service worker: ' + (sw ? (sw.controller ? 'controlling' : 'not controlling') : 'unsupported'),
      'coi reload flag: ' + sessionStorage.getItem('budgie-coi-reload'),
      'url: ' + location.href,
      'ua: ' + navigator.userAgent,
      'errors: ' + (errors.length ? errors.join(' | ') : 'none')
    ].join(String.fromCharCode(10));
    var box = document.createElement('pre');
    box.textContent = info;
    box.style.cssText = 'position:fixed;inset:12px;z-index:99999;margin:0;padding:16px;overflow:auto;' +
      'white-space:pre-wrap;word-break:break-word;font:12px/1.5 ui-monospace,monospace;' +
      'background:#1C1C1E;color:#F2F2F4;border-radius:14px';
    var reload = document.createElement('button');
    reload.textContent = 'Ricarica / Reload';
    reload.style.cssText = 'display:block;margin-top:16px;padding:10px 16px;font:600 15px system-ui;' +
      'border:0;border-radius:10px;background:#8FA2F0;color:#0E0E10';
    reload.onclick = function () { sessionStorage.clear(); location.reload(); };
    box.appendChild(reload);
    document.body.appendChild(box);
  }, 12000);
})();`;

const bootstrap = `(function () {
  if (!('serviceWorker' in navigator)) return;
  if (window.crossOriginIsolated) sessionStorage.removeItem('budgie-coi-reload');
  var base = ${JSON.stringify(base + '/')};
  navigator.serviceWorker.register(base + 'sw.js', { scope: base }).then(function () {
    if (window.crossOriginIsolated || sessionStorage.getItem('budgie-coi-reload')) return;
    function reload() { sessionStorage.setItem('budgie-coi-reload', '1'); location.reload(); }
    if (navigator.serviceWorker.controller) reload();
    else navigator.serviceWorker.addEventListener('controllerchange', reload);
  });
})();`;

const tags = [
  '<meta name="theme-color" content="#3E58C5"/>',
  '<meta name="description" content="Budgie: expense tracker, your data stays on your device."/>',
  `<link rel="manifest" href="${base}/manifest.webmanifest"/>`,
  `<link rel="apple-touch-icon" href="${base}/icons/apple-touch-icon.png"/>`,
  '<meta name="apple-mobile-web-app-capable" content="yes"/>',
  '<meta name="mobile-web-app-capable" content="yes"/>',
  '<meta name="apple-mobile-web-app-title" content="Budgie"/>',
  `<script>${diagnostics}</script>`,
  `<script>${bootstrap}</script>`,
].join('');

let pages = 0;
for (const f of files.filter((f) => f.endsWith('.html'))) {
  const file = path.join(dist, f);
  let html = fs.readFileSync(file, 'utf8');
  if (html.includes('rel="manifest"')) continue;
  // Notch and home indicator: content can use the whole screen when installed
  html = html.replace('initial-scale=1, shrink-to-fit=no', 'initial-scale=1, viewport-fit=cover');
  html = html.replace('</head>', `${tags}</head>`);
  fs.writeFileSync(file, html);
  pages++;
}

// GitHub Pages serves 404.html for unknown paths: Expo's not-found page
if (files.includes('+not-found.html') && !files.includes('404.html')) {
  fs.copyFileSync(path.join(dist, '+not-found.html'), path.join(dist, '404.html'));
  files.push('404.html');
}
// No Jekyll on GitHub Pages: it would skip the "_expo" folder
fs.writeFileSync(path.join(dist, '.nojekyll'), '');

const precache = files.filter((f) => f !== 'precache.json' && f !== 'sw.js').sort();
const hash = crypto.createHash('sha256');
for (const f of precache) hash.update(f).update(fs.readFileSync(path.join(dist, f)));
const version = hash.digest('hex').slice(0, 12);
fs.writeFileSync(path.join(dist, 'precache.json'), JSON.stringify({ version, files: precache }));
// The browser checks sw.js for changes: the version inside it marks a new build
const sw = path.join(dist, 'sw.js');
fs.writeFileSync(
  sw,
  fs
    .readFileSync(sw, 'utf8')
    .replace(/__BUILD_VERSION__|budgie-build-[0-9a-f]+/, `budgie-build-${version}`),
);

console.log(
  `web-postbuild: ${pages} pages tagged, ${precache.length} files to precache, version ${version}`,
);
