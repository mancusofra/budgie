/**
 * Serves the web build locally like GitHub Pages does (`npm run preview:web`):
 * under the base path, extensionless routes → .html, no cross-origin isolation
 * headers (the service worker adds them).
 *
 * Usage: node scripts/serve-web.js <dist dir> [base] [port]
 * Open http://localhost:8090/budgie/ (localhost counts as a secure origin).
 */
const fs = require('fs');
const http = require('http');
const path = require('path');

const dist = path.resolve(process.argv[2] ?? 'dist');
const base = (process.argv[3] ?? '/budgie').replace(/\/$/, '');
const port = Number(process.argv[4] ?? 8090);
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.wasm': 'application/wasm',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.svg': 'image/svg+xml',
};

http
  .createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]);
    if (!url.startsWith(base)) {
      res.writeHead(302, { Location: `${base}/` }).end();
      return;
    }
    let file = path.join(dist, url.slice(base.length));
    if (!file.startsWith(dist)) return res.writeHead(403).end();
    if (fs.existsSync(file) && fs.statSync(file).isDirectory())
      file = path.join(file, 'index.html');
    if (!fs.existsSync(file) && fs.existsSync(`${file}.html`)) file = `${file}.html`;
    if (!fs.existsSync(file)) {
      res.writeHead(404, { 'Content-Type': TYPES['.html'] });
      fs.createReadStream(path.join(dist, '404.html')).pipe(res);
      return;
    }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  })
  .listen(port, () => console.log(`Budgie web: http://localhost:${port}${base}/`));
