/*
 * Budgie service worker (web version).
 *
 * 1. Cross-origin isolation: SQLite on the web needs SharedArrayBuffer, so every
 *    response gets COOP/COEP headers (GitHub Pages can't set them itself).
 * 2. Offline: on install it caches every file of the build (listed in
 *    precache.json by scripts/web-postbuild.js); then it serves from the cache.
 * 3. Updates: a new build installs in the background and waits; the app shows
 *    "New version available" and sends SKIP_WAITING when the user taps Update.
 */
const BASE = new URL('./', self.registration.scope).pathname;
// Written by scripts/web-postbuild.js: a different value = a new version to install
const VERSION = '__BUILD_VERSION__';

async function precacheList() {
  const res = await fetch(BASE + 'precache.json', { cache: 'no-store' });
  return res.json(); // { version, files: [...] }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const { files } = await precacheList();
      const cache = await caches.open('budgie-' + VERSION);
      await cache.addAll(files.map((f) => BASE + f));
      // First install: take control right away (no older version to wait for)
      if (!self.registration.active) await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) {
        if (key.startsWith('budgie-') && key !== 'budgie-' + VERSION) {
          await caches.delete(key);
        }
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

/** Same response with the cross-origin isolation headers. */
function isolate(response) {
  if (!response || response.status === 0 || response.type === 'opaque') return response;
  const headers = new Headers(response.headers);
  headers.set('Cross-Origin-Embedder-Policy', 'credentialless');
  headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.endsWith('/precache.json')) return;

  event.respondWith(
    (async () => {
      const cached =
        (await caches.match(request, { ignoreSearch: true })) ??
        // Pages: /budgie/stats → stats.html; unknown routes → the app shell
        (request.mode === 'navigate'
          ? ((await caches.match(url.pathname.replace(/\/$/, '') + '.html')) ??
            (await caches.match(BASE + 'index.html')))
          : undefined);
      if (cached) return isolate(cached);
      try {
        return isolate(await fetch(request));
      } catch (error) {
        if (request.mode === 'navigate') {
          const shell = await caches.match(BASE + 'index.html');
          if (shell) return isolate(shell);
        }
        throw error;
      }
    })(),
  );
});
