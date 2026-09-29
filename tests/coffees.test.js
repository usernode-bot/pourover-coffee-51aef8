const test = require('node:test');
const assert = require('node:assert/strict');

const coffees = require('../coffee-store');

function databaseRow(overrides = {}) {
  return {
    id: 12,
    user_id: 7,
    username: 'brewer',
    name: 'Finca El Jardín',
    roaster: 'Example Roaster',
    origin: 'Huila, Colombia',
    variety: 'Caturra',
    process: 'Washed',
    roast_level: 'Light',
    roast_date: '2026-09-04',
    tasting_notes: 'Honeyed and clear.',
    purchase_details: '250g bag',
    status: 'active',
    favorite: false,
    created_at: new Date('2026-09-17T12:00:00.000Z'),
    updated_at: new Date('2026-09-17T12:00:00.000Z'),
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

// Transactional calls run through connect().query; fold them into one list so
// assertions can find an INSERT regardless of which channel carried it.
function transactionalPool(responder) {
  const pool = recordingPool(responder);
  const query = pool.query;
  return {
    ...pool,
    connect: async () => ({ query, release() {} }),
  };
}

function validInput(overrides = {}) {
  return {
    name: '  Finca   El Jardín ',
    roaster: ' Example Roaster ',
    origin: 'Huila, Colombia',
    variety: 'Caturra',
    process: 'Washed',
    roastLevel: 'Light',
    roastDate: '2026-09-04',
    tastingNotes: 'Honeyed and clear.',
    purchaseDetails: '',
    status: 'active',
    favorite: true,
    ...overrides,
  };
}

test('coffee input normalizes the name, collapses whitespace, and nulls empty optional fields', () => {
  const normalized = coffees.normalizeCoffeeInput(validInput());
  assert.equal(normalized.name, 'Finca El Jardín');
  assert.equal(normalized.roaster, 'Example Roaster');
  assert.equal(normalized.purchaseDetails, null);
  assert.equal(normalized.favorite, true);
});

test('coffee input requires a name within 120 characters and accepts missing metadata', () => {
  assert.throws(() => coffees.normalizeCoffeeInput({ name: '' }), /required/i);
  assert.throws(() => coffees.normalizeCoffeeInput({ name: 'x'.repeat(121) }), /120 characters/);
  const minimal = coffees.normalizeCoffeeInput({ name: 'Bag from the shelf' });
  assert.equal(minimal.name, 'Bag from the shelf');
  assert.equal(minimal.roaster, undefined);
  assert.equal(minimal.origin, undefined);
  assert.equal(minimal.roastDate, undefined);
  assert.equal(minimal.status, undefined);
});

test('coffee validation enforces the date format and status vocabulary', () => {
  assert.throws(() => coffees.normalizeCoffeeInput(validInput({ roastDate: '09/04/2026' })), /YYYY-MM-DD/);
  assert.throws(() => coffees.normalizeCoffeeInput(validInput({ status: 'gone' })), /active, finished, or archived/);
  const finished = coffees.normalizeCoffeeInput(validInput({ status: 'FINISHED' }));
  assert.equal(finished.status, 'finished');
});

test('coffee schema creates the private table, comment, and per-user index idempotently', async () => {
  const pool = recordingPool();
  await coffees.initializeCoffees(pool);
  const schema = pool.calls.map((call) => call.sql).join('\n');
  assert.match(schema, /CREATE TABLE IF NOT EXISTS coffees/);
  assert.match(schema, /COMMENT ON TABLE coffees IS 'staging:private'/);
  assert.match(schema, /CREATE INDEX IF NOT EXISTS coffees_user_status_idx/);
  assert.match(schema, /ON coffees \(user_id, status, updated_at DESC, id\)/);
  assert.match(schema, /roast_date DATE/);
  const firstRun = pool.calls.length;
  await coffees.initializeCoffees(pool);
  assert.equal(pool.calls.length, firstRun * 2);
});

test('coffee reads, edits, and deletes are always scoped to the authenticated user', async () => {
  const pool = recordingPool((sql) => {
    if (/SELECT \*/.test(sql)) return { rows: [databaseRow()] };
    if (/UPDATE coffees/.test(sql)) return { rows: [databaseRow()], rowCount: 1 };
    if (/DELETE FROM coffees/.test(sql)) return { rows: [], rowCount: 1 };
    return { rows: [], rowCount: 0 };
  });

  await coffees.listCoffees(pool, 7, { status: 'active', q: 'honey' });
  await coffees.getCoffee(pool, 7, 12);
  await coffees.updateCoffee(pool, 7, 12, { tastingNotes: 'Clearer when cool.' });
  assert.equal(await coffees.deleteCoffee(pool, 7, 12), true);

  assert.match(pool.calls[0].sql, /user_id = \$1/);
  assert.match(pool.calls[0].sql, /status = \$2/);
  assert.match(pool.calls[0].sql, /ILIKE \$3/);
  assert.deepEqual(pool.calls[0].values, [7, 'active', '%honey%']);
  assert.match(pool.calls[1].sql, /id = \$1 AND user_id = \$2/);
  assert.deepEqual(pool.calls[1].values, [12, 7]);
  assert.match(pool.calls[2].sql, /WHERE id = \$1 AND user_id = \$2/);
  assert.deepEqual(pool.calls[2].values.slice(0, 2), [12, 7]);
  assert.match(pool.calls[3].sql, /WHERE id = \$1 AND user_id = \$2/);
  assert.deepEqual(pool.calls[3].values, [12, 7]);
});

test('list filters default to excluding archived coffees unless asked', async () => {
  const pool = recordingPool(() => ({ rows: [databaseRow()] }));
  await coffees.listCoffees(pool, 7);
  await coffees.listCoffees(pool, 7, { includeArchived: true });
  assert.match(pool.calls[0].sql, /status <> 'archived'/);
  assert.ok(!/status = \$2/.test(pool.calls[0].sql));
  assert.ok(!/status <> 'archived'/.test(pool.calls[1].sql));
  assert.deepEqual(pool.calls[1].values, [7]);
});

test('duplicating copies fields, clears the roast date, resets status, and keeps favorite', async () => {
  const source = databaseRow({ id: 12, favorite: true, status: 'finished', roast_date: '2026-09-04' });
  const pool = transactionalPool((sql) => {
    if (/SELECT COUNT/.test(sql)) return { rows: [{ total: 0 }] };
    // The INSERT ... SELECT returns what a real duplication would: a new row
    // with status 'active', no roast date, and every other field carried over.
    if (/INSERT INTO coffees/.test(sql)) {
      return { rows: [{ ...source, id: 13, status: 'active', roast_date: null }] };
    }
    return { rows: [], rowCount: 0 };
  });
  const duplicated = await coffees.duplicateCoffee(pool, { id: 7, username: 'brewer' }, 12);
  const insert = pool.calls.find((call) => /INSERT INTO coffees/.test(call.sql));
  assert.match(insert.sql, /INSERT INTO coffees/);
  assert.match(insert.sql, /roast_level, NULL, tasting_notes/);
  assert.match(insert.sql, /'active', favorite/);
  assert.match(insert.sql, /WHERE id = \$1 AND user_id = \$2/);
  assert.deepEqual(insert.values, [12, 7]);
  assert.equal(duplicated.id, 13);
  assert.equal(duplicated.roastDate, null);
  assert.equal(duplicated.status, 'active');
  assert.equal(duplicated.favorite, true);
});

test('creating enforces the per-user coffee cap', async () => {
  const pool = transactionalPool((sql) => {
    if (/SELECT COUNT/.test(sql)) return { rows: [{ total: coffees.MAX_COFFEES_PER_USER }] };
    return { rows: [], rowCount: 0 };
  });
  await assert.rejects(
    () => coffees.createCoffee(pool, { id: 7, username: 'brewer' }, validInput()),
    /up to 200 coffees/
  );
});

test('duplicating enforces the per-user coffee cap without inserting', async () => {
  const pool = transactionalPool((sql) => {
    if (/SELECT COUNT/.test(sql)) return { rows: [{ total: coffees.MAX_COFFEES_PER_USER }] };
    return { rows: [], rowCount: 0 };
  });
  await assert.rejects(
    () => coffees.duplicateCoffee(pool, { id: 7, username: 'brewer' }, 12),
    /up to 200 coffees/
  );
  assert.ok(!pool.calls.some((call) => /INSERT INTO coffees/.test(call.sql)));
});

test('rowToCoffee maps snake_case columns and nullable dates', () => {
  const coffee = coffees.rowToCoffee(databaseRow({ roast_date: null, favorite: true }));
  assert.equal(coffee.roastDate, null);
  assert.equal(coffee.favorite, true);
  assert.equal(coffee.roastLevel, 'Light');
  assert.equal(coffees.rowToCoffee(null), null);
});
