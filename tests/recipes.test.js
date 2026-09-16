const test = require('node:test');
const assert = require('node:assert/strict');

const {
  MAX_COFFEE_GRAMS,
  MIN_COFFEE_GRAMS,
  RECIPES,
  clampCoffee,
  getRecipe,
  scaleRecipe,
} = require('../public/recipes');

test('the starter library covers the five requested brewing methods', () => {
  assert.deepEqual(
    RECIPES.map((recipe) => recipe.id),
    ['v60', 'switch', 'mugen', 'clever', 'cotton'],
  );
});

test('coffee doses are rounded and clamped to the supported range', () => {
  assert.equal(clampCoffee(2), MIN_COFFEE_GRAMS);
  assert.equal(clampCoffee(12.6), 13);
  assert.equal(clampCoffee(99), MAX_COFFEE_GRAMS);
  assert.equal(clampCoffee('not a number'), MIN_COFFEE_GRAMS);
});

test('water uses deterministic nearest-gram ratio rounding', () => {
  const scaled = scaleRecipe('v60', 13);
  assert.equal(scaled.coffee, 13);
  assert.equal(scaled.water, 217);
});

test('every recipe ends at total water with monotonic cumulative targets', () => {
  for (const recipe of RECIPES) {
    for (const dose of [MIN_COFFEE_GRAMS, recipe.defaultCoffee, MAX_COFFEE_GRAMS]) {
      const scaled = scaleRecipe(recipe, dose);
      const targets = scaled.steps.map((step) => step.target);
      assert.equal(targets.at(-1), scaled.water, `${recipe.id} final target`);
      assert.ok(
        targets.every((target, index) => index === 0 || target >= targets[index - 1]),
        `${recipe.id} targets must be monotonic`,
      );
    }
  }
});

test('scaled step targets keep the recipe proportions', () => {
  const original = getRecipe('v60');
  const scaled = scaleRecipe(original, 30);
  assert.equal(scaled.water, 500);
  assert.deepEqual(scaled.steps.map((step) => step.target), [90, 300, 500, 500]);
});
