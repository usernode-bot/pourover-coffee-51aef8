const test = require('node:test');
const assert = require('node:assert/strict');

const journal = require('../journal-store');
const { createRecipeSnapshot } = require('../public/recipes');

function databaseRow(overrides = {}) {
  return {
    id: 42,
    user_id: 7,
    username: 'brewer',
    source: 'guided',
    brewed_at: new Date('2026-09-15T13:30:00.000Z'),
    recipe_id: 'v60-sweet-pulse',
    recipe_version: 1,
    recipe_revision_id: 'v60-sweet-pulse@1',
    recipe_snapshot: createRecipeSnapshot('v60-sweet-pulse@1', 21),
    coffee_name: 'Finca El Jardín',
    roaster: 'Example Roaster',
    process: 'Washed',
    roast_date: '2026-09-04',
    grinder: 'Hand grinder',
    grind_setting: '18 clicks',
    water: 'Filtered',
    gear: 'V60 02',
    sweetness: 5,
    acidity: 4,
    body: 3,
    clarity: 4,
    overall: 5,
    notes: 'Honeyed and clear.',
    change_next_time: 'Try one click coarser.',
    created_at: new Date('2026-09-15T13:35:00.000Z'),
    updated_at: new Date('2026-09-15T13:35:00.000Z'),
    ...overrides,
  };
}

test('journal create input validates the recipe, dose, dates, ratings, and field lengths', () => {
  const input = journal.normalizeCreateInput({
    recipeId: 'v60-sweet-pulse',
    recipeVersion: 1,
    coffee: 21,
    source: 'guided',
    brewedAt: '2026-09-15T13:30:00.000Z',
    roastDate: '2026-09-04',
    sweetness: '5',
    notes: '  Honeyed and clear.  ',
  });
  assert.equal(input.recipeId, 'v60-sweet-pulse');
  assert.equal(input.recipeVersion, 1);
  assert.equal(input.coffee, 21);
  assert.equal(input.source, 'guided');
  assert.equal(input.brewedAt, '2026-09-15T13:30:00.000Z');
  assert.equal(input.roastDate, '2026-09-04');
  assert.equal(input.sweetness, 5);
  assert.equal(input.notes, 'Honeyed and clear.');

  assert.throws(() => journal.normalizeCreateInput({ recipeId: 'x', recipeVersion: 1, coffee: 4 }), /5g to 60g/);
  assert.throws(() => journal.normalizeCreateInput({ recipeId: 'x', recipeVersion: 1, coffee: 20, overall: 6 }), /1 to 5/);
  assert.throws(() => journal.normalizeCreateInput({ recipeId: 'x', recipeVersion: 1, coffee: 20, roastDate: '09\/04\/2026' }), /YYYY-MM-DD/);
  assert.throws(() => journal.normalizeCreateInput({ recipeId: 'x', recipeVersion: 1, coffee: 20, notes: 'x'.repeat(2001) }), /2000 characters/);
});

test('journal schema is idempotent, indexed per user, and explicitly private', async () => {
  const statements = [];
  const pool = { query: async (sql) => { statements.push(sql); return { rows: [] }; } };
  await journal.initializeJournal(pool);
  const schema = statements.join('\n');
  assert.match(schema, /CREATE TABLE IF NOT EXISTS brew_journal_entries/);
  assert.match(schema, /COMMENT ON TABLE brew_journal_entries IS 'staging:private'/);
  assert.match(schema, /CREATE INDEX IF NOT EXISTS brew_journal_entries_user_brewed_idx/);
  assert.match(schema, /user_id, brewed_at DESC/);
  assert.match(schema, /ADD COLUMN IF NOT EXISTS coffee_id BIGINT/);
  assert.match(schema, /ADD COLUMN IF NOT EXISTS coffee_snapshot JSONB/);
  assert.match(schema, /CREATE INDEX IF NOT EXISTS brew_journal_entries_user_coffee_idx/);
  assert.match(schema, /user_id, coffee_id, brewed_at DESC/);
});

test('journal create input accepts an optional saved coffee id', () => {
  const withCoffee = journal.normalizeCreateInput({
    recipeId: 'v60-sweet-pulse', recipeVersion: 1, coffee: 21, coffeeId: '12',
  });
  assert.equal(withCoffee.coffeeId, 12);
  const withoutCoffee = journal.normalizeCreateInput({
    recipeId: 'v60-sweet-pulse', recipeVersion: 1, coffee: 21,
  });
  assert.equal(withoutCoffee.coffeeId, null);
  assert.equal(journal.normalizeCreateInput({
    recipeId: 'v60-sweet-pulse', recipeVersion: 1, coffee: 21, coffeeId: null,
  }).coffeeId, null);
  assert.throws(
    () => journal.normalizeCreateInput({ recipeId: 'v60-sweet-pulse', recipeVersion: 1, coffee: 21, coffeeId: -1 }),
    /valid saved coffee/
  );
});

test('journal update input ignores the coffee linkage entirely', () => {
  const input = journal.normalizeUpdateInput({ notes: 'Clearer when cool.', coffeeId: 99 });
  assert.equal(input.notes, 'Clearer when cool.');
  assert.equal(input.coffeeId, undefined);
  assert.ok(!('coffeeId' in input));
});

test('journal reads, edits, and deletes are always scoped to the authenticated user', async () => {
  const calls = [];
  const pool = {
    query: async (sql, values) => {
      calls.push({ sql, values });
      if (/DELETE/.test(sql)) return { rowCount: 1, rows: [] };
      return { rows: [databaseRow()] };
    },
  };

  await journal.listEntries(pool, 7, { methodId: 'v60', recipeId: 'v60-sweet-pulse', q: 'honey' });
  await journal.listEntries(pool, 7, { coffeeId: 12 });
  assert.match(calls[1].sql, /coffee_id = \$2/);
  assert.deepEqual(calls[1].values, [7, 12]);
  await journal.getEntry(pool, 7, 42);
  await journal.updateEntry(pool, 7, 42, { notes: 'Clearer when cool.' });
  await journal.deleteEntry(pool, 7, 42);

  assert.match(calls[0].sql, /WHERE user_id = \$1/);
  assert.deepEqual(calls[0].values, [7, 'v60', 'v60-sweet-pulse', '%honey%']);
  assert.match(calls[2].sql, /id = \$1 AND user_id = \$2/);
  assert.deepEqual(calls[2].values, [42, 7]);
  assert.match(calls[3].sql, /WHERE id = \$1 AND user_id = \$2/);
  assert.deepEqual(calls[3].values.slice(0, 2), [42, 7]);
  assert.match(calls[4].sql, /WHERE id = \$1 AND user_id = \$2/);
  assert.deepEqual(calls[4].values, [42, 7]);
});

test('creating a journal entry stores the coffee id and snapshot when a saved coffee is chosen', async () => {
  let insert;
  const snapshot = createRecipeSnapshot('v60-sweet-pulse@1', 21);
  const pool = {
    query: async (sql, values) => {
      insert = { sql, values };
      return { rows: [databaseRow({ recipe_snapshot: snapshot })] };
    },
  };
  const input = journal.normalizeCreateInput({
    recipeId: snapshot.id, recipeVersion: snapshot.version, coffee: 21, coffeeId: 12,
  });
  await journal.createEntry(pool, { id: 7, username: 'brewer' }, input, snapshot, {
    id: 12, name: 'Finca El Jardín', roaster: 'Example Roaster',
  });
  assert.match(insert.sql, /coffee_id, coffee_snapshot/);
  assert.equal(insert.values[23], 12);
  assert.deepEqual(JSON.parse(insert.values[24]).name, 'Finca El Jardín');
});

test('creating a journal entry without a saved coffee leaves both coffee columns out', async () => {
  let insert;
  const snapshot = createRecipeSnapshot('v60-sweet-pulse@1', 21);
  const pool = {
    query: async (sql, values) => {
      insert = { sql, values };
      return { rows: [databaseRow({ recipe_snapshot: snapshot })] };
    },
  };
  const input = journal.normalizeCreateInput({ recipeId: snapshot.id, recipeVersion: snapshot.version, coffee: 21 });
  await journal.createEntry(pool, { id: 7, username: 'brewer' }, input, snapshot);
  assert.ok(!/coffee_id/.test(insert.sql));
  assert.equal(insert.values.length, 23);
});

test('updating a journal entry never includes the coffee columns in its assignments', async () => {
  let sql;
  const pool = {
    query: async (statement) => {
      sql = statement;
      return { rows: [databaseRow()] };
    },
  };
  await journal.updateEntry(pool, 7, 42, {
    notes: 'Clearer when cool.', coffeeName: 'Different bag', coffeeId: 99,
  });
  assert.ok(!/coffee_id/.test(sql));
  assert.match(sql, /notes = \$/);
  // The free-text coffee name stays editable; the immutable linkage does not.
  assert.match(sql, /coffee_name = \$/);
});

test('creating a journal entry stores the immutable recipe identity and snapshot JSON', async () => {
  let insert;
  const snapshot = createRecipeSnapshot('v60-sweet-pulse@1', 21);
  const pool = {
    query: async (sql, values) => {
      insert = { sql, values };
      return { rows: [databaseRow({ recipe_snapshot: snapshot })] };
    },
  };
  const input = journal.normalizeCreateInput({
    recipeId: snapshot.id,
    recipeVersion: snapshot.version,
    coffee: snapshot.coffee,
    source: 'guided',
    brewedAt: '2026-09-15T13:30:00.000Z',
  });
  const entry = await journal.createEntry(pool, { id: 7, username: 'brewer' }, input, snapshot);
  assert.match(insert.sql, /recipe_id, recipe_version/);
  assert.equal(insert.values[4], snapshot.id);
  assert.equal(insert.values[5], snapshot.version);
  assert.equal(insert.values[6], snapshot.revisionId);
  assert.deepEqual(JSON.parse(insert.values[7]), snapshot);
  assert.equal(entry.recipeRevisionId, 'v60-sweet-pulse@1');
});
