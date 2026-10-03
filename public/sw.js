// Build supplies an exact shell manifest, including content fingerprints.
'use strict';

const SHELL = self.POUROVER_SHELL;
const CACHE_NAME = `pourover-coffee-shell-v3-${SHELL.release}`;
const PLATFORM_CACHE = 'pourover-coffee-platform-v1';

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    // Verify every response before writing or activating anything. A failed
    // request or deployment changing mid-install leaves the old worker intact.
    const responses = await Promise.all(Object.entries(SHELL.assets).map(async ([url, hash]) => {
      const response = await fetch(url, { cache: 'reload' });
      if (!response.ok) throw new Error(`Shell asset unavailable: ${url}`);
      const bytes = await response.clone().arrayBuffer();
      const actual = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))]
        .map((byte) => byte.toString(16).padStart(2, '0')).join('');
      if (actual !== hash) throw new Error(`Shell asset changed during install: ${url}`);
      return [url, response];
    }));
    const cache = await caches.open(CACHE_NAME);
    try {
      await Promise.all(responses.map(([url, response]) => cache.put(url, response)));
    } catch (error) {
      await caches.delete(CACHE_NAME);
      throw error;
    }
    // These centrally hosted files have their own release cycle. Seed their
    // separate fallback cache so the bridge can announce an offline launch.
    const platformCache = await caches.open(PLATFORM_CACHE);
    await Promise.allSettled(SHELL.platformAssets.map(async (url) => {
      const response = await fetch(url, { cache: 'reload' });
      if (response.ok) await platformCache.put(url, response);
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    // Only remove our superseded shell/data caches, never another owner's.
    const previous = names.filter((name) => name.startsWith('pourover-coffee-shell-v3-')
      && name !== CACHE_NAME).at(-1);
    await Promise.all(names.filter((name) => name.startsWith('pourover-coffee-shell-')
      && name !== CACHE_NAME && name !== previous).map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  // Private API requests always reach the network. The app's durable queue
  // handles writes; a worker must not replay another account's cached reads.
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  const document = request.mode === 'navigate' || url.pathname === '/' || url.pathname === '/index.html';
  const asset = SHELL.aliases[url.pathname] || url.pathname;
  if (document || Object.hasOwn(SHELL.assets, asset)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(document ? '/index.html' : asset);
      // This cache is immutable once installed: do not refresh individual
      // files. The next complete release is installed by the next worker.
      return cached || fetch(request);
    })());
    return;
  }

  // A document from the previous release may still be loading when this
  // worker takes control. Its fingerprinted URLs retain their exact bytes.
  if (/^\/build\/assets\/[0-9a-f]{64}\./.test(url.pathname)) {
    event.respondWith((async () => (await caches.match(url.pathname)) || fetch(request))());
    return;
  }

  // Hosted platform infrastructure stays on its central paths. Revalidate
  // online, retaining a copy only for a previously visited offline device.
  if (/^\/usernode-(?:bridge|native|tailwind)\//.test(url.pathname)) {
    event.respondWith((async () => {
      const cache = await caches.open(PLATFORM_CACHE);
      try {
        const response = await fetch(request);
        if (response.ok) await cache.put(request, response.clone());
        return response;
      } catch (error) {
        const cached = await cache.match(request);
        if (cached) return cached;
        throw error;
      }
    })());
  }
  // Unknown assets go to the network. Never return HTML as JavaScript/CSS.
});
