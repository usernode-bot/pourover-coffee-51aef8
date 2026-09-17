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
    '/?recipe=clever-water-first&shot=timeline',
    '/?brew=v60-bright&shot=active',
    '/?journal=demo',
    '/?journal=demo&entry=demo-v60',
    '/?journal=new',
    '/?favorites=1&demo=1',
    '/?shelf=favorites&demo=1',
    '/?shelf=brewed&demo=1',
    '/?shelf=collections&demo=1',
    '/?collection=demo-weekday&demo=1',
    '/?recipe=v60-bright&shot=picker&demo=1',
    '/?glossary=1',
    '/?glossary=1&q=drawdown',
    '/?glossary=1&term=bloom',
    '/?method=aeropress',
    '/?recipe=aeropress-inverted',
    '/?brew=aeropress-inverted&shot=active',
  ]);
  assert.equal(manifest.tests[4].visual, true);
  assert.equal(manifest.tests[4].id, 'recipe.timeline');
  assert.equal(manifest.tests[5].visual, true);
  assert.equal(manifest.tests[5].id, 'brew.guided-timer');
  assert.equal(manifest.tests[1].expectText, '3 recipes for V60');
  assert.equal(manifest.tests[2].expectText, 'Sweet pulse');
  assert.equal(manifest.tests[3].expectText, 'Pourover Coffee original');
  assert.equal(manifest.tests[4].expectText, 'Start at 0:00');
  assert.equal(manifest.tests[5].expectText, 'Now');
  assert.equal(manifest.tests[6].expectText, 'Staging demo: Finca El Jardín');
  assert.equal(manifest.tests[7].expectText, 'Brew snapshot');
  assert.equal(manifest.tests[8].expectText, 'What did you use?');
  assert.ok(manifest.tests.slice(6, 9).every((entry) => entry.visual));
  assert.equal(manifest.tests[17].visual, true);
  assert.equal(manifest.tests[17].id, 'glossary.term-panel');
  assert.match(manifest.tests[17].expectText, /gas escape/);
  assert.equal(manifest.tests[18].expectText, '3 recipes for AeroPress');
  assert.equal(manifest.tests[19].id, 'manual.aeropress-recipe');
  assert.equal(manifest.tests[20].id, 'manual.aeropress-timer');
  assert.ok(manifest.tests.slice(19, 21).every((entry) => entry.visual));
});

test('the manifest declares visual checks for the shelf screens', () => {
  const manifest = JSON.parse(read('dapp.json'));
  const visual = Object.fromEntries(manifest.tests.filter((entry) => entry.visual).map((entry) => [entry.id, entry]));
  for (const id of ['shelf.favorites', 'shelf.collections', 'collection.detail']) {
    assert.ok(visual[id], `${id} is declared`);
    assert.ok(visual[id].expectText || visual[id].expectSelector, `${id} asserts a settled state`);
    assert.ok(visual[id].impact.some((glob) => glob === 'public/**'), `${id} tracks the frontend`);
  }
  // The favorites filter and the collection picker are reachable by URL, so a
  // reviewer's screenshot lands on the changed screen rather than the home page.
  const paths = manifest.tests.map((entry) => entry.path);
  assert.ok(paths.includes('/?favorites=1&demo=1'));
  assert.ok(paths.includes('/?recipe=v60-bright&shot=picker&demo=1'));
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

test('guided brewing shares one timeline and enters a protected mobile focus mode', () => {
  const source = read('public/app.js');
  const recipes = read('public/recipes.js');
  const styles = read('public/app.css');

  assert.match(recipes, /function getRecipeTimeline\(recipeOrId\)/);
  assert.match(source, /const timeline = getRecipeTimeline\(recipe\)/);
  assert.match(source, /elements\.activeStepNumber\.textContent = `Now · \$\{actionLabel\(recipeStep\)\}/);
  assert.match(source, /STEP_ACTIONS/);
  assert.match(source, /no scale reading/);
  assert.match(source, /document\.body\.classList\.toggle\('brew-focus', active\)/);
  assert.match(source, /Exit this guided brew\? Your timer progress will be cleared\./);
  assert.match(source, /window\.addEventListener\('beforeunload'/);
  assert.match(styles, /\.brew-focus #app-header/);
  assert.match(styles, /100dvh/);
  assert.match(styles, /safe-area-inset-bottom/);
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
