const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

// Favoriting is a recipe-screen action: the design decision is that a listing
// card opens the recipe, and the recipe is where you save it. A card-level
// heart is easy to reintroduce by habit, and neither `npm test` nor the
// "loads with no console errors" baseline would notice, so this pins the
// decision and the placement that depends on it.

function functionBody(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} exists`);
  const open = source.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    else if (source[i] === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(open, i + 1);
    }
  }
  throw new Error(`unbalanced braces in ${name}`);
}

test('listing cards do not render a favorite control', () => {
  const app = read('public/app.js');
  for (const renderer of ['recipeCard', 'shelfRecipeCard']) {
    const body = functionBody(app, renderer);
    assert.doesNotMatch(body, /favorite-toggle/, `${renderer} has no heart`);
    assert.doesNotMatch(body, /favoriteToggleHtml/, `${renderer} does not build a heart`);
  }
  // The card-heart builder and its delegated click handler are gone with it.
  assert.doesNotMatch(app, /function favoriteToggleHtml/);
  assert.doesNotMatch(app, /data-favorite-toggle/);
});

test('the favorite control lives on the recipe screen', () => {
  const html = read('public/index.html');
  const app = read('public/app.js');
  const recipeScreen = html.slice(
    html.indexOf('id="recipe-screen"'),
    html.indexOf('id="glossary-screen"')
  );
  assert.match(recipeScreen, /id="recipe-favorite-button"/);
  assert.match(recipeScreen, /id="recipe-favorite-label"/);

  // ...and it is wired to the toggle, so the control is not just decorative.
  assert.match(app, /elements\.recipeFavoriteButton\.addEventListener\('click'/);

  // No leftover styling for a control that no longer renders on a card.
  assert.doesNotMatch(read('public/app.css'), /\.favorite-toggle\b/);
});
