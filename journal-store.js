'use strict';

const RATING_FIELDS = Object.freeze(['sweetness', 'acidity', 'body', 'clarity', 'overall']);
const TEXT_FIELDS = Object.freeze({
  coffeeName: { column: 'coffee_name', max: 120, label: 'Coffee' },
  roaster: { column: 'roaster', max: 120, label: 'Roaster' },
  process: { column: 'process', max: 80, label: 'Process' },
  grinder: { column: 'grinder', max: 120, label: 'Grinder' },
  grindSetting: { column: 'grind_setting', max: 80, label: 'Grind setting' },
  water: { column: 'water', max: 160, label: 'Water' },
  gear: { column: 'gear', max: 200, label: 'Gear' },
  notes: { column: 'notes', max: 2000, label: 'Notes' },
  changeNextTime: { column: 'change_next_time', max: 500, label: 'Change next time' },
});

class JournalValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'JournalValidationError';
    this.status = 400;
  }
}

function normalizeText(value, definition) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const text = String(value).trim();
  if (!text) return null;
  if (text.length > definition.max) {
    throw new JournalValidationError(`${definition.label} must be ${definition.max} characters or fewer.`);
  }
  return text;
}

function normalizeRating(value, label) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const rating = Number(value);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new JournalValidationError(`${label} must be a whole number from 1 to 5.`);
  }
  return rating;
}

function normalizeDate(value, label, dateOnly = false) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const text = String(value).trim();
  if (dateOnly && !/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    throw new JournalValidationError(`${label} must use YYYY-MM-DD.`);
  }
  const parsed = new Date(dateOnly ? `${text}T00:00:00Z` : text);
  if (!Number.isFinite(parsed.getTime())) {
    throw new JournalValidationError(`${label} is not a valid date.`);
  }
  return dateOnly ? text : parsed.toISOString();
}

function normalizeEditableFields(body = {}) {
  const normalized = {};
  for (const [field, definition] of Object.entries(TEXT_FIELDS)) {
    const value = normalizeText(body[field], definition);
    if (value !== undefined) normalized[field] = value;
  }
  const roastDate = normalizeDate(body.roastDate, 'Roast date', true);
  if (roastDate !== undefined) normalized.roastDate = roastDate;
  const brewedAt = normalizeDate(body.brewedAt, 'Brew date');
  if (brewedAt !== undefined) normalized.brewedAt = brewedAt;
  for (const field of RATING_FIELDS) {
    const label = field === 'overall' ? 'Overall result' : field[0].toUpperCase() + field.slice(1);
    const value = normalizeRating(body[field], label);
    if (value !== undefined) normalized[field] = value;
  }
  return normalized;
}

function normalizeCreateInput(body = {}) {
  const recipeId = typeof body.recipeId === 'string' ? body.recipeId.trim() : '';
  if (!recipeId || recipeId.length > 120) {
    throw new JournalValidationError('Choose a valid recipe.');
  }
  const recipeVersion = Number(body.recipeVersion);
  if (!Number.isInteger(recipeVersion) || recipeVersion <= 0) {
    throw new JournalValidationError('Choose a valid recipe version.');
  }
  const coffee = Number(body.coffee);
  if (!Number.isInteger(coffee) || coffee < 5 || coffee > 60) {
    throw new JournalValidationError('Coffee dose must be a whole number from 5g to 60g.');
  }
  const source = body.source === 'guided' ? 'guided' : 'manual';
  return {
    recipeId,
    recipeVersion,
    coffee,
    source,
    brewedAt: new Date().toISOString(),
    ...normalizeEditableFields(body),
  };
}

function normalizeUpdateInput(body = {}) {
  const normalized = normalizeEditableFields(body);
  if (!Object.keys(normalized).length) {
    throw new JournalValidationError('Add at least one journal change to save.');
  }
  return normalized;
}

function parseEntryId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function rowToEntry(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    source: row.source,
    brewedAt: new Date(row.brewed_at).toISOString(),
    recipeId: row.recipe_id,
    recipeVersion: row.recipe_version,
    recipeRevisionId: row.recipe_revision_id,
    recipeSnapshot: row.recipe_snapshot,
    coffeeName: row.coffee_name,
    roaster: row.roaster,
    process: row.process,
    roastDate: row.roast_date ? String(row.roast_date).slice(0, 10) : null,
    grinder: row.grinder,
    grindSetting: row.grind_setting,
    water: row.water,
    gear: row.gear,
    sweetness: row.sweetness,
    acidity: row.acidity,
    body: row.body,
    clarity: row.clarity,
    overall: row.overall,
    notes: row.notes,
    changeNextTime: row.change_next_time,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

async function initializeJournal(pool) {
  if (!pool) return false;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS brew_journal_entries (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL,
      username TEXT NOT NULL,
      source TEXT NOT NULL CHECK (source IN ('guided', 'manual')),
      brewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      recipe_id TEXT NOT NULL,
      recipe_version INTEGER NOT NULL CHECK (recipe_version > 0),
      recipe_revision_id TEXT NOT NULL,
      recipe_snapshot JSONB NOT NULL,
      coffee_name TEXT,
      roaster TEXT,
      process TEXT,
      roast_date DATE,
      grinder TEXT,
      grind_setting TEXT,
      water TEXT,
      gear TEXT,
      sweetness SMALLINT CHECK (sweetness BETWEEN 1 AND 5),
      acidity SMALLINT CHECK (acidity BETWEEN 1 AND 5),
      body SMALLINT CHECK (body BETWEEN 1 AND 5),
      clarity SMALLINT CHECK (clarity BETWEEN 1 AND 5),
      overall SMALLINT CHECK (overall BETWEEN 1 AND 5),
      notes TEXT,
      change_next_time TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query("COMMENT ON TABLE brew_journal_entries IS 'staging:private'");
  await pool.query(`
    CREATE INDEX IF NOT EXISTS brew_journal_entries_user_brewed_idx
    ON brew_journal_entries (user_id, brewed_at DESC, id DESC)
  `);
  return true;
}

async function listEntries(pool, userId, filters = {}) {
  const values = [userId];
  const clauses = ['user_id = $1'];
  const add = (clause, value) => {
    values.push(value);
    clauses.push(clause.replace('?', `$${values.length}`));
  };
  if (filters.methodId) add("recipe_snapshot->>'methodId' = ?", filters.methodId);
  if (filters.recipeId) add('recipe_id = ?', filters.recipeId);
  if (filters.q) {
    add(`CONCAT_WS(' ', coffee_name, roaster, notes, change_next_time,
      recipe_snapshot->>'title', recipe_snapshot->>'methodName') ILIKE ?`, `%${filters.q}%`);
  }
  const { rows } = await pool.query(
    `SELECT * FROM brew_journal_entries
     WHERE ${clauses.join(' AND ')}
     ORDER BY brewed_at DESC, id DESC
     LIMIT 200`,
    values
  );
  return rows.map(rowToEntry);
}

async function getEntry(pool, userId, entryId) {
  const { rows } = await pool.query(
    'SELECT * FROM brew_journal_entries WHERE id = $1 AND user_id = $2 LIMIT 1',
    [entryId, userId]
  );
  return rowToEntry(rows[0]);
}

async function createEntry(pool, user, input, recipeSnapshot) {
  const { rows } = await pool.query(
    `INSERT INTO brew_journal_entries (
      user_id, username, source, brewed_at, recipe_id, recipe_version,
      recipe_revision_id, recipe_snapshot, coffee_name, roaster, process,
      roast_date, grinder, grind_setting, water, gear, sweetness, acidity,
      body, clarity, overall, notes, change_next_time
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11, $12, $13,
      $14, $15, $16, $17, $18, $19, $20, $21, $22, $23
    ) RETURNING *`,
    [
      user.id, String(user.username || ''), input.source, input.brewedAt,
      recipeSnapshot.id, recipeSnapshot.version, recipeSnapshot.revisionId,
      JSON.stringify(recipeSnapshot), input.coffeeName || null, input.roaster || null,
      input.process || null, input.roastDate || null, input.grinder || null,
      input.grindSetting || null, input.water || null, input.gear || null,
      input.sweetness || null, input.acidity || null, input.body || null,
      input.clarity || null, input.overall || null, input.notes || null,
      input.changeNextTime || null,
    ]
  );
  return rowToEntry(rows[0]);
}

async function updateEntry(pool, userId, entryId, input) {
  const assignments = [];
  const values = [entryId, userId];
  const columns = {
    ...Object.fromEntries(Object.entries(TEXT_FIELDS).map(([field, definition]) => [field, definition.column])),
    roastDate: 'roast_date',
    brewedAt: 'brewed_at',
    ...Object.fromEntries(RATING_FIELDS.map((field) => [field, field])),
  };
  for (const [field, value] of Object.entries(input)) {
    const column = columns[field];
    if (!column) continue;
    values.push(value);
    assignments.push(`${column} = $${values.length}`);
  }
  assignments.push('updated_at = NOW()');
  const { rows } = await pool.query(
    `UPDATE brew_journal_entries SET ${assignments.join(', ')}
     WHERE id = $1 AND user_id = $2 RETURNING *`,
    values
  );
  return rowToEntry(rows[0]);
}

async function deleteEntry(pool, userId, entryId) {
  const result = await pool.query(
    'DELETE FROM brew_journal_entries WHERE id = $1 AND user_id = $2',
    [entryId, userId]
  );
  return result.rowCount > 0;
}

module.exports = {
  JournalValidationError,
  RATING_FIELDS,
  TEXT_FIELDS,
  createEntry,
  deleteEntry,
  getEntry,
  initializeJournal,
  listEntries,
  normalizeCreateInput,
  normalizeUpdateInput,
  parseEntryId,
  rowToEntry,
  updateEntry,
};
