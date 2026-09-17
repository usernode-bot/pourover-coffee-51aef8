// Pourover Coffee service worker: caches the app shell and original recipes so
// a previously visited device can open the app and brew in airplane mode.
'use strict';

const CACHE_NAME = 'pourover-coffee-shell-v1';
const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/app.css',
  '/app.js',
  '/recipes.js',
  '/glossary.js',
  '/adjustments.js',
  '/tailwind.css',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // Cache the shell asset-by-asset: a single failure should not abort the
    // whole install, and the fetch cache layer covers anything missing here.
    await Promise.allSettled(SHELL_ASSETS.map((asset) => cache.add(asset)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // API reads use a revalidating cache and API writes never touch the worker.
  if (url.pathname.startsWith('/api/')) {
    event.respondWith((async () => {
      const cache = await caches.open(`${CACHE_NAME}-data`);
      try {
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      } catch (error) {
        const cached = await cache.match(request);
        if (cached) return cached;
        throw error;
      }
    })());
    return;
  }

  // Same-origin app assets: cache-first so offline loads never reach the
  // network, but refresh the copy in the background when the network is up.
  if (url.origin === self.location.origin) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request, { ignoreSearch: true });
      if (cached) {
        fetch(request).then((response) => {
          if (response.ok) cache.put(request, response.clone());
        }).catch(() => {});
        return cached;
      }
      try {
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      } catch (error) {
        const shell = await cache.match('/index.html');
        if (shell) return shell;
        throw error;
      }
    })());
  }
});
