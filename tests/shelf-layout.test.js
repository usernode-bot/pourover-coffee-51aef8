const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(root, 'public/app.css'), 'utf8');

// The favorite heart is absolutely positioned over the card's top-right corner,
// which is exactly where the card's method/time line ends. A regression here is
// invisible to source review (it is a paint-order overlap) and invisible to the
// "loads with no console errors" baseline, so it gets its own assertion.
function ruleBody(selector) {
  const pattern = new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]*)\\}`);
  const match = css.match(pattern);
  return match ? match[1] : null;
}

test('the favorite heart owns a reserved corner in every recipe card', () => {
  const toggle = ruleBody('.favorite-toggle');
  assert.ok(toggle, '.favorite-toggle has a rule');
  assert.match(toggle, /position:\s*absolute/);
  assert.match(toggle, /top:\s*[\d.]+rem/);
  assert.match(toggle, /right:\s*[\d.]+rem/);

  // Both card kinds that carry the heart must reserve the same corner, or the
  // shelf list repeats the bug the library fixed.
  const reserved = css.match(
    /\.brew-recipe-shell \.brew-recipe-topline,\s*\.shelf-recipe-shell \.brew-recipe-topline\s*\{([^}]*)\}/
  );
  assert.ok(reserved, 'the card top line reserves space for the heart');
  const padding = reserved[1].match(/padding-right:\s*([\d.]+)rem/);
  assert.ok(padding, 'the reservation is a right padding');
  const reservedRem = Number(padding[1]);

  // The button is positioned against the shell, but the top line sits inside
  // the card's own padding, so both insets together are what actually clears
  // it. (The heart's right offset plus its width is the space it occupies.)
  const card = ruleBody('.brew-recipe-card');
  assert.ok(card, '.brew-recipe-card has a rule');
  const cardPaddingRem = Number(card.match(/padding:\s*([\d.]+)rem/)[1]);
  const right = Number(toggle.match(/right:\s*([\d.]+)rem/)[1]);
  const width = Number(toggle.match(/\bwidth:\s*([\d.]+)rem/)[1]);

  assert.ok(
    cardPaddingRem + reservedRem >= right + width,
    `card padding ${cardPaddingRem}rem + reserved ${reservedRem}rem must cover the heart `
    + `(right ${right}rem + width ${width}rem)`
  );
});
