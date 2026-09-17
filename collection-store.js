'use strict';

// Recipe favorites and personal collections.
//
// Both are a person's private shelf, so every table here is marked
// `staging:private` and every query is scoped to the verified Homeroom user
// id. Recipe membership is keyed by the *stable* recipe id, never by
// `<id>@<version>`, so a recipe that later gains a revision stays favorited
// and stays in its collections. The API resolves the stable id to the latest
// revision at render time and simply drops ids that no longer exist.

const MAX_COLLECTION_NAME = 60;
const MAX_COLLECTIONS_PER_USER = 50;
const MAX_RECIPES_PER_COLLECTION = 200;
const RECENT_LIMIT = 20;

class CollectionValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'CollectionValidationError';
    this.status = 400;
  }
}

function normalizeRecipeId(value) {
  const recipeId = typeof value === 'string' ? value.trim() : '';
  if (!recipeId || recipeId.length > 120) {
    throw new CollectionValidationError('Choose a valid recipe.');
  }
  return recipeId;
}

function normalizeCollectionName(value) {
  const name = typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
  if (!name) throw new CollectionValidationError('Give the collection a name.');
  if (name.length > MAX_COLLECTION_NAME) {
    throw new CollectionValidationError(`Collection names must be ${MAX_COLLECTION_NAME} characters or fewer.`);
  }
  return name;
}

function parseCollectionId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function normalizeRecipeIdList(value) {
  if (!Array.isArray(value)) {
    throw new CollectionValidationError('Send the recipes in their new order.');
  }
  const ids = value.map(normalizeRecipeId);
  if (ids.length > MAX_RECIPES_PER_COLLECTION) {
    throw new CollectionValidationError('That is more recipes than a collection can hold.');
  }
  if (new Set(ids).size !== ids.length) {
    throw new CollectionValidationError('A recipe can appear only once in a collection.');
  }
  return ids;
}

async function initializeCollections(pool) {
  if (!pool) return false;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS recipe_favorites (
      user_id BIGINT NOT NULL,
      recipe_id TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_id, recipe_id)
    )
  `);
  await pool.query("COMMENT ON TABLE recipe_favorites IS 'staging:private'");
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_collections (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL,
      name TEXT NOT NULL,
      position INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query("COMMENT ON TABLE user_collections IS 'staging:private'");
  await pool.query(`
    CREATE TABLE IF NOT EXISTS collection_recipes (
      collection_id BIGINT NOT NULL REFERENCES user_collections (id) ON DELETE CASCADE,
      recipe_id TEXT NOT NULL,
      position INTEGER NOT NULL DEFAULT 0,
      added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (collection_id, recipe_id)
    )
  `);
  await pool.query("COMMENT ON TABLE collection_recipes IS 'staging:private'");
  await pool.query(`
    CREATE INDEX IF NOT EXISTS user_collections_user_position_idx
    ON user_collections (user_id, position, id)
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS collection_recipes_order_idx
    ON collection_recipes (collection_id, position, recipe_id)
  `);
  return true;
}

async function listFavorites(pool, userId) {
  const { rows } = await pool.query(
    'SELECT recipe_id FROM recipe_favorites WHERE user_id = $1 ORDER BY created_at DESC, recipe_id ASC',
    [userId]
  );
  return rows.map((row) => row.recipe_id);
}

async function isFavorite(pool, userId, recipeId) {
  const { rows } = await pool.query(
    'SELECT 1 FROM recipe_favorites WHERE user_id = $1 AND recipe_id = $2 LIMIT 1',
    [userId, recipeId]
  );
  return rows.length > 0;
}

async function addFavorite(pool, userId, recipeId) {
  await pool.query(
    `INSERT INTO recipe_favorites (user_id, recipe_id) VALUES ($1, $2)
     ON CONFLICT (user_id, recipe_id) DO NOTHING`,
    [userId, recipeId]
  );
  return true;
}

async function removeFavorite(pool, userId, recipeId) {
  const result = await pool.query(
    'DELETE FROM recipe_favorites WHERE user_id = $1 AND recipe_id = $2',
    [userId, recipeId]
  );
  return result.rowCount > 0;
}

// The most recent brew per recipe, newest first. Derived from the private
// brew journal, so a shelf can rank recipes without a second user table.
async function listRecentlyBrewed(pool, userId, limit = RECENT_LIMIT) {
  const { rows } = await pool.query(
    `SELECT recipe_id, MAX(brewed_at) AS last_brewed
     FROM brew_journal_entries
     WHERE user_id = $1
     GROUP BY recipe_id
     ORDER BY last_brewed DESC, recipe_id ASC
     LIMIT $2`,
    [userId, Math.max(1, Math.min(limit, RECENT_LIMIT))]
  );
  return rows.map((row) => row.recipe_id);
}

async function listCollections(pool, userId) {
  const { rows } = await pool.query(
    `SELECT c.id, c.name, c.position, r.recipe_id, r.position AS recipe_position
     FROM user_collections c
     LEFT JOIN collection_recipes r ON r.collection_id = c.id
     WHERE c.user_id = $1
     ORDER BY c.position ASC, c.id ASC, r.position ASC, r.recipe_id ASC`,
    [userId]
  );
  const collections = new Map();
  for (const row of rows) {
    const id = Number(row.id);
    if (!collections.has(id)) {
      collections.set(id, { id, name: row.name, position: row.position, recipeIds: [] });
    }
    if (row.recipe_id) collections.get(id).recipeIds.push(row.recipe_id);
  }
  return [...collections.values()];
}

async function getCollection(pool, userId, collectionId) {
  const all = await listCollections(pool, userId);
  return all.find((collection) => collection.id === collectionId) || null;
}

async function createCollection(pool, userId, name) {
  const normalized = normalizeCollectionName(name);
  const { rows: countRows } = await pool.query(
    'SELECT COUNT(*)::int AS total FROM user_collections WHERE user_id = $1',
    [userId]
  );
  if (countRows[0].total >= MAX_COLLECTIONS_PER_USER) {
    throw new CollectionValidationError(`You can keep up to ${MAX_COLLECTIONS_PER_USER} collections.`);
  }
  const { rows } = await pool.query(
    `INSERT INTO user_collections (user_id, name, position)
     VALUES ($1, $2, COALESCE((SELECT MAX(position) + 1 FROM user_collections WHERE user_id = $1), 0))
     RETURNING id, name, position`,
    [userId, normalized]
  );
  return { id: Number(rows[0].id), name: rows[0].name, position: rows[0].position, recipeIds: [] };
}

async function renameCollection(pool, userId, collectionId, name) {
  const normalized = normalizeCollectionName(name);
  const { rows } = await pool.query(
    `UPDATE user_collections SET name = $3, updated_at = NOW()
     WHERE id = $1 AND user_id = $2
     RETURNING id, name, position`,
    [collectionId, userId, normalized]
  );
  if (!rows.length) return null;
  return { id: Number(rows[0].id), name: rows[0].name, position: rows[0].position };
}

// Rewrites positions from a caller-supplied order. Ids that the user does not
// own are ignored rather than erroring, so a stale client cannot clobber a
// shelf it no longer sees.
async function reorderCollections(pool, userId, ids) {
  if (!Array.isArray(ids) || ids.length > MAX_COLLECTIONS_PER_USER) {
    throw new CollectionValidationError('Send the collections in their new order.');
  }
  const ordered = ids.map(parseCollectionId).filter((id) => id !== null);
  if (new Set(ordered).size !== ordered.length) {
    throw new CollectionValidationError('Send each collection once.');
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (let index = 0; index < ordered.length; index += 1) {
      await client.query(
        'UPDATE user_collections SET position = $3, updated_at = NOW() WHERE id = $1 AND user_id = $2',
        [ordered[index], userId, index]
      );
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
  return listCollections(pool, userId);
}

// Deleting a collection removes only its membership rows (via ON DELETE
// CASCADE). Recipes and brew history live in other tables and are untouched.
async function deleteCollection(pool, userId, collectionId) {
  const result = await pool.query(
    'DELETE FROM user_collections WHERE id = $1 AND user_id = $2',
    [collectionId, userId]
  );
  return result.rowCount > 0;
}

async function addRecipeToCollection(pool, userId, collectionId, recipeId) {
  const normalized = normalizeRecipeId(recipeId);
  const { rows: owned } = await pool.query(
    'SELECT id FROM user_collections WHERE id = $1 AND user_id = $2',
    [collectionId, userId]
  );
  if (!owned.length) return null;
  const { rows: countRows } = await pool.query(
    'SELECT COUNT(*)::int AS total FROM collection_recipes WHERE collection_id = $1',
    [collectionId]
  );
  if (countRows[0].total >= MAX_RECIPES_PER_COLLECTION) {
    throw new CollectionValidationError(`A collection can hold up to ${MAX_RECIPES_PER_COLLECTION} recipes.`);
  }
  await pool.query(
    `INSERT INTO collection_recipes (collection_id, recipe_id, position)
     VALUES ($1, $2, COALESCE((SELECT MAX(position) + 1 FROM collection_recipes WHERE collection_id = $1), 0))
     ON CONFLICT (collection_id, recipe_id) DO NOTHING`,
    [collectionId, normalized]
  );
  await pool.query('UPDATE user_collections SET updated_at = NOW() WHERE id = $1', [collectionId]);
  return getCollection(pool, userId, collectionId);
}

async function removeRecipeFromCollection(pool, userId, collectionId, recipeId) {
  const normalized = normalizeRecipeId(recipeId);
  const { rows: owned } = await pool.query(
    'SELECT id FROM user_collections WHERE id = $1 AND user_id = $2',
    [collectionId, userId]
  );
  if (!owned.length) return null;
  await pool.query(
    'DELETE FROM collection_recipes WHERE collection_id = $1 AND recipe_id = $2',
    [collectionId, normalized]
  );
  await pool.query('UPDATE user_collections SET updated_at = NOW() WHERE id = $1', [collectionId]);
  return getCollection(pool, userId, collectionId);
}

// Order is preserved explicitly in a position column, so it survives both a
// revisit and a recipe receiving a new revision.
async function reorderCollectionRecipes(pool, userId, collectionId, recipeIds) {
  const ordered = normalizeRecipeIdList(recipeIds);
  const { rows: owned } = await pool.query(
    'SELECT id FROM user_collections WHERE id = $1 AND user_id = $2',
    [collectionId, userId]
  );
  if (!owned.length) return null;
  const { rows: members } = await pool.query(
    'SELECT recipe_id FROM collection_recipes WHERE collection_id = $1',
    [collectionId]
  );
  const membership = new Set(members.map((row) => row.recipe_id));
  if (ordered.length !== membership.size || ordered.some((id) => !membership.has(id))) {
    throw new CollectionValidationError('That order does not match the collection.');
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (let index = 0; index < ordered.length; index += 1) {
      await client.query(
        'UPDATE collection_recipes SET position = $3 WHERE collection_id = $1 AND recipe_id = $2',
        [collectionId, ordered[index], index]
      );
    }
    await client.query('UPDATE user_collections SET updated_at = NOW() WHERE id = $1', [collectionId]);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
  return getCollection(pool, userId, collectionId);
}

async function loadShelf(pool, userId) {
  const [favorites, collections, recentlyBrewed] = await Promise.all([
    listFavorites(pool, userId),
    listCollections(pool, userId),
    listRecentlyBrewed(pool, userId),
  ]);
  return { favorites, collections, recentlyBrewed };
}

module.exports = {
  MAX_COLLECTION_NAME,
  MAX_COLLECTIONS_PER_USER,
  MAX_RECIPES_PER_COLLECTION,
  RECENT_LIMIT,
  CollectionValidationError,
  addFavorite,
  addRecipeToCollection,
  createCollection,
  deleteCollection,
  getCollection,
  initializeCollections,
  isFavorite,
  listCollections,
  listFavorites,
  listRecentlyBrewed,
  loadShelf,
  normalizeCollectionName,
  normalizeRecipeId,
  parseCollectionId,
  removeFavorite,
  removeRecipeFromCollection,
  renameCollection,
  reorderCollectionRecipes,
  reorderCollections,
};
