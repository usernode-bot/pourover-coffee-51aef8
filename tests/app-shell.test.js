const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('the product shell replaces the starter demo and preserves platform infrastructure', () => {
  const html = read('public/index.html');
  const server = read('server.js');

  assert.doesNotMatch(html, /usernode-starter-notice@1/);
  assert.doesNotMatch(server, /api\/press|api\/leaderboard|CREATE TABLE IF NOT EXISTS presses/);
  assert.match(html, /usernode-dev-console@1/);
  assert.match(html, /\/usernode-bridge\/v1\/bridge\.js/);
  assert.match(html, /\/usernode-native\/v1\/native\.css/);
  assert.match(html, /\/usernode-native\/v1\/native\.js/);
  assert.match(server, /express\.static\([^\n]+\{ index: false \}\)/);
});

test('the manifest declares navigable checks for each product screen', () => {
  const manifest = JSON.parse(read('dapp.json'));
  assert.equal(manifest.icon.emoji, '☕');
  assert.deepEqual(manifest.tests.map((entry) => entry.path), [
    '/',
    '/?method=v60',
    '/?filterMethod=v60&roast=light&profile=sweet',
    '/?recipe=v60-bright',
    '/?brew=v60-bright&shot=active',
    '/?journal=demo',
    '/?journal=demo&entry=demo-v60',
    '/?journal=new',
    '/?glossary=1',
    '/?glossary=1&q=drawdown',
    '/?scope=favorites',
    '/?scope=recent',
    '/?recipe=v60-bright',
    '/?shelf=demo',
    '/?shelf=demo&tab=collections',
    '/?collection=900001&shelf=demo',
    '/?recipe=v60-bright&picker=1',
    '/?glossary=1&term=bloom',
  ]);
  const byPath = (path) => manifest.tests.filter((entry) => entry.path === path);
  assert.equal(byPath('/?brew=v60-bright&shot=active')[0].visual, true);
  assert.equal(byPath('/?brew=v60-bright&shot=active')[0].id, 'brew.guided-timer');
  assert.equal(byPath('/?method=v60')[0].expectText, '3 recipes for V60');
  assert.equal(byPath('/?filterMethod=v60&roast=light&profile=sweet')[0].expectText, 'Sweet pulse');
  assert.equal(byPath('/?recipe=v60-bright')[0].expectText, 'Pourover Coffee original');
  assert.equal(byPath('/?brew=v60-bright&shot=active')[0].expectText, 'Get ready');
  assert.equal(byPath('/?journal=demo')[0].expectText, 'Staging demo: Finca El Jardín');
  assert.equal(byPath('/?journal=demo&entry=demo-v60')[0].expectText, 'Brew snapshot');
  assert.equal(byPath('/?journal=new')[0].expectText, 'What did you use?');
  assert.ok(['/?journal=demo', '/?journal=demo&entry=demo-v60', '/?journal=new']
    .every((path) => byPath(path)[0].visual));
  assert.equal(byPath('/?glossary=1&term=bloom')[0].visual, true);
  assert.equal(byPath('/?glossary=1&term=bloom')[0].id, 'glossary.term-panel');
  assert.match(byPath('/?glossary=1&term=bloom')[0].expectText, /gas escape/);
});

test('the manifest covers the shelf, its screens, and its library filters', () => {
  const manifest = JSON.parse(read('dapp.json'));
  const shelfTests = manifest.tests.filter((entry) => /shelf|collection|scope|picker/.test(entry.path));
  assert.ok(shelfTests.every((entry) => entry.expectSelector || entry.expectText));
  for (const path of ['/?shelf=demo', '/?shelf=demo&tab=collections', '/?collection=900001&shelf=demo', '/?recipe=v60-bright&picker=1']) {
    const entry = manifest.tests.filter((candidate) => candidate.path === path)[0];
    assert.equal(entry.visual, true, path);
    assert.ok(entry.id, path);
    assert.ok(entry.impact.includes('shelf-store.js'), path);
  }
  const filterTest = manifest.tests.filter((entry) => entry.path === '/?scope=favorites')[0];
  assert.equal(filterTest.expectSelector, '#filter-favorites[aria-pressed="true"]');
  const recentTest = manifest.tests.filter((entry) => entry.path === '/?scope=recent')[0];
  assert.equal(recentTest.expectSelector, '#filter-recent[aria-pressed="true"]');
});

test('the personal shelf keeps its screens, privacy, and revision-stable references', () => {
  const html = read('public/index.html');
  const client = read('public/app.js');
  const server = read('server.js');
  const store = read('shelf-store.js');

  assert.match(html, /id="shelf-screen"/);
  assert.match(html, /id="shelf-button"/);
  assert.match(html, /id="collection-screen"/);
  assert.match(html, /id="shelf-picker"[^>]+role="dialog"/);
  assert.match(html, /id="recipe-favorite"[^>]+aria-pressed="false"/);
  assert.match(html, /id="filter-favorites"/);
  assert.match(html, /id="filter-recent"/);
  assert.match(client, /data-favorite-toggle/);
  assert.match(client, /function syncAllFavoriteControls\(\)/);
  assert.ok(server.includes("app.put('/api/shelf/favorites/:recipeId'"));
  assert.ok(server.includes("app.post('/api/shelf/collections'"));
  assert.ok(server.includes("app.patch('/api/shelf/collections/:id'"));
  assert.ok(server.includes("app.delete('/api/shelf/collections/:id'"));
  assert.ok(server.includes("app.put('/api/shelf/collections/order'"));
  assert.ok(server.includes("app.put('/api/shelf/collections/:id/order'"));
  // Everything a stranger must not see is private, so staging gets schema only.
  assert.match(store, /COMMENT ON TABLE recipe_favorites IS 'staging:private'/);
  assert.match(store, /COMMENT ON TABLE recipe_collections IS 'staging:private'/);
  assert.match(store, /COMMENT ON TABLE recipe_collection_items IS 'staging:private'/);
  // Shelf rows store the stable recipe id, never a revision id, so a recipe
  // that later receives a new revision keeps its place.
  assert.doesNotMatch(store, /recipe_id TEXT NOT NULL[\s\S]{0,200}@/);
  // Deleting a collection must not delete recipes or brew history.
  assert.doesNotMatch(server, /DELETE FROM brew_journal_entries[\s\S]{0,120}collection/i);
});

test('the shelf loads before the library paints and is private by default', () => {
  const client = read('public/app.js');
  // The favorite hearts on every screen read from one shelf model, loaded once.
  assert.match(client, /ensureShelf\(\)\.catch\(\(\) => \{\}\)\.finally\(\(\) => parseLocation\(\)\)/);
  assert.match(client, /function renderRecipeShelfControls\(\)/);
  assert.match(client, /if \(state\.screen === 'library' && state\.libraryScope\) renderLibrary\(\);/);
});

test('the shell has separate method, discovery, detail, and brew surfaces', () => {
  const html = read('public/index.html');
  assert.match(html, /id="method-list"/);
  assert.match(html, /id="recipe-filters"/);
  assert.match(html, /select name="method"/);
  assert.match(html, /select name="roast"/);
  assert.match(html, /select name="profile"/);
  assert.match(html, /id="active-filters"/);
  assert.match(html, /id="recipe-empty-state"/);
  assert.match(html, /id="method-screen"/);
  assert.match(html, /id="method-recipe-list"/);
  assert.match(html, /id="recipe-tag-groups"/);
});

test('the guided timer includes an accessible non-ticking upcoming-step preview', () => {
  const html = read('public/index.html');
  const source = read('public/app.js');

  assert.match(html, /id="next-step-preview"[^>]+data-state="upcoming"/);
  assert.match(html, /id="next-step-timing"/);
  assert.match(html, /id="next-step-target"/);
  assert.match(html, /id="next-step-preparation"/);
  assert.match(html, /id="timer-announcement"[^>]+aria-live="polite"/);
  assert.doesNotMatch(html, /id="next-step-preview"[^>]+aria-live=/);
  assert.match(source, /navigator\.vibrate\?\.\(\[12, 36, 12\]\)/);
});

test('the private journal exposes history, detail, and edit surfaces from completed brews', () => {
  const html = read('public/index.html');
  const client = read('public/app.js');
  const server = read('server.js');
  const store = read('journal-store.js');

  assert.match(html, /id="save-brew-notes"/);
  assert.match(html, /id="journal-screen"/);
  assert.match(html, /id="journal-detail-screen"/);
  assert.match(html, /id="journal-form-screen"/);
  assert.match(html, /id="journal-delete-confirmation"[^>]+hidden/);
  assert.match(client, /'x-usernode-token': APP_TOKEN/);
  assert.match(client, /method: 'PATCH'/);
  assert.match(client, /method: 'DELETE'/);
  assert.match(server, /app\.post\('\/api\/brews'/);
  assert.match(server, /app\.patch\('\/api\/brews\/:id'/);
  assert.match(server, /app\.delete\('\/api\/brews\/:id'/);
  assert.match(store, /COMMENT ON TABLE brew_journal_entries IS 'staging:private'/);
  assert.match(store, /recipe_snapshot JSONB NOT NULL/);
});

test('recipe navigation retains exact historical revision links', () => {
  const source = read('public/app.js');
  assert.match(source, /recipeRouteReference\(recipe\)/);
  assert.match(source, /entry\.recipeRevisionId/);
  assert.match(source, /The current recipe is v/);
});

test('the glossary is reachable in context and covered by content checks', () => {
  const html = read('public/index.html');
  const source = read('public/app.js');

  assert.match(html, /id="glossary-screen"/);
  assert.match(html, /id="glossary-search"/);
  assert.match(html, /src="\/glossary\.js"/);
  assert.match(html, /id="term-panel"[^>]+role="dialog"/);
  assert.match(html, /id="term-panel-backdrop"/);
  assert.match(source, /aria-label="Definition of \$\{escapeHtml\(label\)\}"/);
  assert.match(source, /event\.key === 'Escape' && state\.term\.open/);
  assert.match(source, /window\.addEventListener\('popstate'/);
  assert.match(source, /document\.getElementById\('app-shell'\)\.inert = true/);
});

test('the timer keeps its step label button alive across ticks', () => {
  const source = read('public/app.js');

  // The timer re-renders every 200ms. Replacing the step label each tick would
  // destroy the definition button and drop keyboard focus with it.
  assert.match(source, /function setStepLabel\(el, label, cacheKey\) \{\n    if \(state\[cacheKey\] === label\) return;/);
  assert.match(source, /renderActiveStepLabel\(recipeStep\.label\)/);
  assert.match(source, /renderNextStepLabel\(nextRecipeStep\.label\)/);
  // Starting a brew announces the first step; resuming from a pause does not.
  assert.match(source, /if \(!state\.timer\.started\) state\.lastRenderedStep = null;/);
});

test('user-facing product files contain no em dash encoding', () => {
  for (const file of ['public/index.html', 'public/app.js', 'public/recipes.js', 'public/glossary.js', 'server.js', 'journal-store.js', 'dapp.json']) {
    const source = read(file);
    assert.doesNotMatch(source, /—|&mdash;|&#8212;|\\u2014/, file);
  }
});
