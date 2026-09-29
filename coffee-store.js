'use strict';

// A person's private coffee and bean library.
//
// Like the journal and personal recipes, every row belongs to one Homeroom
// user: the table is marked `staging:private` and every query is scoped to
// the verified user id. Deleting a coffee never touches journal entries;
// each journal entry keeps its own coffee snapshot from brew time.

const MAX_COFFEES_PER_USER = 200;
const COFFEE_STATUSES = Object.freeze(['active', 'finished', 'archived']);

const TEXT_FIELDS = Object.freeze({
  roaster: { column: 'roaster', max: 120, label: 'Roaster' },
  origin: { column: 'origin', max: 120, label: 'Origin' },
  variety: { column: 'variety', max: 80, label: 'Variety' },
  process: { column: 'process', max: 80, label: 'Process' },
  roastLevel: { column: 'roast_level', max: 80, label: 'Roast level' },
  tastingNotes: { column: 'tasting_notes', max: 2000, label: 'Tasting notes' },
  purchaseDetails: { column: 'purchase_details', max: 500, label: 'Purchase details' },
});

class CoffeeValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'CoffeeValidationError';
    this.status = 400;
  }
}

function text(value, definition, { required = false } = {}) {
  if (value === undefined) return required ? null : undefined;
  if (value === null) return null;
  const normalized = String(value).trim().replace(/\s+/g, ' ');
  if (!normalized) {
    if (required) throw new CoffeeValidationError('Name is required.');
    return null;
  }
  const max = definition.max || 120;
  if (normalized.length > max) {
    throw new CoffeeValidationError(`${definition.label || 'Name'} must be ${max} characters or fewer.`);
  }
  return normalized;
}

function normalizeName(body = {}) {
  return text(body.name, { label: 'Coffee', max: 120 }, { required: true });
}

function normalizeDate(value, label) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const textDate = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(textDate)) {
    throw new CoffeeValidationError(`${label} must use YYYY-MM-DD.`);
  }
  const parsed = new Date(`${textDate}T00:00:00Z`);
  if (!Number.isFinite(parsed.getTime())) {
    throw new CoffeeValidationError(`${label} is not a valid date.`);
  }
  return textDate;
}

function normalizeStatus(value) {
  if (value === undefined) return undefined;
  const status = String(value || '').trim().toLowerCase();
  if (!COFFEE_STATUSES.includes(status)) {
    throw new CoffeeValidationError('Status must be active, finished, or archived.');
  }
  return status;
}

function normalizeCoffeeInput(body = {}) {
  const normalized = {
    name: normalizeName(body),
  };
  for (const [field, definition] of Object.entries(TEXT_FIELDS)) {
    const value = text(body[field], definition);
    if (value !== undefined) normalized[field] = value;
  }
  const roastDate = normalizeDate(body.roastDate, 'Roast date');
  if (roastDate !== undefined) normalized.roastDate = roastDate;
  const status = normalizeStatus(body.status);
  if (status !== undefined) normalized.status = status;
  if (body.favorite !== undefined) normalized.favorite = Boolean(body.favorite);
  return normalized;
}

function parseCoffeeId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function rowToCoffee(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    name: row.name,
    roaster: row.roaster,
    origin: row.origin,
    variety: row.variety,
    process: row.process,
    roastLevel: row.roast_level,
    roastDate: row.roast_date ? String(row.roast_date).slice(0, 10) : null,
    tastingNotes: row.tasting_notes,
    purchaseDetails: row.purchase_details,
    status: row.status,
    favorite: Boolean(row.favorite),
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

async function initializeCoffees(pool) {
  if (!pool) return false;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS coffees (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL,
      username TEXT NOT NULL,
      name TEXT NOT NULL,
      roaster TEXT,
      origin TEXT,
      variety TEXT,
      process TEXT,
      roast_level TEXT,
      roast_date DATE,
      tasting_notes TEXT,
      purchase_details TEXT,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'finished', 'archived')),
      favorite BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query("COMMENT ON TABLE coffees IS 'staging:private'");
  await pool.query(`
    CREATE INDEX IF NOT EXISTS coffees_user_status_idx
    ON coffees (user_id, status, updated_at DESC, id)
  `);
  return true;
}

async function listCoffees(pool, userId, { status, q, includeArchived = false } = {}) {
  const values = [userId];
  const clauses = ['user_id = $1'];
  if (status && COFFEE_STATUSES.includes(status)) {
    values.push(status);
    clauses.push(`status = $${values.length}`);
  } else if (!includeArchived) {
    clauses.push("status <> 'archived'");
  }
  if (q) {
    values.push(`%${q}%`);
    clauses.push(`CONCAT_WS(' ', name, roaster, origin, variety, process, tasting_notes) ILIKE $${values.length}`);
  }
  const { rows } = await pool.query(
    `SELECT * FROM coffees
     WHERE ${clauses.join(' AND ')}
     ORDER BY updated_at DESC, id DESC
     LIMIT 200`,
    values
  );
  return rows.map(rowToCoffee);
}

async function getCoffee(pool, userId, coffeeId) {
  const { rows } = await pool.query(
    'SELECT * FROM coffees WHERE id = $1 AND user_id = $2 LIMIT 1',
    [coffeeId, userId]
  );
  return rowToCoffee(rows[0]);
}

async function createCoffee(pool, user, body) {
  const input = normalizeCoffeeInput(body);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: countRows } = await client.query(
      'SELECT COUNT(*)::int AS total FROM coffees WHERE user_id = $1',
      [user.id]
    );
    if (Number(countRows[0]?.total || 0) >= MAX_COFFEES_PER_USER) {
      throw new CoffeeValidationError(`You can keep up to ${MAX_COFFEES_PER_USER} coffees.`);
    }
    const columns = ['user_id', 'username', 'name'];
    const placeholders = ['$1', '$2', '$3'];
    const values = [user.id, String(user.username || ''), input.name];
    for (const [field, definition] of Object.entries(TEXT_FIELDS)) {
      if (input[field] === undefined) continue;
      columns.push(definition.column);
      placeholders.push(`$${values.length + 1}`);
      values.push(input[field]);
    }
    if (input.roastDate !== undefined) {
      columns.push('roast_date');
      placeholders.push(`$${values.length + 1}`);
      values.push(input.roastDate);
    }
    if (input.status !== undefined) {
      columns.push('status');
      placeholders.push(`$${values.length + 1}`);
      values.push(input.status);
    }
    if (input.favorite !== undefined) {
      columns.push('favorite');
      placeholders.push(`$${values.length + 1}`);
      values.push(input.favorite);
    }
    const { rows } = await client.query(
      `INSERT INTO coffees (${columns.join(', ')})
       VALUES (${placeholders.join(', ')}) RETURNING *`,
      values
    );
    await client.query('COMMIT');
    return rowToCoffee(rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function updateCoffee(pool, userId, coffeeId, body) {
  const input = normalizeCoffeeInput(body);
  const columnMap = {
    ...Object.fromEntries(Object.entries(TEXT_FIELDS).map(([field, definition]) => [field, definition.column])),
    roastDate: 'roast_date',
    status: 'status',
    favorite: 'favorite',
  };
  const assignments = [];
  const values = [coffeeId, userId];
  for (const [field, value] of Object.entries(input)) {
    const column = columnMap[field];
    if (!column || value === undefined) continue;
    values.push(value);
    assignments.push(`${column} = $${values.length}`);
  }
  if (!assignments.length) {
    throw new CoffeeValidationError('Add at least one coffee change to save.');
  }
  assignments.push('updated_at = NOW()');
  const { rows } = await pool.query(
    `UPDATE coffees SET ${assignments.join(', ')}
     WHERE id = $1 AND user_id = $2 RETURNING *`,
    values
  );
  return rowToCoffee(rows[0]);
}

async function deleteCoffee(pool, userId, coffeeId) {
  const result = await pool.query(
    'DELETE FROM coffees WHERE id = $1 AND user_id = $2',
    [coffeeId, userId]
  );
  return result.rowCount > 0;
}

async function duplicateCoffee(pool, user, sourceId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: countRows } = await client.query(
      'SELECT COUNT(*)::int AS total FROM coffees WHERE user_id = $1',
      [user.id]
    );
    if (Number(countRows[0]?.total || 0) >= MAX_COFFEES_PER_USER) {
      throw new CoffeeValidationError(`You can keep up to ${MAX_COFFEES_PER_USER} coffees.`);
    }
    const { rows } = await client.query(
      `INSERT INTO coffees (
        user_id, username, name, roaster, origin, variety, process,
        roast_level, roast_date, tasting_notes, purchase_details, status, favorite
      )
      SELECT user_id, username, name, roaster, origin, variety, process,
        roast_level, NULL, tasting_notes, purchase_details, 'active', favorite
      FROM coffees
      WHERE id = $1 AND user_id = $2
      RETURNING *`,
      [sourceId, user.id]
    );
    if (!rows.length) {
      await client.query('ROLLBACK');
      return null;
    }
    await client.query('COMMIT');
    return rowToCoffee(rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  COFFEE_STATUSES,
  CoffeeValidationError,
  MAX_COFFEES_PER_USER,
  TEXT_FIELDS,
  createCoffee,
  deleteCoffee,
  duplicateCoffee,
  getCoffee,
  initializeCoffees,
  listCoffees,
  normalizeCoffeeInput,
  parseCoffeeId,
  rowToCoffee,
  updateCoffee,
};
