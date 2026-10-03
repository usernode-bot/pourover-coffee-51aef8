'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');
const { buildShell } = require('../scripts/build-shell');

const origin = 'https://pourover.example';
const workerSource = fs.readFileSync(path.join(__dirname, '../public/sw.js'), 'utf8');
function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pourover-shell-test-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  fs.cpSync(path.join(__dirname, '../public'), dir, { recursive: true,
    filter: (name) => !name.includes(`${path.sep}build`) });
  // The CSS compiler is tested by npm run build; this fixture only needs
  // deterministic bytes to verify all referenced assets are fingerprinted.
  fs.writeFileSync(path.join(dir, 'tailwind.css'), '/* fixture css */');
  return dir;
}
function filesFor(dir, manifest) {
  return new Map([
    ...Object.keys(manifest.assets).map((url) => [url,
      fs.readFileSync(path.join(dir, url === '/index.html' ? 'build/index.html' : url.slice(1)))]),
    ...manifest.platformAssets.map((url) => [url, Buffer.from(`hosted ${url}`)]),
  ]);
}
function cacheStorage() {
  const stores = new Map();
  const key = (request) => new URL(typeof request === 'string' ? request : request.url, origin).href;
  return {
    stores,
    async keys() { return [...stores.keys()]; },
    async delete(name) { return stores.delete(name); },
    async open(name) {
      if (!stores.has(name)) stores.set(name, new Map());
      const entries = stores.get(name);
      return {
        async put(request, response) { entries.set(key(request), response.clone()); },
        async match(request) { return entries.get(key(request))?.clone(); },
      };
    },
    async match(request) {
      for (const entries of stores.values()) {
        const found = entries.get(key(request));
        if (found) return found.clone();
      }
    },
  };
}
function worker(manifest, files, caches = cacheStorage()) {
  const handlers = {};
  const calls = [];
  let offline = false;
  let activated = false;
  let claimed = false;
  const fetch = async (request) => {
    const url = new URL(typeof request === 'string' ? request : request.url, origin);
    calls.push(url.pathname);
    if (offline) throw new Error('offline');
    return files.has(url.pathname) ? new Response(files.get(url.pathname)) : new Response('missing', { status: 404 });
  };
  vm.runInNewContext(workerSource, {
    self: { POUROVER_SHELL: manifest, location: { origin },
      addEventListener: (name, fn) => { handlers[name] = fn; },
      skipWaiting: async () => { activated = true; },
      clients: { claim: async () => { claimed = true; } },
    }, caches, fetch, crypto: webcrypto, URL, Uint8Array,
  });
  async function lifecycle(name) {
    let pending;
    handlers[name]({ waitUntil(promise) { pending = promise; } });
    await pending;
  }
  return {
    caches, calls, lifecycle,
    setOffline(value) { offline = value; },
    activated: () => activated, claimed: () => claimed,
    async request(url, { mode = 'cors', method = 'GET' } = {}) {
      let pending;
      handlers.fetch({ request: { url: new URL(url, origin).href, mode, method },
        respondWith(promise) { pending = promise; } });
      return pending ? { handled: true, response: await pending } : { handled: false };
    },
  };
}

test('build fingerprints every local script/style and changes the worker for every shell change', (t) => {
  const dir = fixture(t);
  const first = buildShell(dir);
  const html = fs.readFileSync(path.join(dir, 'build/index.html'), 'utf8');
  assert.match(html, /src="\/usernode-bridge\/v1\/bridge.js"/);
  assert.match(html, /src="\/usernode-native\/v1\/native.js"/);
  assert.match(html, /href="\/usernode-native\/v1\/native.css"/);
  assert.doesNotMatch(html, /(?:src|href)="\/(?:app|recipes|active-brew|offline|brew-cues|glossary|adjustments|tailwind)\.(?:js|css)"/);
  for (const file of ['/app.js', '/active-brew.js', '/offline.js', '/brew-cues.js', '/tailwind.css']) {
    assert.ok(first.assets[first.aliases[file]], file);
  }
  assert.equal(buildShell(dir).release, first.release, 'repeat build is deterministic');
  fs.appendFileSync(path.join(dir, 'app.js'), '\n// next release\n');
  const second = buildShell(dir);
  assert.notEqual(second.release, first.release);
  assert.notEqual(second.aliases['/app.js'], first.aliases['/app.js']);
  assert.equal(second.aliases['/recipes.js'], first.aliases['/recipes.js']);
  fs.appendFileSync(path.join(dir, 'sw.js'), '\n// worker change\n');
  assert.notEqual(buildShell(dir).release, second.release, 'worker-only updates install too');
});

test('a complete verified shell works offline and never independently refreshes assets', async (t) => {
  const dir = fixture(t), manifest = buildShell(dir), files = filesFor(dir, manifest);
  const w = worker(manifest, files);
  await w.lifecycle('install'); await w.lifecycle('activate');
  assert.equal(w.activated(), true); assert.equal(w.claimed(), true);
  const requests = w.calls.length;
  // Even online, changed network bytes cannot silently replace one file.
  files.set(manifest.aliases['/app.js'], Buffer.from('wrong next-release script'));
  assert.equal(await (await w.request('/app.js')).response.text(),
    fs.readFileSync(path.join(dir, 'app.js'), 'utf8'));
  assert.equal(w.calls.length, requests);
  w.setOffline(true);
  const doc = await w.request('/?recipe=v60-bright&token=not-stored', { mode: 'navigate' });
  assert.equal(await doc.response.text(), fs.readFileSync(path.join(dir, 'build/index.html'), 'utf8'));
  for (const url of Object.keys(manifest.assets)) assert.equal((await w.request(url)).response.ok, true, url);
  assert.equal(w.calls.length, requests);
  assert.equal((await w.request('/missing.js')).handled, false, 'no HTML fallback for scripts');
  assert.equal((await w.request('/api/personal-recipes')).handled, false);
  assert.equal((await w.request('/api/journal', { method: 'POST' })).handled, false);
  assert.equal(await (await w.request('/usernode-bridge/v1/bridge.js')).response.text(),
    'hosted /usernode-bridge/v1/bridge.js', 'offline bridge retains its central path');
});

test('failed and mismatched installs preserve the previous shell without activating a partial one', async (t) => {
  const dir = fixture(t), first = buildShell(dir), caches = cacheStorage();
  const old = worker(first, filesFor(dir, first), caches);
  await old.lifecycle('install'); await old.lifecycle('activate');
  fs.appendFileSync(path.join(dir, 'app.js'), '\n// new release\n');
  const second = buildShell(dir);
  for (const corrupt of ['missing', 'wrong-content']) {
    const files = filesFor(dir, second);
    const asset = second.aliases['/active-brew.js'];
    if (corrupt === 'missing') files.delete(asset);
    else files.set(asset, Buffer.from('different release'));
    const update = worker(second, files, caches);
    await assert.rejects(update.lifecycle('install'), /Shell asset/);
    assert.equal(update.activated(), false);
    assert.deepEqual(await caches.keys(), [`pourover-coffee-shell-v3-${first.release}`, 'pourover-coffee-platform-v1']);
    old.setOffline(true);
    assert.equal((await old.request('/app.js')).response.ok, true);
  }
});

test('updates retain previous fingerprinted assets while removing legacy mixed caches', async (t) => {
  const dir = fixture(t), first = buildShell(dir), caches = cacheStorage();
  const oldFiles = filesFor(dir, first), old = worker(first, oldFiles, caches);
  await old.lifecycle('install'); await old.lifecycle('activate');
  await caches.open('pourover-coffee-shell-v2');
  await caches.open('pourover-coffee-shell-v2-data');
  await caches.open('unrelated-cache');
  fs.appendFileSync(path.join(dir, 'app.js'), '\n// new release\n');
  const second = buildShell(dir), update = worker(second, filesFor(dir, second), caches);
  await update.lifecycle('install'); await update.lifecycle('activate');
  update.setOffline(true);
  assert.equal(await (await update.request(first.aliases['/app.js'])).response.text(), oldFiles.get(first.aliases['/app.js']).toString());
  assert.equal(await (await update.request('/app.js')).response.text(), fs.readFileSync(path.join(dir, 'app.js'), 'utf8'));
  const names = await caches.keys();
  assert.ok(names.includes('unrelated-cache'));
  assert.ok(names.includes(`pourover-coffee-shell-v3-${first.release}`));
  assert.ok(names.includes(`pourover-coffee-shell-v3-${second.release}`));
  assert.ok(!names.includes('pourover-coffee-shell-v2'));
  assert.ok(!names.includes('pourover-coffee-shell-v2-data'));
});
