const test = require('node:test');
const assert = require('node:assert/strict');

const shelf = require('../shelf-store');

function fakePool(handler) {
  const statements = [];
  const pool = {
    query: async (sql, values) => {
      statements.push({ sql, values });
      return handler(sql, values);
    },
  };
  return { pool, statements };
}

test('shelf schema is idempotent and every table is explicitly private', async () => {
  const { pool, statements } = fakePool(async () => ({ rows: [], rowCount: 0 }));
  await shelf.initializeShelf(pool);
  const schema = statements.map((entry) => entry.sql).join('\n');
  for (const table of ['recipe_favorites', 'recipe_collections', 'recipe_collection_items']) {
    assert.match(schema, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`));
    assert.match(schema, new RegExp(`COMMENT ON TABLE ${table} IS 'staging:private'`));
  }
  assert.match(schema, /recipe_collections_user_position_idx/);
  assert.match(schema, /recipe_collection_items_collection_position_idx/);
  assert.match(schema, /REFERENCES recipe_collections\(id\) ON DELETE CASCADE/);
});

test('shelf schema initialization is a no-op without a database', async () => {
  assert.equal(await shelf.initializeShelf(null), false);
});

test('collection names are trimmed, required, and length limited', () => {
  assert.equal(shelf.normalizeCollectionName('  Weekend   pours '), 'Weekend pours');
  assert.throws(() => shelf.normalizeCollectionName('   '), /Give this collection a name/);
  assert.throws(() => shelf.normalizeCollectionName(undefined), /Give this collection a name/);
  assert.throws(() => shelf.normalizeCollectionName('x'.repeat(61)), /60 characters or fewer/);
  assert.equal(shelf.normalizeCollectionName('y'.repeat(60)).length, 60);
});

test('positions accept zero and the append sentinel but reject anything else', () => {
  assert.equal(shelf.parsePosition(0), 0);
  assert.equal(shelf.parsePosition(3), 3);
  assert.equal(shelf.parsePosition(undefined), -1);
  assert.equal(shelf.parsePosition(''), -1);
  assert.equal(shelf.parsePosition(1.5), null);
  assert.equal(shelf.parsePosition(-2), null);
  assert.equal(shelf.parsePosition('later'), null);
});

test('ids are parsed as positive safe integers only', () => {
  assert.equal(shelf.parseUserId('42'), 42);
  assert.equal(shelf.parseUserId(-1), null);
  assert.equal(shelf.parseUserId('abc'), null);
  assert.equal(shelf.parseCollectionId(7), 7);
  assert.equal(shelf.parseCollectionId(0), null);
});

test('favorites are keyed by stable recipe id, so a later revision stays favorited', async () => {
  const { pool, statements } = fakePool(async (sql) => {
    if (sql.startsWith('SELECT 1')) return { rows: [{ '?column?': 1 }] };
    return { rows: [], rowCount: 1 };
  });
  assert.equal(await shelf.isFavorite(pool, 7, 'v60-bright'), true);
  await shelf.addFavorite(pool, 7, 'v60-bright');
  const insert = statements.find((entry) => entry.sql.includes('INSERT INTO recipe_favorites'));
  assert.deepEqual(insert.values, [7, 'v60-bright']);
  assert.doesNotMatch(insert.sql, /@\d/);
  assert.match(insert.sql, /ON CONFLICT \(user_id, recipe_id\) DO NOTHING/);
});

test('collection items are added at the end and de-duplicated', async () => {
  const { pool, statements } = fakePool(async (sql) => {
    if (sql.includes('COUNT(*)')) return { rows: [{ total: 0 }] };
    if (sql.includes('INSERT INTO recipe_collection_items')) return { rows: [{ id: 5 }] };
    return { rows: [], rowCount: 0 };
  });
  await shelf.addCollectionItem(pool, 7, 3, 'mugen-one-pour');
  const insert = statements.find((entry) => entry.sql.includes('INSERT INTO recipe_collection_items'));
  assert.match(insert.sql, /UNIQUE|ON CONFLICT \(collection_id, recipe_id\) DO NOTHING/);
  assert.match(insert.sql, /MAX\(position\)/);
});

test('deleting a collection removes only the grouping rows', async () => {
  const { pool, statements } = fakePool(async () => ({ rows: [], rowCount: 1 }));
  assert.equal(await shelf.deleteCollection(pool, 7, 3), true);
  const del = statements.find((entry) => entry.sql.includes('DELETE'));
  assert.equal(del.sql.trim(), 'DELETE FROM recipe_collections WHERE id = $1 AND user_id = $2');
  // Nothing that touches recipes or brew history is issued.
  assert.ok(!statements.some((entry) => /brew_journal_entries/.test(entry.sql)));
  assert.ok(!statements.some((entry) => /DELETE FROM recipe_collection_items/.test(entry.sql)));
});

test('reorder rejects a list that does not match the collection exactly', async () => {
  const { pool } = fakePool(async (sql) => {
    if (sql.includes('SELECT id, recipe_id')) {
      return { rows: [
        { id: 1, recipe_id: 'a', position: 0, created_at: new Date() },
        { id: 2, recipe_id: 'b', position: 1, created_at: new Date() },
      ] };
    }
    return { rows: [], rowCount: 0 };
  });
  await assert.rejects(() => shelf.reorderCollectionItems(pool, 7, 3, ['a']), /does not match this collection/);
  await assert.rejects(() => shelf.reorderCollectionItems(pool, 7, 3, ['a', 'x']), /does not match this collection/);
  await assert.rejects(() => shelf.reorderCollectionItems(pool, 7, 3, []), /Send the recipe order/);
});

test('collection reorder rejects a list that is not the whole shelf', async () => {
  const { pool } = fakePool(async (sql) => {
    if (sql.includes('SELECT id FROM recipe_collections')) {
      return { rows: [{ id: 1 }, { id: 2 }] };
    }
    return { rows: [], rowCount: 0 };
  });
  await assert.rejects(() => shelf.reorderCollections(pool, 7, [1]), /does not match your shelf/);
  await assert.rejects(() => shelf.reorderCollections(pool, 7, [1, 9]), /does not match your shelf/);
});

test('the shelf model reports favorites, collections, membership, and recent brews', async () => {
  const { pool } = fakePool(async (sql) => {
    if (sql.includes('FROM recipe_favorites')) {
      return { rows: [{ recipe_id: 'v60-bright', created_at: new Date() }] };
    }
    if (sql.includes('COUNT(i.id)')) {
      return { rows: [{ id: 1, name: 'Weekend pours', position: 0, item_count: 2, created_at: new Date(), updated_at: new Date() }] };
    }
    if (sql.includes('JOIN recipe_collections c')) {
      return { rows: [{ collection_id: 1, collection_name: 'Weekend pours', collection_position: 0, recipe_id: 'v60-bright', position: 0 }] };
    }
    if (sql.includes('FROM brew_journal_entries')) {
      return { rows: [{ recipe_id: 'v60-sweet-pulse', last_brewed_at: new Date('2026-09-15T13:30:00Z'), brew_count: 3 }] };
    }
    return { rows: [] };
  });
  const model = await shelf.loadShelf(pool, 7);
  assert.deepEqual(model.favorites, ['v60-bright']);
  assert.equal(model.collections[0].name, 'Weekend pours');
  assert.equal(model.memberships[0].recipeId, 'v60-bright');
  assert.equal(model.recentlyBrewed[0].brewCount, 3);
  assert.equal(model.recentlyBrewed[0].lastBrewedAt, '2026-09-15T13:30:00.000Z');
});

test('a missing collection loads as null rather than throwing', async () => {
  const { pool } = fakePool(async () => ({ rows: [] }));
  assert.equal(await shelf.loadCollection(pool, 7, 3), null);
  assert.equal(await shelf.getCollection(pool, 7, 3), null);
  assert.equal(await shelf.renameCollection(pool, 7, 3, 'Name'), null);
});
