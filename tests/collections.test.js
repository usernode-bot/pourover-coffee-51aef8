const test = require('node:test');
const assert = require('node:assert/strict');

const collections = require('../collection-store');

// A stub pool that records every statement and returns queued rows. Anything
// that connects for a transaction is handed the same recorder.
function recordingPool(responder) {
  const calls = [];
  const query = async (sql, values) => {
    calls.push({ sql, values });
    return (responder ? responder(sql, values) : { rows: [], rowCount: 0 });
  };
  return {
    calls,
    query,
    connect: async () => ({ query, release() {} }),
  };
}

test('shelf schema is idempotent, scoped by user, and explicitly private', async () => {
  const pool = recordingPool();
  await collections.initializeCollections(pool);
  const schema = pool.calls.map((call) => call.sql).join('\n');
  assert.match(schema, /CREATE TABLE IF NOT EXISTS recipe_favorites/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS user_collections/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS collection_recipes/);
  assert.match(schema, /PRIMARY KEY \(user_id, recipe_id\)/);
  // Every shelf table is private: a staging clone gets the schema, not a
  // person's saved recipes.
  for (const table of ['recipe_favorites', 'user_collections', 'collection_recipes']) {
    assert.match(schema, new RegExp(`COMMENT ON TABLE ${table} IS 'staging:private'`));
  }
  assert.match(schema, /ON DELETE CASCADE/);
});

test('collection names are trimmed, bounded, and never empty', () => {
  assert.equal(collections.normalizeCollectionName('  Morning   rotation '), 'Morning rotation');
  assert.throws(() => collections.normalizeCollectionName('   '), /name/i);
  assert.throws(() => collections.normalizeCollectionName('x'.repeat(61)), /60 characters/);
  assert.throws(() => collections.normalizeCollectionName(undefined), /name/i);
});

test('recipe ids are validated and collection ids must be safe integers', () => {
  assert.equal(collections.normalizeRecipeId('  v60-bright '), 'v60-bright');
  assert.throws(() => collections.normalizeRecipeId(''), /valid recipe/);
  assert.throws(() => collections.normalizeRecipeId('x'.repeat(121)), /valid recipe/);
  assert.equal(collections.parseCollectionId('12'), 12);
  assert.equal(collections.parseCollectionId('0'), null);
  assert.equal(collections.parseCollectionId('abc'), null);
  assert.equal(collections.parseCollectionId('-3'), null);
});

test('favorite add is idempotent and removal scopes to the owner', async () => {
  const pool = recordingPool(() => ({ rows: [], rowCount: 1 }));
  await collections.addFavorite(pool, 7, 'v60-bright');
  assert.match(pool.calls[0].sql, /INSERT INTO recipe_favorites/);
  assert.match(pool.calls[0].sql, /ON CONFLICT \(user_id, recipe_id\) DO NOTHING/);
  assert.deepEqual(pool.calls[0].values, [7, 'v60-bright']);

  pool.calls.length = 0;
  await collections.removeFavorite(pool, 7, 'v60-bright');
  assert.match(pool.calls[0].sql, /DELETE FROM recipe_favorites WHERE user_id = \$1 AND recipe_id = \$2/);
  assert.deepEqual(pool.calls[0].values, [7, 'v60-bright']);
});

test('favorites and collections are read only for the given user', async () => {
  const pool = recordingPool(() => ({ rows: [] }));
  await collections.listFavorites(pool, 7);
  await collections.listCollections(pool, 7);
  await collections.listRecentlyBrewed(pool, 7);
  assert.match(pool.calls[0].sql, /WHERE user_id = \$1/);
  assert.equal(pool.calls[0].values[0], 7);
  assert.match(pool.calls[1].sql, /WHERE c\.user_id = \$1/);
  assert.equal(pool.calls[1].values[0], 7);
  // "Recently brewed" is derived from the private journal, still user-scoped.
  assert.match(pool.calls[2].sql, /FROM brew_journal_entries/);
  assert.match(pool.calls[2].sql, /WHERE user_id = \$1/);
  assert.match(pool.calls[2].sql, /GROUP BY recipe_id/);
  assert.equal(pool.calls[2].values[0], 7);
});

test('collection membership stores the stable recipe id, so a new revision cannot orphan it', async () => {
  const pool = recordingPool((sql) => {
    if (/SELECT id FROM user_collections/.test(sql)) return { rows: [{ id: 3 }] };
    if (/COUNT\(\*\)/.test(sql)) return { rows: [{ total: 1 }] };
    return { rows: [] };
  });
  await collections.addRecipeToCollection(pool, 7, 3, 'v60-bright');
  const insert = pool.calls.find((call) => /INSERT INTO collection_recipes/.test(call.sql));
  assert.ok(insert, 'inserts a membership row');
  // The id column stores "v60-bright", never "v60-bright@2", which is what
  // keeps a favorite or collection entry valid across a revision bump.
  assert.deepEqual(insert.values, [3, 'v60-bright']);
  assert.match(insert.sql, /ON CONFLICT \(collection_id, recipe_id\) DO NOTHING/);
  assert.match(insert.sql, /MAX\(position\) \+ 1/);
});

test('adding a recipe to a collection the user does not own is refused', async () => {
  const pool = recordingPool(() => ({ rows: [] }));
  const result = await collections.addRecipeToCollection(pool, 7, 999, 'v60-bright');
  assert.equal(result, null);
  assert.ok(!pool.calls.some((call) => /INSERT INTO collection_recipes/.test(call.sql)));
});

test('reordering collection recipes rejects an order that does not match membership', async () => {
  const pool = recordingPool((sql) => {
    if (/SELECT id FROM user_collections/.test(sql)) return { rows: [{ id: 3 }] };
    if (/SELECT recipe_id FROM collection_recipes/.test(sql)) {
      return { rows: [{ recipe_id: 'v60-bright' }, { recipe_id: 'mugen-one-pour' }] };
    }
    return { rows: [], rowCount: 1 };
  });
  await assert.rejects(
    () => collections.reorderCollectionRecipes(pool, 7, 3, ['v60-bright']),
    /does not match the collection/
  );
  // A duplicate within the submitted order is refused before any write.
  await assert.rejects(
    () => collections.reorderCollectionRecipes(pool, 7, 3, ['v60-bright', 'v60-bright']),
    /only once/
  );
});

test('reordering collection recipes writes explicit positions in one transaction', async () => {
  const pool = recordingPool((sql) => {
    if (/SELECT id FROM user_collections/.test(sql)) return { rows: [{ id: 3 }] };
    if (/SELECT recipe_id FROM collection_recipes/.test(sql)) {
      return { rows: [{ recipe_id: 'v60-bright' }, { recipe_id: 'mugen-one-pour' }] };
    }
    if (/SELECT c\.id, c\.name/.test(sql)) {
      return { rows: [
        { id: 3, name: 'Shelf', position: 0, recipe_id: 'mugen-one-pour', recipe_position: 0 },
        { id: 3, name: 'Shelf', position: 0, recipe_id: 'v60-bright', recipe_position: 1 },
      ] };
    }
    return { rows: [], rowCount: 1 };
  });
  const collection = await collections.reorderCollectionRecipes(pool, 7, 3, ['mugen-one-pour', 'v60-bright']);
  const updates = pool.calls.filter((call) => /UPDATE collection_recipes SET position/.test(call.sql));
  assert.equal(updates.length, 2);
  assert.deepEqual(updates[0].values, [3, 'mugen-one-pour', 0]);
  assert.deepEqual(updates[1].values, [3, 'v60-bright', 1]);
  assert.equal(collection.recipeIds[0], 'mugen-one-pour');
});

test('deleting a collection removes it only for its owner', async () => {
  const pool = recordingPool(() => ({ rows: [], rowCount: 1 }));
  const deleted = await collections.deleteCollection(pool, 7, 3);
  assert.equal(deleted, true);
  assert.match(pool.calls[0].sql, /DELETE FROM user_collections WHERE id = \$1 AND user_id = \$2/);
  assert.deepEqual(pool.calls[0].values, [3, 7]);
  // It never touches the journal: removing a shelf leaves brew history alone.
  assert.ok(!pool.calls.some((call) => /brew_journal_entries/.test(call.sql)));
});

test('a per-user collection cap is enforced before insert', async () => {
  const pool = recordingPool((sql) => {
    if (/COUNT\(\*\)/.test(sql)) return { rows: [{ total: collections.MAX_COLLECTIONS_PER_USER }] };
    return { rows: [] };
  });
  await assert.rejects(
    () => collections.createCollection(pool, 7, 'One more'),
    /up to 50 collections/
  );
  assert.ok(!pool.calls.some((call) => /INSERT INTO user_collections/.test(call.sql)));
});
