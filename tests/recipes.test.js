const test = require('node:test');
const assert = require('node:assert/strict');

const {
  DEFAULT_PREPARATION_LEAD_SECONDS,
  IMMINENT_PREPARATION_SECONDS,
  MAX_COFFEE_GRAMS,
  MIN_COFFEE_GRAMS,
  RECIPES,
  clampCoffee,
  getBrewTiming,
  getPreparationLead,
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

test('every recipe step has preparation guidance for upcoming-step previews', () => {
  for (const recipe of RECIPES) {
    for (const step of recipe.steps) {
      assert.ok(step.preparation?.trim(), `${recipe.id}:${step.label}`);
      if (step.prepareLeadSeconds !== undefined) {
        assert.ok(step.prepareLeadSeconds >= IMMINENT_PREPARATION_SECONDS);
      }
    }
  }
});

test('brew timing exposes the next boundary, countdown, and scaled target', () => {
  const scaled = scaleRecipe('v60', 30);
  const timing = getBrewTiming(scaled, 34);

  assert.equal(timing.stepIndex, 0);
  assert.equal(timing.nextStepIndex, 1);
  assert.equal(timing.nextStartsAt, 45);
  assert.equal(timing.secondsUntilNext, 11);
  assert.equal(timing.preparationLeadSeconds, DEFAULT_PREPARATION_LEAD_SECONDS);
  assert.equal(timing.isPreparing, true);
  assert.equal(timing.isImminent, false);
  assert.equal(scaled.steps[timing.nextStepIndex].target, 300);
});

test('the final ten seconds and exact step boundary are deterministic', () => {
  const scaled = scaleRecipe('v60', 15);
  const imminent = getBrewTiming(scaled, 35);
  const transitioned = getBrewTiming(scaled, 45);

  assert.equal(imminent.secondsUntilNext, IMMINENT_PREPARATION_SECONDS);
  assert.equal(imminent.isImminent, true);
  assert.equal(transitioned.stepIndex, 1);
  assert.equal(transitioned.nextStepIndex, 2);
  assert.equal(transitioned.nextStartsAt, 80);
  assert.equal(transitioned.secondsUntilNext, 35);
  assert.equal(transitioned.isPreparing, false);
});

test('recipe steps can extend the default preparation lead time', () => {
  const switchRecipe = scaleRecipe('switch', 20);
  const beforeWindow = getBrewTiming(switchRecipe, 54);
  const inWindow = getBrewTiming(switchRecipe, 55);

  assert.equal(getPreparationLead(switchRecipe.steps[2]), 20);
  assert.equal(beforeWindow.nextStepIndex, 2);
  assert.equal(beforeWindow.secondsUntilNext, 21);
  assert.equal(beforeWindow.isPreparing, false);
  assert.equal(inWindow.secondsUntilNext, 20);
  assert.equal(inWindow.isPreparing, true);
});

test('the last brew step has no stale upcoming action', () => {
  const scaled = scaleRecipe('v60', 15);
  const timing = getBrewTiming(scaled, 115);

  assert.equal(timing.stepIndex, 3);
  assert.equal(timing.nextStepIndex, null);
  assert.equal(timing.nextStartsAt, null);
  assert.equal(timing.secondsUntilNext, null);
  assert.equal(timing.isPreparing, false);
  assert.equal(timing.isImminent, false);
  assert.equal(timing.isFinalStep, true);
});
