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
  STEP_ACTIONS,
  TAG_KEYS,
  TAG_TAXONOMY,
  clampCoffee,
  createRecipeSnapshot,
  filterRecipes,
  getBrewTiming,
  getPreparationLead,
  getRecipe,
  getRecipeRevision,
  getRecipeTimeline,
  getRecipesForMethod,
  isCurrentRecipeRevision,
  normalizeFilters,
  resolveRecipeId,
  scaleRecipe,
} = require('../public/recipes');

test('manual-coffee methods and recipes are separate with three recipes per brewer', () => {
  assert.deepEqual(METHODS.map((method) => method.id), [
    'v60', 'switch', 'mugen', 'clever', 'cotton', 'kalita', 'chemex', 'aeropress',
  ]);
  assert.equal(RECIPES.length, 24);
  assert.equal(new Set(RECIPES.map((recipe) => recipe.id)).size, RECIPES.length);

  for (const method of METHODS) {
    assert.ok(method.family.trim(), `${method.id} family`);
    assert.ok(method.filterMaterial.trim(), `${method.id} filter material`);
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
    for (const recipeStep of recipe.steps) {
      assert.ok(STEP_ACTIONS[recipeStep.action], `${recipe.id}:${recipeStep.label}:${recipeStep.action}`);
    }
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

test('every recipe reaches total water with monotonic optional cumulative targets', () => {
  for (const recipe of RECIPES) {
    for (const dose of [MIN_COFFEE_GRAMS, recipe.defaultCoffee, MAX_COFFEE_GRAMS]) {
      const scaled = scaleRecipe(recipe, dose);
      const targets = scaled.steps
        .filter((recipeStep) => Number.isFinite(recipeStep.target))
        .map((recipeStep) => recipeStep.target);
      assert.equal(targets.at(-1), scaled.water, `${recipe.id} final target`);
      assert.ok(targets.every((target, index) => index === 0 || target >= targets[index - 1]), recipe.id);
    }
  }
});

test('pressure-assisted recipes preserve steps without water targets', () => {
  const scaled = scaleRecipe('aeropress-inverted', 27);
  assert.equal(scaled.water, Math.round(27 * 12.22));
  assert.equal(scaled.steps.find((recipeStep) => recipeStep.label === 'Fill').target, scaled.water);
  for (const label of ['Assemble inverted', 'Stir', 'Steep', 'Flip', 'Press']) {
    const recipeStep = scaled.steps.find((entry) => entry.label === label);
    assert.ok(recipeStep, label);
    assert.equal(Object.hasOwn(recipeStep, 'target'), false, label);
  }

  const timeline = getRecipeTimeline(scaled);
  const press = timeline.steps.find((recipeStep) => recipeStep.label === 'Press');
  assert.equal(press.action, 'press');
  assert.equal(press.target, null);
  assert.equal(press.targetKind, 'none');
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

test('recipe timelines expose elapsed-from-start boundaries and target ownership', () => {
  const timeline = getRecipeTimeline(scaleRecipe('v60-bright', 30));
  assert.equal(timeline.totalDuration, 180);
  assert.deepEqual(timeline.steps.map((step) => [step.startsAt, step.endsAt]), [
    [0, 45], [45, 80], [80, 115], [115, 180],
  ]);
  assert.deepEqual(timeline.steps.map((step) => step.targetKind), [
    'action', 'action', 'action', 'context',
  ]);
  assert.deepEqual(timeline.steps.map((step) => step.targetDelta), [90, 210, 200, 0]);
});

test('zero-duration actions have a boundary but never steal the running timer', () => {
  const recipe = {
    steps: [
      { label: 'Open valve', duration: 0, target: 0, preparation: 'Reach for the valve.' },
      { label: 'Pour', duration: 30, target: 100, preparation: 'Lift the kettle.' },
      { label: 'Wait', duration: 30, target: 100, preparation: 'Set the kettle down.' },
    ],
  };
  const timeline = getRecipeTimeline(recipe);
  assert.deepEqual(timeline.steps.map((step) => [step.startsAt, step.endsAt]), [
    [0, 0], [0, 30], [30, 60],
  ]);
  assert.equal(getBrewTiming(recipe, 0).currentStep.label, 'Pour');
  assert.equal(getBrewTiming(recipe, 30).currentStep.label, 'Wait');
});

test('brew timing retains next-step boundaries for an exact recipe', () => {
  const scaled = scaleRecipe('v60-bright', 30);
  const timing = getBrewTiming(scaled, 34);
  assert.equal(timing.stepIndex, 0);
  assert.equal(timing.nextStepIndex, 1);
  assert.equal(timing.nextStartsAt, 45);
  assert.equal(timing.secondsUntilNext, 11);
  assert.equal(timing.preparationLeadSeconds, DEFAULT_PREPARATION_LEAD_SECONDS);
  assert.equal(timing.currentStep.label, 'Bloom');
  assert.equal(timing.nextStep.label, 'First pour');
  assert.equal(timing.nextStep.targetKind, 'action');
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
  assert.equal(RECIPE_REVISIONS.length, 24);
  assert.equal(RECIPES.length, 24);
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

test('personal recipe objects use the same scaling, timer, and snapshot model', () => {
  const source = getRecipeRevision('aeropress-inverted@1');
  const personalRecipe = {
    ...source,
    id: 'personal-11111111-1111-4111-8111-111111111111',
    version: 3,
    revisionId: 'personal-11111111-1111-4111-8111-111111111111@3',
    publishedAt: '2026-09-17',
    title: 'My inverted AeroPress',
    equipment: 'AeroPress, metal filter, sturdy mug, scale, and paddle',
    notes: 'Use the metal filter for this coffee.',
    isPersonal: true,
    parentRecipe: {
      id: source.id,
      revisionId: source.revisionId,
      title: source.title,
      attribution: source.attribution.label,
    },
    tags: Object.fromEntries(Object.entries(source.tags).map(([key, values]) => [key, [...values]])),
    steps: source.steps.map((step) => ({ ...step })),
    attribution: { label: 'Your private recipe', kind: 'personal' },
  };
  const scaled = scaleRecipe(personalRecipe, 30);
  const timing = getBrewTiming(scaled, 70);
  const snapshot = createRecipeSnapshot(personalRecipe, 30);

  assert.equal(scaled.steps.find((step) => step.label === 'Fill').target, scaled.water);
  assert.equal(timing.currentStep.action, 'steep');
  assert.equal(snapshot.isPersonal, true);
  assert.equal(snapshot.equipment, personalRecipe.equipment);
  assert.equal(snapshot.notes, personalRecipe.notes);
  assert.deepEqual(snapshot.parentRecipe, personalRecipe.parentRecipe);
  assert.equal(snapshot.revisionId, personalRecipe.revisionId);
});
