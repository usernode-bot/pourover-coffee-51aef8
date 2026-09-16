const test = require('node:test');
const assert = require('node:assert/strict');

const {
  DEFAULT_PREPARATION_LEAD_SECONDS,
  IMMINENT_PREPARATION_SECONDS,
  MAX_COFFEE_GRAMS,
  METHODS,
  MIN_COFFEE_GRAMS,
  RECIPES,
  RECIPE_REVISIONS,
  TAG_KEYS,
  TAG_TAXONOMY,
  clampCoffee,
  createRecipeSnapshot,
  filterRecipes,
  getBrewTiming,
  getPreparationLead,
  getRecipe,
  getRecipeRevision,
  getRecipesForMethod,
  isCurrentRecipeRevision,
  normalizeFilters,
  resolveRecipeId,
  scaleRecipe,
} = require('../public/recipes');

test('methods and recipes are separate with three recipes per brewer', () => {
  assert.deepEqual(METHODS.map((method) => method.id), ['v60', 'switch', 'mugen', 'clever', 'cotton']);
  assert.equal(RECIPES.length, 15);
  assert.equal(new Set(RECIPES.map((recipe) => recipe.id)).size, RECIPES.length);

  for (const method of METHODS) {
    const recipes = getRecipesForMethod(method.id);
    assert.equal(recipes.length, 3, method.id);
    assert.ok(recipes.some((recipe) => recipe.id === method.defaultRecipeId), method.defaultRecipeId);
  }
});

test('every recipe has complete attribution and valid typed tags', () => {
  const methodIds = new Set(METHODS.map((method) => method.id));
  for (const recipe of RECIPES) {
    assert.ok(methodIds.has(recipe.methodId), recipe.id);
    assert.equal(recipe.attribution.type, 'original');
    assert.equal(recipe.attribution.label, 'Pourover Coffee original');
    assert.ok(recipe.title.trim());
    assert.ok(recipe.summary.trim());
    assert.ok(recipe.result.trim());
    for (const facet of TAG_KEYS) {
      const allowed = new Set(TAG_TAXONOMY[facet].values.map((entry) => entry.value));
      assert.ok(recipe.tags[facet].length > 0, `${recipe.id}:${facet}`);
      assert.ok(recipe.tags[facet].every((value) => allowed.has(value)), `${recipe.id}:${facet}`);
    }
  }
});

test('filters use AND semantics across typed facets', () => {
  const matches = filterRecipes({ method: 'v60', roast: 'light', profile: 'sweet' });
  assert.deepEqual(matches.map((recipe) => recipe.id), ['v60-sweet-pulse']);

  const empty = filterRecipes({ method: 'mugen', roast: 'light', technique: 'immersion' });
  assert.deepEqual(empty, []);
});

test('unsupported filter values are dropped before matching or routing', () => {
  assert.deepEqual(normalizeFilters({ method: 'unknown', roast: 'green', profile: 'bright' }), {
    profile: 'bright',
  });
});

test('legacy method-shaped links resolve to each default recipe', () => {
  for (const method of METHODS) {
    assert.equal(resolveRecipeId(method.id), method.defaultRecipeId);
    assert.equal(getRecipe(method.id).id, method.defaultRecipeId);
  }
  assert.equal(resolveRecipeId('not-a-recipe'), METHODS[0].defaultRecipeId);
});

test('coffee doses are rounded and clamped to the supported range', () => {
  assert.equal(clampCoffee(2), MIN_COFFEE_GRAMS);
  assert.equal(clampCoffee(12.6), 13);
  assert.equal(clampCoffee(99), MAX_COFFEE_GRAMS);
  assert.equal(clampCoffee('not a number'), MIN_COFFEE_GRAMS);
});

test('water uses deterministic nearest-gram ratio rounding per recipe', () => {
  assert.equal(scaleRecipe('v60-bright', 13).water, 217);
  assert.equal(scaleRecipe('switch-full-immersion', 13).water, 195);
  assert.equal(scaleRecipe('cotton-delicate-light', 13).water, 182);
});

test('every recipe ends at total water with monotonic cumulative targets', () => {
  for (const recipe of RECIPES) {
    for (const dose of [MIN_COFFEE_GRAMS, recipe.defaultCoffee, MAX_COFFEE_GRAMS]) {
      const scaled = scaleRecipe(recipe, dose);
      const targets = scaled.steps.map((recipeStep) => recipeStep.target);
      assert.equal(targets.at(-1), scaled.water, `${recipe.id} final target`);
      assert.ok(targets.every((target, index) => index === 0 || target >= targets[index - 1]), recipe.id);
    }
  }
});

test('scaled step targets keep the selected recipe proportions', () => {
  const scaled = scaleRecipe('v60-bright', 30);
  assert.equal(scaled.water, 500);
  assert.deepEqual(scaled.steps.map((recipeStep) => recipeStep.target), [90, 300, 500, 500]);
});

test('every recipe step has preparation guidance for upcoming-step previews', () => {
  for (const recipe of RECIPES) {
    for (const recipeStep of recipe.steps) {
      assert.ok(recipeStep.preparation?.trim(), `${recipe.id}:${recipeStep.label}`);
      if (recipeStep.prepareLeadSeconds !== undefined) {
        assert.ok(recipeStep.prepareLeadSeconds >= IMMINENT_PREPARATION_SECONDS);
      }
    }
  }
});

test('brew timing retains next-step boundaries for an exact recipe', () => {
  const scaled = scaleRecipe('v60-bright', 30);
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

test('the final ten seconds and recipe lead-time overrides remain deterministic', () => {
  const imminent = getBrewTiming(scaleRecipe('v60-bright', 15), 35);
  assert.equal(imminent.secondsUntilNext, IMMINENT_PREPARATION_SECONDS);
  assert.equal(imminent.isImminent, true);

  const switchRecipe = scaleRecipe('switch-hybrid', 20);
  const beforeWindow = getBrewTiming(switchRecipe, 54);
  const inWindow = getBrewTiming(switchRecipe, 55);
  assert.equal(getPreparationLead(switchRecipe.steps[2]), 20);
  assert.equal(beforeWindow.isPreparing, false);
  assert.equal(inWindow.isPreparing, true);
});

test('the last brew step has no stale upcoming action', () => {
  const timing = getBrewTiming(scaleRecipe('v60-bright', 15), 115);
  assert.equal(timing.stepIndex, 3);
  assert.equal(timing.nextStepIndex, null);
  assert.equal(timing.secondsUntilNext, null);
  assert.equal(timing.isFinalStep, true);
});

test('the original recipe library is an explicit first revision of every stable recipe', () => {
  assert.equal(RECIPE_REVISIONS.length, 15);
  assert.equal(RECIPES.length, 15);
  for (const recipe of RECIPES) {
    assert.equal(recipe.version, 1, recipe.id);
    assert.equal(recipe.revisionId, `${recipe.id}@1`);
    assert.equal(getRecipeRevision(recipe.id, 1), recipe);
    assert.equal(getRecipeRevision(recipe.revisionId), recipe);
    assert.equal(isCurrentRecipeRevision(recipe), true);
    assert.equal(Object.isFrozen(recipe), true);
    assert.equal(Object.isFrozen(recipe.tags), true);
    assert.equal(Object.isFrozen(recipe.steps), true);
  }
  assert.equal(getRecipeRevision('v60-bright', 99), null);
});

test('recipe snapshots preserve the exact revision and scaled brew instructions', () => {
  const snapshot = createRecipeSnapshot('v60-sweet-pulse@1', 21);
  assert.equal(snapshot.id, 'v60-sweet-pulse');
  assert.equal(snapshot.version, 1);
  assert.equal(snapshot.revisionId, 'v60-sweet-pulse@1');
  assert.equal(snapshot.coffee, 21);
  assert.equal(snapshot.water, Math.round(21 * snapshot.ratio));
  assert.equal(snapshot.steps.at(-1).target, snapshot.water);
  assert.ok(snapshot.steps.every((step) => step.instruction && step.preparation));
  assert.equal(Object.isFrozen(snapshot), true);
  assert.equal(Object.isFrozen(snapshot.steps), true);
  assert.equal(Object.isFrozen(snapshot.steps[0]), true);
});
