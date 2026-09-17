'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const personal = require('../personal-recipe-store');
const { getRecipeRevision } = require('../public/recipes');

function validRecipe(overrides = {}) {
  return {
    methodId: 'v60',
    title: 'My bright V60',
    summary: 'A private starting point for a washed light roast.',
    result: 'A sweet, clear cup with a soft citrus finish.',
    defaultCoffee: 15,
    ratio: 16.67,
    temperature: '93°C',
    grind: 'Medium-fine, 18 clicks on my grinder',
    difficulty: 'Approachable',
    equipment: 'V60 02, paper filter, server, scale, and kettle',
    tags: {
      roast: ['light'],
      profile: ['sweet', 'high-clarity'],
      technique: ['percolation', 'pulse'],
      experience: ['forgiving'],
      serving: ['single-cup'],
    },
    steps: [
      { label: 'Bloom', action: 'pour', duration: 45, target: 45, instruction: 'Wet every ground.', preparation: 'Level the bed.' },
      { label: 'Main pour', action: 'pour', duration: 45, target: 250, instruction: 'Pour in slow circles.', preparation: 'Lift the kettle.' },
      { label: 'Draw down', action: 'drain', duration: 60, target: 250, instruction: 'Let the bed drain.', preparation: 'Set the kettle down.' },
    ],
    notes: 'Designed for the coffee I keep at home.',
    ...overrides,
  };
}

function databaseRow(overrides = {}) {
  return {
    id: 'personal-11111111-1111-4111-8111-111111111111',
    user_id: 7,
    username: 'brewer',
    parent_recipe_id: 'v60-bright',
    parent_recipe_revision_id: 'v60-bright@1',
    parent_title: 'Bright two-pour',
    parent_attribution: 'Pourover Coffee original',
    current_version: 1,
    archived_at: null,
    created_at: new Date('2026-09-17T12:00:00.000Z'),
    updated_at: new Date('2026-09-17T12:00:00.000Z'),
    version: 1,
    recipe_data: personal.normalizeRecipeInput(validRecipe()),
    revision_created_at: new Date('2026-09-17T12:00:00.000Z'),
    ...overrides,
  };
}

function recordingPool(responder) {
  const calls = [];
  const query = async (sql, values) => {
    calls.push({ sql, values });
    return responder ? responder(sql, values, calls) : { rows: [], rowCount: 0 };
  };
  return {
    calls,
    query,
    connect: async () => ({ query, release() {} }),
  };
}

test('personal recipe input normalizes a complete guided recipe', () => {
  const recipe = personal.normalizeRecipeInput(validRecipe());
  assert.equal(recipe.baseWater, 250);
  assert.equal(recipe.steps.at(-1).target, recipe.baseWater);
  assert.equal(recipe.steps[0].action, 'pour');
  assert.deepEqual(recipe.tags.roast, ['light']);
  assert.equal(recipe.notes, 'Designed for the coffee I keep at home.');
});

test('personal recipe validation rejects invalid timing, targets, actions, and tags', () => {
  assert.throws(
    () => personal.normalizeRecipeInput(validRecipe({ steps: [
      { label: 'Wait', action: 'wait', duration: 0, target: 250, instruction: 'Wait.', preparation: 'Settle in.' },
    ] })),
    /timed step/
  );
  assert.throws(
    () => personal.normalizeRecipeInput(validRecipe({ steps: [
      { label: 'Pour', action: 'pour', duration: 30, target: 200, instruction: 'Pour.', preparation: 'Lift the kettle.' },
      { label: 'Finish', action: 'drain', duration: 30, target: 150, instruction: 'Drain.', preparation: 'Set it down.' },
    ] })),
    /cannot be lower/
  );
  assert.throws(
    () => personal.normalizeRecipeInput(validRecipe({ steps: [
      { label: 'Press', action: 'squeeze', duration: 30, target: 250, instruction: 'Press.', preparation: 'Grip the brewer.' },
    ] })),
    /unsupported action/
  );
  assert.throws(
    () => personal.normalizeRecipeInput(validRecipe({ tags: { ...validRecipe().tags, roast: ['ultra-light'] } })),
    /supported roast tags/
  );
  assert.throws(
    () => personal.normalizeRecipeInput(validRecipe({ steps: [
      { label: 'Pour', action: 'pour', duration: 30, target: 240, instruction: 'Pour.', preparation: 'Lift the kettle.' },
    ] })),
    /final water target must equal.*250g/i
  );
});

test('personal recipe schema is idempotent, indexed by owner, and private', async () => {
  const pool = recordingPool();
  await personal.initializePersonalRecipes(pool);
  const schema = pool.calls.map((call) => call.sql).join('\n');
  assert.match(schema, /CREATE TABLE IF NOT EXISTS personal_recipes/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS personal_recipe_revisions/);
  assert.match(schema, /REFERENCES personal_recipes \(id\) ON DELETE CASCADE/);
  assert.match(schema, /COMMENT ON TABLE personal_recipes IS 'staging:private'/);
  assert.match(schema, /COMMENT ON TABLE personal_recipe_revisions IS 'staging:private'/);
  assert.match(schema, /ON personal_recipes \(user_id, archived_at, updated_at DESC, id\)/);
});

test('personal recipe reads are scoped to the authenticated user and exact revision', async () => {
  const pool = recordingPool(() => ({ rows: [databaseRow({ version: 2, current_version: 3 })] }));
  const recipe = await personal.getPersonalRecipe(
    pool, 7, 'personal-11111111-1111-4111-8111-111111111111@2'
  );
  assert.match(pool.calls[0].sql, /p\.user_id = \$1 AND p\.id = \$2/);
  assert.match(pool.calls[0].sql, /COALESCE\(\$3::integer, p\.current_version\)/);
  assert.deepEqual(pool.calls[0].values, [7, 'personal-11111111-1111-4111-8111-111111111111', 2]);
  assert.equal(recipe.revisionId, 'personal-11111111-1111-4111-8111-111111111111@2');
  assert.equal(recipe.parentRecipe.revisionId, 'v60-bright@1');
  assert.equal(recipe.attribution.label, 'Your private recipe');
});

test('editing appends an immutable revision and advances the stable recipe', async () => {
  let selectedVersion = 1;
  const pool = recordingPool((sql, values) => {
    if (/SELECT current_version/.test(sql)) return { rows: [{ current_version: 1 }] };
    if (/INSERT INTO personal_recipe_revisions/.test(sql)) selectedVersion = Number(values[2]);
    if (/SELECT p\.\*, r\.version/.test(sql)) {
      return { rows: [databaseRow({ version: selectedVersion, current_version: selectedVersion })] };
    }
    return { rows: [], rowCount: 1 };
  });
  const updated = await personal.updatePersonalRecipe(
    pool, 7, 'personal-11111111-1111-4111-8111-111111111111',
    validRecipe({ title: 'My bright V60, refined' })
  );
  const insert = pool.calls.find((call) => /INSERT INTO personal_recipe_revisions/.test(call.sql));
  const advance = pool.calls.find((call) => /SET current_version/.test(call.sql));
  assert.equal(insert.values[2], 2);
  assert.equal(JSON.parse(insert.values[3]).title, 'My bright V60, refined');
  assert.deepEqual(advance.values, ['personal-11111111-1111-4111-8111-111111111111', 7, 2]);
  assert.equal(updated.version, 2);
});

test('archive, restore, and delete never target another user or the journal', async () => {
  const pool = recordingPool((sql) => {
    if (/UPDATE personal_recipes/.test(sql)) return { rows: [{ id: databaseRow().id }], rowCount: 1 };
    if (/SELECT p\.\*, r\.version/.test(sql)) return { rows: [databaseRow()] };
    if (/DELETE FROM personal_recipes/.test(sql)) return { rows: [], rowCount: 1 };
    return { rows: [], rowCount: 0 };
  });
  await personal.setPersonalRecipeArchived(pool, 7, databaseRow().id, true);
  await personal.setPersonalRecipeArchived(pool, 7, databaseRow().id, false);
  assert.equal(await personal.deletePersonalRecipe(pool, 7, databaseRow().id), true);
  const mutations = pool.calls.filter((call) => /UPDATE personal_recipes|DELETE FROM personal_recipes/.test(call.sql));
  assert.ok(mutations.every((call) => /user_id = \$2/.test(call.sql)));
  assert.ok(!pool.calls.some((call) => /brew_journal_entries/.test(call.sql)));
});

test('a derived variant retains its exact source identity', () => {
  const source = getRecipeRevision('v60-bright@1');
  const row = databaseRow({
    parent_recipe_id: source.id,
    parent_recipe_revision_id: source.revisionId,
    parent_title: source.title,
    parent_attribution: source.attribution.label,
  });
  const recipe = personal.rowToRecipe(row);
  assert.deepEqual(recipe.parentRecipe, {
    id: 'v60-bright',
    revisionId: 'v60-bright@1',
    title: 'Bright two-pour',
    attribution: 'Pourover Coffee original',
  });
});
