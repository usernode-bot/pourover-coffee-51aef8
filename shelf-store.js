'use strict';

// Personal shelf storage: favorites, collections, and collection membership.
//
// Everything here is scoped to one Homeroom user id. Recipes are referenced by
// their stable recipe id (never a revision id) so a favorite or a collection
// item survives the recipe being revised. Rows are written lazily: a user row
// appears the first time that user saves something.

const COLLECTION_NAME_MAX = 60;
const MAX_COLLECTIONS_PER_USER = 100;
const MAX_ITEMS_PER_COLLECTION = 200;

class ShelfValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ShelfValidationError';
    this.status = 400;
  }
}

function parseUserId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function normalizeCollectionName(value) {
  if (value === undefined || value === null) {
    throw new ShelfValidationError('Give this collection a name.');
  }
  const name = String(value).replace(/\s+/g, ' ').trim();
  if (!name) throw new ShelfValidationError('Give this collection a name.');
  if (name.length > COLLECTION_NAME_MAX) {
    throw new ShelfValidationError(`Collection names must be ${COLLECTION_NAME_MAX} characters or fewer.`);
  }
  return name;
}

function parseCollectionId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

// A position of -1 means "append to the end" when a recipe joins a collection.
// -1 is the sentinel for "append to the end"; 0 and up are real slots.
function parsePosition(value) {
  if (value === undefined || value === null || value === '') return -1;
  const id = Number(value);
  return Number.isSafeInteger(id) && id >= -1 ? id : null;
}

async function initializeShelf(pool) {
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
    CREATE TABLE IF NOT EXISTS recipe_collections (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL,
      name TEXT NOT NULL,
      position INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query("COMMENT ON TABLE recipe_collections IS 'staging:private'");
  await pool.query(`
    CREATE INDEX IF NOT EXISTS recipe_collections_user_position_idx
    ON recipe_collections (user_id, position, id)
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS recipe_collection_items (
      id BIGSERIAL PRIMARY KEY,
      collection_id BIGINT NOT NULL REFERENCES recipe_collections(id) ON DELETE CASCADE,
      user_id BIGINT NOT NULL,
      recipe_id TEXT NOT NULL,
      position INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (collection_id, recipe_id)
    )
  `);
  await pool.query("COMMENT ON TABLE recipe_collection_items IS 'staging:private'");
  await pool.query(`
    CREATE INDEX IF NOT EXISTS recipe_collection_items_collection_position_idx
    ON recipe_collection_items (collection_id, position, id)
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS recipe_collection_items_user_recipe_idx
    ON recipe_collection_items (user_id, recipe_id)
  `);
  return true;
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
  await pool.query(
    'DELETE FROM recipe_favorites WHERE user_id = $1 AND recipe_id = $2',
    [userId, recipeId]
  );
  return false;
}

async function listCollections(pool, userId) {
  const { rows } = await pool.query(
    `SELECT c.id, c.name, c.position, c.created_at, c.updated_at,
            COUNT(i.id)::int AS item_count
     FROM recipe_collections c
     LEFT JOIN recipe_collection_items i ON i.collection_id = c.id
     WHERE c.user_id = $1
     GROUP BY c.id
     ORDER BY c.position ASC, c.id ASC`,
    [userId]
  );
  return rows.map((row) => ({
    id: Number(row.id),
    name: row.name,
    position: row.position,
    itemCount: row.item_count,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  }));
}

async function getCollection(pool, userId, collectionId) {
  const { rows } = await pool.query(
    'SELECT id, name, position, created_at, updated_at FROM recipe_collections WHERE id = $1 AND user_id = $2 LIMIT 1',
    [collectionId, userId]
  );
  const row = rows[0];
  if (!row) return null;
  return {
    id: Number(row.id),
    name: row.name,
    position: row.position,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

async function createCollection(pool, userId, name) {
  const collectionName = normalizeCollectionName(name);
  const { rows: countRows } = await pool.query(
    'SELECT COUNT(*)::int AS total FROM recipe_collections WHERE user_id = $1',
    [userId]
  );
  if (countRows[0].total >= MAX_COLLECTIONS_PER_USER) {
    throw new ShelfValidationError(`You can keep up to ${MAX_COLLECTIONS_PER_USER} collections.`);
  }
  const { rows } = await pool.query(
    `INSERT INTO recipe_collections (user_id, name, position)
     VALUES ($1, $2, (SELECT COALESCE(MAX(position), -1) + 1 FROM recipe_collections WHERE user_id = $1))
     RETURNING id, name, position, created_at, updated_at`,
    [userId, collectionName]
  );
  const row = rows[0];
  return {
    id: Number(row.id),
    name: row.name,
    position: row.position,
    itemCount: 0,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

async function renameCollection(pool, userId, collectionId, name) {
  const collectionName = normalizeCollectionName(name);
  const { rows } = await pool.query(
    `UPDATE recipe_collections SET name = $3, updated_at = NOW()
     WHERE id = $1 AND user_id = $2
     RETURNING id, name, position, created_at, updated_at`,
    [collectionId, userId, collectionName]
  );
  const row = rows[0];
  if (!row) return null;
  return {
    id: Number(row.id),
    name: row.name,
    position: row.position,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

// Deleting a collection removes only the shelf rows themselves. Recipes are
// static app content and brew journal entries live in their own table, so
// neither is touched here.
async function deleteCollection(pool, userId, collectionId) {
  const result = await pool.query(
    'DELETE FROM recipe_collections WHERE id = $1 AND user_id = $2',
    [collectionId, userId]
  );
  return result.rowCount > 0;
}

async function reorderCollections(pool, userId, orderedIds) {
  const ids = [];
  for (const value of Array.isArray(orderedIds) ? orderedIds : []) {
    const id = parseCollectionId(value);
    if (id && !ids.includes(id)) ids.push(id);
  }
  if (!ids.length) throw new ShelfValidationError('Send the collection order you want to keep.');
  const { rows } = await pool.query(
    'SELECT id FROM recipe_collections WHERE user_id = $1 ORDER BY position ASC, id ASC',
    [userId]
  );
  const owned = rows.map((row) => Number(row.id));
  if (owned.length !== ids.length || !owned.every((id) => ids.includes(id))) {
    throw new ShelfValidationError('That collection order does not match your shelf.');
  }
  await pool.query(
    `UPDATE recipe_collections AS c
     SET position = ordered.position, updated_at = NOW()
     FROM (SELECT id, position - 1 AS position
           FROM UNNEST($2::bigint[]) WITH ORDINALITY AS t(id, position)) AS ordered
     WHERE c.id = ordered.id AND c.user_id = $1`,
    [userId, ids]
  );
  return listCollections(pool, userId);
}

async function getCollectionItems(pool, userId, collectionId) {
  const { rows } = await pool.query(
    `SELECT i.id, i.recipe_id, i.position, i.created_at
     FROM recipe_collection_items i
     WHERE i.collection_id = $1 AND i.user_id = $2
     ORDER BY i.position ASC, i.id ASC`,
    [collectionId, userId]
  );
  return rows.map((row) => ({
    id: Number(row.id),
    recipeId: row.recipe_id,
    position: row.position,
    createdAt: new Date(row.created_at).toISOString(),
  }));
}

async function addCollectionItem(pool, userId, collectionId, recipeId, position = -1) {
  const { rows: countRows } = await pool.query(
    'SELECT COUNT(*)::int AS total FROM recipe_collection_items WHERE collection_id = $1 AND user_id = $2',
    [collectionId, userId]
  );
  if (countRows[0].total >= MAX_ITEMS_PER_COLLECTION) {
    throw new ShelfValidationError(`A collection can hold up to ${MAX_ITEMS_PER_COLLECTION} recipes.`);
  }
  const requested = parsePosition(position);
  if (requested === null) throw new ShelfValidationError('Choose a valid position for that recipe.');
  const { rows } = await pool.query(
    `INSERT INTO recipe_collection_items (collection_id, user_id, recipe_id, position)
     VALUES ($1, $2, $3, CASE WHEN $4 < 0
       THEN (SELECT COALESCE(MAX(position), -1) + 1 FROM recipe_collection_items WHERE collection_id = $1 AND user_id = $2)
       ELSE $4 END)
     ON CONFLICT (collection_id, recipe_id) DO NOTHING
     RETURNING id`,
    [collectionId, userId, recipeId, requested]
  );
  if (rows.length && requested >= 0) {
    // Placing a recipe at a specific slot pushes the recipes after it down.
    await pool.query(
      `UPDATE recipe_collection_items
       SET position = position + 1
       WHERE collection_id = $1 AND user_id = $2 AND recipe_id <> $3 AND position >= $4`,
      [collectionId, userId, recipeId, requested]
    );
  }
  return getCollectionItems(pool, userId, collectionId);
}

async function removeCollectionItem(pool, userId, collectionId, recipeId) {
  const result = await pool.query(
    'DELETE FROM recipe_collection_items WHERE collection_id = $1 AND user_id = $2 AND recipe_id = $3',
    [collectionId, userId, recipeId]
  );
  return result.rowCount > 0;
}

async function reorderCollectionItems(pool, userId, collectionId, orderedRecipeIds) {
  const ids = [];
  for (const value of Array.isArray(orderedRecipeIds) ? orderedRecipeIds : []) {
    const recipeId = typeof value === 'string' ? value.trim() : '';
    if (recipeId && recipeId.length <= 120 && !ids.includes(recipeId)) ids.push(recipeId);
  }
  if (!ids.length) throw new ShelfValidationError('Send the recipe order you want to keep.');
  const current = await getCollectionItems(pool, userId, collectionId);
  const existing = current.map((item) => item.recipeId);
  if (existing.length !== ids.length || !existing.every((recipeId) => ids.includes(recipeId))) {
    throw new ShelfValidationError('That recipe order does not match this collection.');
  }
  await pool.query(
    `UPDATE recipe_collection_items AS i
     SET position = ordered.position
     FROM (SELECT recipe_id, position - 1 AS position
           FROM UNNEST($3::text[]) WITH ORDINALITY AS t(recipe_id, position)) AS ordered
     WHERE i.collection_id = $1 AND i.user_id = $2 AND i.recipe_id = ordered.recipe_id`,
    [collectionId, userId, ids]
  );
  return getCollectionItems(pool, userId, collectionId);
}

function mapByRecipeId(rows) {
  const map = new Map();
  for (const row of rows) map.set(row.recipe_id, row);
  return map;
}

// One round trip set that fills the whole client shelf model.
async function loadShelf(pool, userId) {
  const [favorites, collections, membership, recent] = await Promise.all([
    pool.query(
      'SELECT recipe_id, created_at FROM recipe_favorites WHERE user_id = $1 ORDER BY created_at DESC, recipe_id ASC',
      [userId]
    ),
    listCollections(pool, userId),
    pool.query(
      `SELECT i.recipe_id, i.position, c.id AS collection_id, c.name AS collection_name, c.position AS collection_position
       FROM recipe_collection_items i
       JOIN recipe_collections c ON c.id = i.collection_id
       WHERE i.user_id = $1
       ORDER BY c.position ASC, c.id ASC, i.position ASC, i.id ASC`,
      [userId]
    ),
    pool.query(
      `SELECT recipe_id, MAX(brewed_at) AS last_brewed_at, COUNT(*)::int AS brew_count
       FROM brew_journal_entries
       WHERE user_id = $1
       GROUP BY recipe_id
       ORDER BY last_brewed_at DESC
       LIMIT 60`,
      [userId]
    ),
  ]);
  const memberships = membership.rows.map((row) => ({
    collectionId: Number(row.collection_id),
    collectionName: row.collection_name,
    collectionPosition: row.collection_position,
    recipeId: row.recipe_id,
    position: row.position,
  }));
  return {
    favorites: favorites.rows.map((row) => row.recipe_id),
    collections,
    memberships,
    recentlyBrewed: recent.rows.map((row) => ({
      recipeId: row.recipe_id,
      lastBrewedAt: new Date(row.last_brewed_at).toISOString(),
      brewCount: row.brew_count,
    })),
  };
}

// Builds the full shelf model for a single collection view: recipe order is
// preserved, and every item carries the shelf metadata the client needs.
async function loadCollection(pool, userId, collectionId) {
  const collection = await getCollection(pool, userId, collectionId);
  if (!collection) return null;
  const [items, favoriteRows, memberships] = await Promise.all([
    getCollectionItems(pool, userId, collectionId),
    pool.query('SELECT recipe_id FROM recipe_favorites WHERE user_id = $1', [userId]),
    pool.query(
      `SELECT i.collection_id, c.name AS collection_name, i.recipe_id, i.position
       FROM recipe_collection_items i
       JOIN recipe_collections c ON c.id = i.collection_id
       WHERE i.user_id = $1`,
      [userId]
    ),
  ]);
  const favorites = new Set(favoriteRows.rows.map((row) => row.recipe_id));
  return {
    collection: { ...collection, itemCount: items.length },
    favorites: [...favorites],
    items: items.map((item) => ({
      recipeId: item.recipeId,
      position: item.position,
      favorite: favorites.has(item.recipeId),
    })),
    memberships: memberships.rows.map((row) => ({
      collectionId: Number(row.collection_id),
      collectionName: row.collection_name,
      recipeId: row.recipe_id,
      position: row.position,
    })),
  };
}

module.exports = {
  COLLECTION_NAME_MAX,
  MAX_COLLECTIONS_PER_USER,
  MAX_ITEMS_PER_COLLECTION,
  ShelfValidationError,
  addCollectionItem,
  addFavorite,
  createCollection,
  deleteCollection,
  getCollection,
  getCollectionItems,
  initializeShelf,
  isFavorite,
  listCollections,
  loadCollection,
  loadShelf,
  mapByRecipeId,
  normalizeCollectionName,
  parseCollectionId,
  parsePosition,
  parseUserId,
  removeCollectionItem,
  removeFavorite,
  renameCollection,
  reorderCollectionItems,
  reorderCollections,
};
