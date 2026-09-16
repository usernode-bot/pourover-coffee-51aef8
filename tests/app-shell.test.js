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
    '/?recipe=v60',
    '/?brew=v60&shot=active',
  ]);
  assert.equal(manifest.tests[2].visual, true);
  assert.equal(manifest.tests[2].id, 'brew.guided-timer');
  assert.equal(manifest.tests[1].expectText, 'Scale the recipe');
  assert.equal(manifest.tests[2].expectText, 'First pour');
});

test('user-facing product files contain no em dash encoding', () => {
  for (const file of ['public/index.html', 'public/app.js', 'public/recipes.js', 'dapp.json']) {
    const source = read(file);
    assert.doesNotMatch(source, /—|&mdash;|&#8212;|\\u2014/, file);
  }
});
