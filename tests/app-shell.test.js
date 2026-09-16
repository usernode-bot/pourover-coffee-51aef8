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
    '/?glossary=1',
    '/?glossary=1&q=drawdown',
    '/?glossary=1&term=bloom',
  ]);
  assert.equal(manifest.tests[4].visual, true);
  assert.equal(manifest.tests[4].id, 'brew.guided-timer');
  assert.equal(manifest.tests[1].expectText, '3 recipes for V60');
  assert.equal(manifest.tests[2].expectText, 'Sweet pulse');
  assert.equal(manifest.tests[3].expectText, 'Pourover Coffee original');
  assert.equal(manifest.tests[4].expectText, 'Get ready');
  assert.equal(manifest.tests[7].visual, true);
  assert.equal(manifest.tests[7].id, 'glossary.term-panel');
  assert.match(manifest.tests[7].expectText, /gas escape/);
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
  for (const file of ['public/index.html', 'public/app.js', 'public/recipes.js', 'public/glossary.js', 'dapp.json']) {
    const source = read(file);
    assert.doesNotMatch(source, /—|&mdash;|&#8212;|\\u2014/, file);
  }
});
