'use strict';

const { randomUUID } = require('node:crypto');
const {
  MAX_COFFEE_GRAMS,
  METHODS,
  MIN_COFFEE_GRAMS,
  STEP_ACTIONS,
  TAG_KEYS,
  TAG_TAXONOMY,
} = require('./public/recipes');

const MAX_PERSONAL_RECIPES = 100;
const MAX_STEPS = 20;
const MAX_STEP_DURATION = 1800;
const MAX_PREPARATION_LEAD = 300;

class PersonalRecipeValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PersonalRecipeValidationError';
    this.status = 400;
  }
}

function text(value, label, max, { optional = false } = {}) {
  const normalized = typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
  if (!normalized) {
    if (optional) return null;
    throw new PersonalRecipeValidationError(`${label} is required.`);
  }
  if (normalized.length > max) {
    throw new PersonalRecipeValidationError(`${label} must be ${max} characters or fewer.`);
  }
  return normalized;
}

function paragraph(value, label, max, { optional = false } = {}) {
  const normalized = typeof value === 'string' ? value.trim() : '';
  if (!normalized) {
    if (optional) return null;
    throw new PersonalRecipeValidationError(`${label} is required.`);
  }
  if (normalized.length > max) {
    throw new PersonalRecipeValidationError(`${label} must be ${max} characters or fewer.`);
  }
  return normalized;
}

function wholeNumber(value, label, min, max) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) {
    throw new PersonalRecipeValidationError(`${label} must be a whole number from ${min} to ${max}.`);
  }
  return number;
}

function normalizeTags(tags = {}) {
  return Object.fromEntries(TAG_KEYS.map((facet) => {
    const allowed = new Set(TAG_TAXONOMY[facet].values.map((entry) => entry.value));
    const submitted = Array.isArray(tags[facet]) ? tags[facet] : [];
    const values = [...new Set(submitted.map((value) => String(value).trim()).filter(Boolean))];
    if (!values.length) {
      throw new PersonalRecipeValidationError(`Choose at least one ${TAG_TAXONOMY[facet].label.toLowerCase()} tag.`);
    }
    if (values.some((value) => !allowed.has(value))) {
      throw new PersonalRecipeValidationError(`Choose supported ${TAG_TAXONOMY[facet].label.toLowerCase()} tags.`);
    }
    return [facet, values];
  }));
}

function normalizeSteps(steps, baseWater) {
  if (!Array.isArray(steps) || steps.length < 1 || steps.length > MAX_STEPS) {
    throw new PersonalRecipeValidationError(`Add from 1 to ${MAX_STEPS} recipe steps.`);
  }
  const actions = new Set(Object.keys(STEP_ACTIONS));
  let previousTarget = 0;
  let finalTarget = null;
  let totalDuration = 0;
  const normalized = steps.map((candidate, index) => {
    const stepNumber = index + 1;
    const action = String(candidate?.action || '').trim();
    if (!actions.has(action)) {
      throw new PersonalRecipeValidationError(`Step ${stepNumber} uses an unsupported action.`);
    }
    const duration = wholeNumber(candidate?.duration, `Step ${stepNumber} duration`, 0, MAX_STEP_DURATION);
    totalDuration += duration;
    const targetValue = candidate?.target;
    const hasTarget = targetValue !== null && targetValue !== undefined && targetValue !== '';
    let target;
    if (hasTarget) {
      target = wholeNumber(targetValue, `Step ${stepNumber} water target`, 0, baseWater);
      if (target < previousTarget) {
        throw new PersonalRecipeValidationError(`Step ${stepNumber} water target cannot be lower than the previous target.`);
      }
      previousTarget = target;
      finalTarget = target;
    }
    const leadValue = candidate?.prepareLeadSeconds;
    const hasLead = leadValue !== null && leadValue !== undefined && leadValue !== '';
    const prepareLeadSeconds = hasLead
      ? wholeNumber(leadValue, `Step ${stepNumber} preparation lead`, 10, MAX_PREPARATION_LEAD)
      : null;
    return {
      label: text(candidate?.label, `Step ${stepNumber} name`, 80),
      action,
      duration,
      ...(hasTarget ? { target } : {}),
      instruction: paragraph(candidate?.instruction, `Step ${stepNumber} instruction`, 500),
      preparation: paragraph(candidate?.preparation, `Step ${stepNumber} preparation cue`, 300),
      ...(prepareLeadSeconds ? { prepareLeadSeconds } : {}),
    };
  });
  if (totalDuration <= 0) {
    throw new PersonalRecipeValidationError('The recipe needs at least one timed step.');
  }
  if (finalTarget === null) {
    throw new PersonalRecipeValidationError('At least one step needs a cumulative water target.');
  }
  if (finalTarget !== baseWater) {
    throw new PersonalRecipeValidationError(`The final water target must equal the recipe total of ${baseWater}g.`);
  }
  return normalized;
}

function normalizeRecipeInput(body = {}) {
  const methodId = String(body.methodId || '').trim();
  if (!METHODS.some((method) => method.id === methodId)) {
    throw new PersonalRecipeValidationError('Choose a supported brewing method.');
  }
  const defaultCoffee = wholeNumber(body.defaultCoffee, 'Coffee dose', MIN_COFFEE_GRAMS, MAX_COFFEE_GRAMS);
  const ratio = Number(body.ratio);
  if (!Number.isFinite(ratio) || ratio < 5 || ratio > 30) {
    throw new PersonalRecipeValidationError('Brew ratio must be from 5 to 30.');
  }
  const roundedRatio = Math.round(ratio * 100) / 100;
  const baseWater = Math.round(defaultCoffee * roundedRatio);
  return {
    methodId,
    title: text(body.title, 'Recipe name', 100),
    summary: paragraph(body.summary, 'Summary', 300),
    result: paragraph(body.result, 'Expected cup', 500),
    defaultCoffee,
    ratio: roundedRatio,
    baseWater,
    temperature: text(body.temperature, 'Water temperature', 80),
    grind: text(body.grind, 'Grind guidance', 120),
    difficulty: text(body.difficulty, 'Difficulty', 40),
    equipment: paragraph(body.equipment, 'Equipment', 240),
    tags: normalizeTags(body.tags),
    steps: normalizeSteps(body.steps, baseWater),
    notes: paragraph(body.notes, 'Private notes', 2000, { optional: true }),
  };
}

function parsePersonalRecipeReference(value) {
  const raw = String(value || '').trim();
  const match = raw.match(/^(personal-[0-9a-f-]{36})(?:@(\d+))?$/i);
  if (!match) return null;
  const version = match[2] ? Number(match[2]) : null;
  if (version !== null && (!Number.isSafeInteger(version) || version < 1)) return null;
  return { id: match[1].toLowerCase(), version };
}

function dateOnly(value) {
  if (!value) return null;
  return new Date(value).toISOString().slice(0, 10);
}

function rowToRecipe(row) {
  if (!row) return null;
  const data = typeof row.recipe_data === 'string' ? JSON.parse(row.recipe_data) : row.recipe_data;
  const version = Number(row.version);
  return {
    ...data,
    id: row.id,
    version,
    revisionId: `${row.id}@${version}`,
    publishedAt: dateOnly(row.revision_created_at),
    attribution: { label: 'Your private recipe', kind: 'personal' },
    isPersonal: true,
    archived: Boolean(row.archived_at),
    parentRecipe: row.parent_recipe_id ? {
      id: row.parent_recipe_id,
      revisionId: row.parent_recipe_revision_id,
      title: row.parent_title,
      attribution: row.parent_attribution,
    } : null,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
  };
}

async function initializePersonalRecipes(pool) {
  if (!pool) return false;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS personal_recipes (
      id TEXT PRIMARY KEY,
      user_id BIGINT NOT NULL,
      username TEXT NOT NULL,
      parent_recipe_id TEXT,
      parent_recipe_revision_id TEXT,
      parent_title TEXT,
      parent_attribution TEXT,
      current_version INTEGER NOT NULL CHECK (current_version > 0),
      archived_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query("COMMENT ON TABLE personal_recipes IS 'staging:private'");
  await pool.query(`
    CREATE TABLE IF NOT EXISTS personal_recipe_revisions (
      recipe_id TEXT NOT NULL REFERENCES personal_recipes (id) ON DELETE CASCADE,
      user_id BIGINT NOT NULL,
      version INTEGER NOT NULL CHECK (version > 0),
      recipe_data JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (recipe_id, version)
    )
  `);
  await pool.query("COMMENT ON TABLE personal_recipe_revisions IS 'staging:private'");
  await pool.query(`
    CREATE INDEX IF NOT EXISTS personal_recipes_user_updated_idx
    ON personal_recipes (user_id, archived_at, updated_at DESC, id)
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS personal_recipe_revisions_user_idx
    ON personal_recipe_revisions (user_id, recipe_id, version DESC)
  `);
  return true;
}

const SELECT_RECIPE = `
  SELECT p.*, r.version, r.recipe_data, r.created_at AS revision_created_at
  FROM personal_recipes p
  JOIN personal_recipe_revisions r ON r.recipe_id = p.id
`;

async function listPersonalRecipes(pool, userId, { includeArchived = true } = {}) {
  const { rows } = await pool.query(
    `${SELECT_RECIPE}
     WHERE p.user_id = $1 AND r.version = p.current_version
       AND ($2::boolean OR p.archived_at IS NULL)
     ORDER BY p.archived_at NULLS FIRST, p.updated_at DESC, p.id ASC`,
    [userId, includeArchived]
  );
  return rows.map(rowToRecipe);
}

async function getPersonalRecipe(pool, userId, reference) {
  const parsed = parsePersonalRecipeReference(reference);
  if (!parsed) return null;
  const { rows } = await pool.query(
    `${SELECT_RECIPE}
     WHERE p.user_id = $1 AND p.id = $2
       AND r.version = COALESCE($3::integer, p.current_version)
     LIMIT 1`,
    [userId, parsed.id, parsed.version]
  );
  return rowToRecipe(rows[0]);
}

function parentColumns(parentRecipe) {
  if (!parentRecipe) return [null, null, null, null];
  return [
    parentRecipe.id,
    parentRecipe.revisionId,
    parentRecipe.title,
    parentRecipe.attribution?.label || null,
  ];
}

async function createPersonalRecipe(pool, user, body, parentRecipe = null) {
  const recipeData = normalizeRecipeInput(body);
  const client = await pool.connect();
  const id = `personal-${randomUUID()}`;
  try {
    await client.query('BEGIN');
    const { rows: countRows } = await client.query(
      'SELECT COUNT(*)::int AS total FROM personal_recipes WHERE user_id = $1',
      [user.id]
    );
    if (Number(countRows[0]?.total || 0) >= MAX_PERSONAL_RECIPES) {
      throw new PersonalRecipeValidationError(`You can keep up to ${MAX_PERSONAL_RECIPES} personal recipes.`);
    }
    const parent = parentColumns(parentRecipe);
    await client.query(
      `INSERT INTO personal_recipes (
        id, user_id, username, parent_recipe_id, parent_recipe_revision_id,
        parent_title, parent_attribution, current_version
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 1)`,
      [id, user.id, String(user.username || ''), ...parent]
    );
    await client.query(
      `INSERT INTO personal_recipe_revisions (recipe_id, user_id, version, recipe_data)
       VALUES ($1, $2, 1, $3::jsonb)`,
      [id, user.id, JSON.stringify(recipeData)]
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
  return getPersonalRecipe(pool, user.id, id);
}

async function updatePersonalRecipe(pool, userId, recipeId, body) {
  const parsed = parsePersonalRecipeReference(recipeId);
  if (!parsed || parsed.version !== null) return null;
  const recipeData = normalizeRecipeInput(body);
  const client = await pool.connect();
  let nextVersion;
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `SELECT current_version FROM personal_recipes
       WHERE id = $1 AND user_id = $2 FOR UPDATE`,
      [parsed.id, userId]
    );
    if (!rows.length) {
      await client.query('ROLLBACK');
      return null;
    }
    nextVersion = Number(rows[0].current_version) + 1;
    await client.query(
      `INSERT INTO personal_recipe_revisions (recipe_id, user_id, version, recipe_data)
       VALUES ($1, $2, $3, $4::jsonb)`,
      [parsed.id, userId, nextVersion, JSON.stringify(recipeData)]
    );
    await client.query(
      `UPDATE personal_recipes SET current_version = $3, updated_at = NOW()
       WHERE id = $1 AND user_id = $2`,
      [parsed.id, userId, nextVersion]
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
  return getPersonalRecipe(pool, userId, `${parsed.id}@${nextVersion}`);
}

async function setPersonalRecipeArchived(pool, userId, recipeId, archived) {
  const parsed = parsePersonalRecipeReference(recipeId);
  if (!parsed || parsed.version !== null) return null;
  const { rows } = await pool.query(
    `UPDATE personal_recipes
     SET archived_at = CASE WHEN $3::boolean THEN COALESCE(archived_at, NOW()) ELSE NULL END,
         updated_at = NOW()
     WHERE id = $1 AND user_id = $2
     RETURNING id`,
    [parsed.id, userId, Boolean(archived)]
  );
  return rows.length ? getPersonalRecipe(pool, userId, parsed.id) : null;
}

async function deletePersonalRecipe(pool, userId, recipeId) {
  const parsed = parsePersonalRecipeReference(recipeId);
  if (!parsed || parsed.version !== null) return false;
  const result = await pool.query(
    'DELETE FROM personal_recipes WHERE id = $1 AND user_id = $2',
    [parsed.id, userId]
  );
  return result.rowCount > 0;
}

async function duplicatePersonalRecipe(pool, user, sourceRecipe) {
  const suffix = ' copy';
  const maxTitle = 100 - suffix.length;
  return createPersonalRecipe(pool, user, {
    ...sourceRecipe,
    title: `${sourceRecipe.title.slice(0, maxTitle)}${suffix}`,
  }, sourceRecipe);
}

module.exports = {
  MAX_PERSONAL_RECIPES,
  MAX_PREPARATION_LEAD,
  MAX_STEP_DURATION,
  MAX_STEPS,
  PersonalRecipeValidationError,
  createPersonalRecipe,
  deletePersonalRecipe,
  duplicatePersonalRecipe,
  getPersonalRecipe,
  initializePersonalRecipes,
  listPersonalRecipes,
  normalizeRecipeInput,
  parsePersonalRecipeReference,
  rowToRecipe,
  setPersonalRecipeArchived,
  updatePersonalRecipe,
};
