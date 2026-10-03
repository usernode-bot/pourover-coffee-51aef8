const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const recipes = require('../public/recipes.js');
const { createStore, ownerFromToken, elapsedSeconds, STORAGE_PREFIX, MAX_AGE_MS } = require('../public/active-brew.js');

const root = path.resolve(__dirname, '..');
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');
const START = 1_800_000_000_000;
const tokenFor = (id) => `header.${Buffer.from(JSON.stringify({ id })).toString('base64url')}.signature`;
function storage() {
  const values = new Map();
  return {
    values,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}
function runningTimer(overrides = {}) {
  return { started: true, completed: false, running: true, elapsed: 0, anchorElapsed: 0, anchorTime: START, ...overrides };
}

test('a recreated store advances a running brew by wall time and restores its exact dose and revision', () => {
  const device = storage();
  const recipe = recipes.getRecipeRevision('v60-bright@1');
  createStore('6', { storage: device, now: () => START }).save(recipe, 23, runningTimer());
  const saved = createStore('6', { storage: device, now: () => START + 90_000 }).read();
  assert.equal(saved.recipe.revisionId, recipe.revisionId);
  assert.equal(saved.coffee, 23);
  assert.equal(saved.timer.elapsed, 90);
  assert.equal(saved.timer.running, true);
  assert.equal(elapsedSeconds(saved.timer, START + 110_000), 110);
});

test('a paused brew stays paused and account namespaces stay separate', () => {
  const device = storage();
  const store = createStore('6', { storage: device, now: () => START });
  store.save(recipes.RECIPES[0], 18, runningTimer({ running: false, elapsed: 47 }));
  const saved = createStore('6', { storage: device, now: () => START + 120_000 }).read();
  assert.equal(saved.timer.elapsed, 47);
  assert.equal(saved.timer.running, false);
  assert.equal(createStore('7', { storage: device }).read(), null);
  createStore(null, { storage: device }).clear();
  assert.ok(device.values.has(`${STORAGE_PREFIX}6`));
});

test('a saved personal revision restores its scaled instructions without an API', () => {
  const device = storage();
  const id = 'personal-00000000-0000-4000-8000-000000000013';
  const recipe = { ...recipes.RECIPES[0], id, revisionId: `${id}@3`, version: 3, isPersonal: true, title: 'My private cup' };
  createStore('6', { storage: device, now: () => START }).save(recipe, 22, runningTimer());
  const saved = createStore('6', { storage: device, now: () => START + 60_000 }).read();
  assert.equal(saved.recipe.revisionId, `${id}@3`);
  assert.deepEqual(recipes.scaleRecipe(saved.recipe, saved.coffee).steps, recipes.scaleRecipe(recipe, 22).steps);
});

test('brews that finish during suspension restore completion once and clear the record', () => {
  const device = storage();
  createStore('6', { storage: device, now: () => START }).save(recipes.RECIPES[0], 15, runningTimer());
  const store = createStore('6', { storage: device, now: () => START + 600_000 });
  const saved = store.read();
  assert.equal(saved.timer.completed, true);
  assert.equal(saved.timer.running, false);
  assert.equal(saved.timer.elapsed, recipes.scaleRecipe(recipes.RECIPES[0], 15).totalDuration);
  assert.equal(store.read(), null);
});

test('reset, completion, invalid data and expired records cannot resurrect a brew', () => {
  const device = storage();
  const store = createStore('6', { storage: device, now: () => START });
  const key = `${STORAGE_PREFIX}6`;
  const save = () => store.save(recipes.RECIPES[0], 15, runningTimer());
  save(); store.clear(); assert.equal(store.read(), null);
  save(); store.save(recipes.RECIPES[0], 15, runningTimer({ completed: true })); assert.equal(store.read(), null);
  for (const raw of ['{', 'null', JSON.stringify({ version: 2 }), 'x'.repeat(32_769)]) {
    device.setItem(key, raw);
    assert.equal(store.read(), null);
    assert.equal(device.getItem(key), null);
  }
  for (const change of [
    (record) => { record.elapsedAtAnchor = -1; },
    (record) => { record.anchorTimestamp = START + 1; },
    (record) => { record.recipe.steps[0].duration = '45'; },
    (record) => { record.recipe.tags.roast = null; },
    (record) => { record.recipe.revisionId = 'v60-bright@999'; },
  ]) {
    save(); const record = JSON.parse(device.getItem(key)); change(record);
    device.setItem(key, JSON.stringify(record));
    assert.equal(store.read(), null);
  }
  save();
  assert.equal(createStore('6', { storage: device, now: () => START + MAX_AGE_MS + 1 }).read(), null);
});

test('denied storage and missing identity leave the current timer usable', () => {
  const denied = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); }, removeItem() { throw new Error('denied'); } };
  const store = createStore('6', { storage: denied, now: () => START });
  assert.equal(store.save(recipes.RECIPES[0], 15, runningTimer()), false);
  assert.equal(store.read(), null);
  assert.doesNotThrow(() => store.clear());
  assert.equal(elapsedSeconds(runningTimer(), START + 60_000), 60);
  assert.equal(createStore(null, { storage: storage() }).save(recipes.RECIPES[0], 15, runningTimer()), false);
  assert.equal(ownerFromToken(tokenFor(6)), '6');
  for (const token of ['', 'bad', tokenFor(null), tokenFor(-1), tokenFor('6')]) assert.equal(ownerFromToken(token), null);
});

// Exercise the real app, markup and event handlers in a new DOM each time.
// Advancing the clock with no callbacks models a suspended/recreated document;
// it does not claim to reproduce any particular phone's lifecycle trigger.
async function app({ device = storage(), at = START, route = '/', user = 6, pendingNetwork = false, personalRecipes = [] } = {}) {
  let now = at;
  const separator = route.includes('?') ? '&' : '?';
  const dom = new JSDOM(read('public/index.html'), {
    url: `https://pourover.example${route}${user === null ? '' : `${separator}token=${tokenFor(user)}`}`,
    runScripts: 'outside-only',
    pretendToBeVisual: true,
  });
  const win = dom.window;
  Object.defineProperty(win, 'localStorage', { value: device });
  win.Date.now = () => now;
  win.scrollTo = () => {};
  win.confirm = () => true;
  win.fetch = async (url) => {
    if (pendingNetwork) return new Promise(() => {});
    const body = url.startsWith('/api/personal-recipes')
      ? { recipes: personalRecipes }
      : { favorites: [], collections: [], recentlyBrewed: [], entries: [] };
    return { ok: true, status: 200, json: async () => body };
  };
  for (const name of ['recipes', 'glossary', 'adjustments', 'brew-cues', 'offline', 'active-brew', 'app']) win.eval(read(`public/${name}.js`));
  await new Promise(setImmediate);
  const el = (id) => win.document.getElementById(id);
  return {
    win, device, el,
    advance(seconds) { now += seconds * 1000; },
    click(id) { el(id).click(); },
    close() { win.close(); },
  };
}
function start(h, dose = 23) {
  h.el('coffee-dose').value = dose;
  h.el('coffee-dose').dispatchEvent(new h.win.Event('change'));
  h.click('start-brew-button');
  h.click('timer-toggle');
}

test('real app restores a running brew at its root before any network response', async () => {
  const first = await app({ route: '/?recipe=v60-bright' });
  start(first);
  const device = first.device;
  assert.ok(device.getItem(`${STORAGE_PREFIX}6`), 'start persists synchronously');
  first.close(); // No unload/pagehide callback is needed for durability.
  const reopened = await app({ device, at: START + 90_000, pendingNetwork: true });
  assert.equal(reopened.el('brew-screen').hidden, false);
  assert.equal(reopened.el('timer-clock').textContent, '1:30');
  assert.match(reopened.el('brew-dose').textContent, /^23g coffee/);
  assert.equal(reopened.el('timer-panel').dataset.timerState, 'running');
  assert.match(reopened.win.location.search, /brew=v60-bright%401/);
  reopened.close();
});

test('real app preserves pause and resume, persists step seeks and clears reset and exit', async () => {
  const first = await app({ route: '/?recipe=v60-bright' });
  start(first); first.advance(47); first.click('timer-toggle');
  const device = first.device; first.close();
  const reopened = await app({ device, at: START + 120_000 });
  assert.equal(reopened.el('timer-clock').textContent, '0:47');
  assert.equal(reopened.el('timer-panel').dataset.timerState, 'paused');
  reopened.click('timer-toggle'); reopened.advance(13);
  reopened.win.dispatchEvent(new reopened.win.Event('pageshow'));
  assert.equal(reopened.el('timer-clock').textContent, '1:00');
  reopened.click('next-step');
  const elapsed = JSON.parse(device.getItem(`${STORAGE_PREFIX}6`)).elapsedAtAnchor;
  assert.equal(elapsed, 80);
  reopened.win.confirm = () => false;
  reopened.click('brew-exit-button');
  await new Promise(setImmediate);
  assert.equal(reopened.el('brew-screen').hidden, false);
  assert.ok(device.getItem(`${STORAGE_PREFIX}6`), 'cancelled exit preserves progress');
  reopened.win.confirm = () => true;
  reopened.click('reset-timer');
  assert.equal(device.getItem(`${STORAGE_PREFIX}6`), null);
  assert.equal(reopened.el('timer-clock').textContent, '0:00');
  reopened.click('timer-toggle'); reopened.click('brew-exit-button');
  await new Promise(setImmediate);
  assert.equal(device.getItem(`${STORAGE_PREFIX}6`), null);
  assert.equal(reopened.el('brew-screen').hidden, true);
  reopened.close();
});

test('real app catches up on page restoration and Homeroom visibility, then completes', async () => {
  const h = await app({ route: '/?recipe=v60-bright' });
  start(h); h.advance(65);
  h.win.dispatchEvent(new h.win.Event('pagehide'));
  h.win.dispatchEvent(new h.win.Event('pageshow'));
  assert.equal(h.el('timer-clock').textContent, '1:05');
  h.advance(5);
  h.win.dispatchEvent(new h.win.CustomEvent('usernode:visibility-changed', { detail: { hidden: false } }));
  assert.equal(h.el('timer-clock').textContent, '1:10');
  h.advance(120);
  h.win.document.dispatchEvent(new h.win.Event('visibilitychange'));
  assert.equal(h.el('brew-complete').hidden, false);
  assert.equal(h.device.getItem(`${STORAGE_PREFIX}6`), null);
  h.close();
});

test('real app restores a private snapshot offline and isolates other users and check routes', async () => {
  const id = 'personal-00000000-0000-4000-8000-000000000013';
  const recipe = { ...recipes.RECIPES[0], id, revisionId: `${id}@2`, version: 2, isPersonal: true, title: 'My private cup' };
  const first = await app({ route: `/?recipe=${id}`, personalRecipes: [recipe] });
  start(first, 22);
  const device = first.device; first.close();
  const original = device.getItem(`${STORAGE_PREFIX}6`);
  const offline = await app({ device, at: START + 50_000, pendingNetwork: true });
  assert.equal(offline.el('brew-title').textContent, 'My private cup');
  assert.equal(offline.el('timer-clock').textContent, '0:50');
  offline.close();
  const other = await app({ device, user: 7 });
  assert.equal(other.el('brew-screen').hidden, true);
  other.close();
  const preview = await app({ device, route: '/?brew=v60-bright&shot=active' });
  preview.click('timer-toggle'); preview.click('reset-timer'); preview.close();
  assert.equal(device.getItem(`${STORAGE_PREFIX}6`), original);
});

test('real app honors explicit deep links and shows completion after recreation', async () => {
  const first = await app({ route: '/?recipe=v60-bright' });
  start(first); const device = first.device; first.close();
  const detail = await app({ device, route: '/?recipe=chemex-clean-two-stage' });
  assert.equal(detail.el('recipe-screen').hidden, false);
  assert.equal(detail.el('brew-screen').hidden, true);
  detail.close();
  const finished = await app({ device, at: START + 600_000 });
  assert.equal(finished.el('brew-screen').hidden, false);
  assert.equal(finished.el('brew-complete').hidden, false);
  assert.equal(device.getItem(`${STORAGE_PREFIX}6`), null);
  finished.close();
});

test('tokenless offline boots recover the remembered account and keep its active brew', async () => {
  const first = await app({ route: '/?recipe=v60-bright' });
  start(first); const device = first.device; first.close();
  const offline = await app({ device, user: null, at: START + 55_000, pendingNetwork: true });
  assert.equal(offline.el('brew-screen').hidden, false);
  assert.equal(offline.el('timer-clock').textContent, '0:55');
  assert.ok(device.getItem(`${STORAGE_PREFIX}6`));
  assert.equal(device.getItem(`${STORAGE_PREFIX}anonymous`), null);
  offline.close();
});
