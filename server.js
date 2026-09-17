'use strict';

const express = require('express');
const path = require('path');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const {
  METHODS,
  RECIPES,
  createRecipeSnapshot,
  getRecipeRevision,
  isCurrentRecipeRevision,
} = require('./public/recipes');
const journal = require('./journal-store');
const shelf = require('./shelf-store');

const app = express();
const port = process.env.PORT || 3000;
const DRAIN_MS = 3000;
const IS_STAGING = process.env.USERNODE_ENV === 'staging';
let shuttingDown = false;
let server;

const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : null;
const JWT_PUBLIC_KEY = (process.env.USERNODE_JWT_PUBLIC_KEY || '')
  .replace(/\\n/g, '\n');
const APP_AUDIENCE = process.env.USERNODE_APP_ID
  ? `usernode:app:${process.env.USERNODE_APP_ID}`
  : null;
const PUBLIC_API_PATHS = new Set(['/health']);
const PLATFORM_ORIGIN = (process.env.USERNODE_PLATFORM_ORIGIN || '')
  .replace(/\/+$/, '');

app.use(express.json({ limit: '32kb' }));

// In production the platform edge serves these files. This proxy keeps the
// same relative paths working when the app runs directly with Node.
app.get(/^\/usernode-(?:bridge|native|tailwind)\//, async (req, res) => {
  try {
    const upstream = await fetch(PLATFORM_ORIGIN + req.path);
    if (!upstream.ok) return res.sendStatus(upstream.status);
    const type = upstream.headers.get('content-type');
    if (type) res.type(type);
    res.set('Cache-Control', 'public, max-age=0, must-revalidate');
    return res.send(Buffer.from(await upstream.arrayBuffer()));
  } catch (error) {
    console.warn(`Hosted asset fetch failed: ${error.message}`);
    return res.sendStatus(502);
  }
});

app.use((req, res, next) => {
  const token = req.query.token || req.headers['x-usernode-token'];
  if (token && JWT_PUBLIC_KEY && APP_AUDIENCE) {
    try {
      const claims = jwt.verify(token, JWT_PUBLIC_KEY, {
        algorithms: ['RS256'],
        issuer: 'usernode',
        audience: APP_AUDIENCE,
      });
      if (claims && claims.pur === 'iframe') req.user = claims;
    } catch {
      // Invalid or expired tokens fall through to the normal auth response.
    }
  }

  if (req.method !== 'GET' || req.path.startsWith('/api/')) {
    if (PUBLIC_API_PATHS.has(req.path)) return next();
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  }
  return next();
});

app.get('/health', (_req, res) => {
  res.status(shuttingDown ? 503 : 200).json({ status: shuttingDown ? 'draining' : 'ok' });
});

function requireJournal(res) {
  if (pool) return true;
  res.status(503).json({ error: 'Brew journal storage is unavailable right now.' });
  return false;
}

function entryForClient(entry) {
  if (!entry) return null;
  const current = RECIPES.find((recipe) => recipe.id === entry.recipeId);
  return {
    ...entry,
    currentRecipeVersion: current?.version || null,
    isCurrentRecipeRevision: isCurrentRecipeRevision({
      id: entry.recipeId,
      version: entry.recipeVersion,
    }),
  };
}

// Stable, obviously fake collections for ?demo=1 shelf previews. Recipe ids
// match the shipped library so every item resolves to a real recipe.
const DEMO_COLLECTIONS = Object.freeze([
  Object.freeze({
    id: 900001,
    name: 'Staging demo: Weekend pours',
    recipeIds: Object.freeze(['v60-sweet-pulse', 'switch-hybrid', 'mugen-one-pour']),
  }),
  Object.freeze({
    id: 900002,
    name: 'Staging demo: Guests',
    recipeIds: Object.freeze(['clever-water-first', 'cotton-silky']),
  }),
]);

function demoJournalEntries() {
  return [
    entryForClient({
      id: 'demo-v60',
      source: 'guided',
      brewedAt: '2026-09-15T13:30:00.000Z',
      recipeId: 'v60-sweet-pulse',
      recipeVersion: 1,
      recipeRevisionId: 'v60-sweet-pulse@1',
      recipeSnapshot: createRecipeSnapshot('v60-sweet-pulse@1', 21),
      coffeeName: 'Staging demo: Finca El Jardín',
      roaster: 'Example Roaster',
      process: 'Washed',
      roastDate: '2026-09-04',
      grinder: 'Demo hand grinder',
      grindSetting: '18 clicks',
      water: 'Filtered, soft',
      gear: 'V60 02 and paper filter',
      sweetness: 5,
      acidity: 4,
      body: 3,
      clarity: 4,
      overall: 5,
      notes: 'Honeyed and clear once the cup cooled.',
      changeNextTime: 'Try one click coarser for a softer finish.',
      createdAt: '2026-09-15T13:35:00.000Z',
      updatedAt: '2026-09-15T13:35:00.000Z',
    }),
    entryForClient({
      id: 'demo-switch',
      source: 'manual',
      brewedAt: '2026-09-13T16:10:00.000Z',
      recipeId: 'switch-full-immersion',
      recipeVersion: 1,
      recipeRevisionId: 'switch-full-immersion@1',
      recipeSnapshot: createRecipeSnapshot('switch-full-immersion@1', 20),
      coffeeName: 'Staging demo: Serra do Caparaó',
      roaster: 'Sample Coffee Co.',
      process: 'Natural',
      roastDate: '2026-09-01',
      grinder: 'Demo flat-burr grinder',
      grindSetting: '6.2',
      water: 'Filtered',
      gear: 'Switch 03',
      sweetness: 4,
      acidity: 2,
      body: 5,
      clarity: 3,
      overall: 4,
      notes: 'Full and jammy with a cocoa finish.',
      changeNextTime: 'Lower the water temperature by one degree.',
      createdAt: '2026-09-13T16:15:00.000Z',
      updatedAt: '2026-09-13T16:15:00.000Z',
    }),
  ];
}

function sendJournalError(res, error) {
  if (error instanceof journal.JournalValidationError) {
    return res.status(400).json({ error: error.message });
  }
  console.error(`Brew journal request failed: ${error.message}`);
  return res.status(500).json({ error: 'The brew journal could not complete that request.' });
}

app.get('/api/brews', async (req, res) => {
  try {
    if (IS_STAGING && req.query.demo === '1') {
      const methodId = METHODS.some((method) => method.id === req.query.methodId)
        ? req.query.methodId : null;
      const recipeId = RECIPES.some((recipe) => recipe.id === req.query.recipeId)
        ? req.query.recipeId : null;
      const q = String(req.query.q || '').trim().toLowerCase().slice(0, 120);
      const entries = demoJournalEntries().filter((entry) => {
        if (methodId && entry.recipeSnapshot.methodId !== methodId) return false;
        if (recipeId && entry.recipeId !== recipeId) return false;
        if (!q) return true;
        return [entry.coffeeName, entry.roaster, entry.notes, entry.changeNextTime,
          entry.recipeSnapshot.title, entry.recipeSnapshot.methodName]
          .filter(Boolean).join(' ').toLowerCase().includes(q);
      });
      return res.json({ entries, demo: true });
    }
    if (!requireJournal(res)) return undefined;
    const methodId = METHODS.some((method) => method.id === req.query.methodId)
      ? req.query.methodId : null;
    const recipeId = RECIPES.some((recipe) => recipe.id === req.query.recipeId)
      ? req.query.recipeId : null;
    const q = String(req.query.q || '').trim().slice(0, 120);
    const entries = await journal.listEntries(pool, req.user.id, { methodId, recipeId, q });
    return res.json({ entries: entries.map(entryForClient), demo: false });
  } catch (error) {
    return sendJournalError(res, error);
  }
});

app.get('/api/brews/:id', async (req, res) => {
  try {
    if (IS_STAGING && req.query.demo === '1') {
      const entry = demoJournalEntries().find((candidate) => candidate.id === req.params.id);
      return entry ? res.json({ entry, demo: true }) : res.status(404).json({ error: 'Brew entry not found.' });
    }
    if (!requireJournal(res)) return undefined;
    const entryId = journal.parseEntryId(req.params.id);
    if (!entryId) return res.status(404).json({ error: 'Brew entry not found.' });
    const entry = await journal.getEntry(pool, req.user.id, entryId);
    return entry
      ? res.json({ entry: entryForClient(entry), demo: false })
      : res.status(404).json({ error: 'Brew entry not found.' });
  } catch (error) {
    return sendJournalError(res, error);
  }
});

app.post('/api/brews', async (req, res) => {
  try {
    if (!requireJournal(res)) return undefined;
    const input = journal.normalizeCreateInput(req.body);
    const recipe = getRecipeRevision(input.recipeId, input.recipeVersion);
    if (!recipe || recipe.id !== input.recipeId) {
      return res.status(400).json({ error: 'That recipe version is not available.' });
    }
    const snapshot = createRecipeSnapshot(recipe, input.coffee);
    const entry = await journal.createEntry(pool, req.user, input, snapshot);
    return res.status(201).json({ entry: entryForClient(entry) });
  } catch (error) {
    return sendJournalError(res, error);
  }
});

app.patch('/api/brews/:id', async (req, res) => {
  try {
    if (!requireJournal(res)) return undefined;
    const entryId = journal.parseEntryId(req.params.id);
    if (!entryId) return res.status(404).json({ error: 'Brew entry not found.' });
    const input = journal.normalizeUpdateInput(req.body);
    const entry = await journal.updateEntry(pool, req.user.id, entryId, input);
    return entry
      ? res.json({ entry: entryForClient(entry) })
      : res.status(404).json({ error: 'Brew entry not found.' });
  } catch (error) {
    return sendJournalError(res, error);
  }
});

app.delete('/api/brews/:id', async (req, res) => {
  try {
    if (!requireJournal(res)) return undefined;
    const entryId = journal.parseEntryId(req.params.id);
    if (!entryId) return res.status(404).json({ error: 'Brew entry not found.' });
    const deleted = await journal.deleteEntry(pool, req.user.id, entryId);
    return deleted ? res.status(204).end() : res.status(404).json({ error: 'Brew entry not found.' });
  } catch (error) {
    return sendJournalError(res, error);
  }
});

// A small, obviously fake shelf for staging previews, so every shelf screen is
// reviewable before a tester has saved anything of their own. It is never
// written to the database and never keyed to the visitor's own account, so it
// cannot stand in for a real user's favorites.
function demoMemberships() {
  const memberships = [];
  DEMO_COLLECTIONS.forEach((collection, order) => {
    collection.recipeIds.forEach((recipeId, position) => {
      memberships.push({
        collectionId: collection.id,
        collectionName: collection.name,
        collectionPosition: order,
        recipeId,
        position,
      });
    });
  });
  return memberships;
}

function demoFavorites() {
  return DEMO_COLLECTIONS[0].recipeIds;
}

function demoCollections() {
  return DEMO_COLLECTIONS.map((collection, order) => ({
    id: collection.id,
    name: collection.name,
    position: order,
    itemCount: collection.recipeIds.length,
    createdAt: '2026-09-14T08:00:00.000Z',
    updatedAt: '2026-09-15T08:00:00.000Z',
  }));
}

function demoRecentlyBrewed() {
  return demoJournalEntries().map((entry) => ({
    recipeId: entry.recipeId,
    lastBrewedAt: entry.brewedAt,
    brewCount: 1,
  }));
}

function sendShelfError(res, error) {
  if (error instanceof shelf.ShelfValidationError) {
    return res.status(400).json({ error: error.message });
  }
  console.error(`Recipe shelf request failed: ${error.message}`);
  return res.status(500).json({ error: 'The recipe shelf could not complete that request.' });
}

function requireShelf(res) {
  if (pool) return true;
  res.status(503).json({ error: 'Recipe shelf storage is unavailable right now.' });
  return false;
}

function collectionPayload(model) {
  return {
    collection: model.collection,
    favorites: model.favorites,
    items: model.items,
    memberships: model.memberships,
  };
}

function isDemoRequest(req) {
  return IS_STAGING && req.query.demo === '1';
}

app.get('/api/shelf', async (req, res) => {
  try {
    if (isDemoRequest(req)) {
      return res.json({
        favorites: demoFavorites(),
        collections: demoCollections(),
        memberships: demoMemberships(),
        recentlyBrewed: demoRecentlyBrewed(),
        demo: true,
      });
    }
    if (!requireShelf(res)) return undefined;
    const model = await shelf.loadShelf(pool, shelf.parseUserId(req.user.id));
    return res.json({ ...model, demo: false });
  } catch (error) {
    return sendShelfError(res, error);
  }
});

app.get('/api/shelf/collections/:id', async (req, res) => {
  try {
    if (isDemoRequest(req)) {
      const collectionId = Number(req.params.id);
      const definition = DEMO_COLLECTIONS.find((entry) => entry.id === collectionId);
      if (!definition) return res.status(404).json({ error: 'That collection is not on your shelf.' });
      const items = definition.recipeIds.map((recipeId, position) => ({
        recipeId, position, favorite: demoFavorites().includes(recipeId),
      }));
      return res.json({
        collection: demoCollections().find((entry) => entry.id === collectionId),
        favorites: demoFavorites(),
        items,
        memberships: demoMemberships().filter((entry) => entry.collectionId === collectionId),
        demo: true,
      });
    }
    if (!requireShelf(res)) return undefined;
    const collectionId = shelf.parseCollectionId(req.params.id);
    if (!collectionId) return res.status(404).json({ error: 'That collection is not on your shelf.' });
    const model = await shelf.loadCollection(pool, shelf.parseUserId(req.user.id), collectionId);
    return model
      ? res.json({ ...collectionPayload(model), demo: false })
      : res.status(404).json({ error: 'That collection is not on your shelf.' });
  } catch (error) {
    return sendShelfError(res, error);
  }
});

app.put('/api/shelf/favorites/:recipeId', async (req, res) => {
  try {
    if (!requireShelf(res)) return undefined;
    const recipeId = String(req.params.recipeId || '').trim();
    if (!RECIPES.some((recipe) => recipe.id === recipeId)) {
      return res.status(400).json({ error: 'That recipe is not in the library.' });
    }
    if (req.body && req.body.favorite === false) {
      await shelf.removeFavorite(pool, shelf.parseUserId(req.user.id), recipeId);
      return res.json({ recipeId, favorite: false });
    }
    await shelf.addFavorite(pool, shelf.parseUserId(req.user.id), recipeId);
    return res.json({ recipeId, favorite: true });
  } catch (error) {
    return sendShelfError(res, error);
  }
});

app.post('/api/shelf/collections', async (req, res) => {
  try {
    if (!requireShelf(res)) return undefined;
    const collection = await shelf.createCollection(pool, shelf.parseUserId(req.user.id), req.body?.name);
    return res.status(201).json({ collection });
  } catch (error) {
    return sendShelfError(res, error);
  }
});

app.patch('/api/shelf/collections/:id', async (req, res) => {
  try {
    if (!requireShelf(res)) return undefined;
    const collectionId = shelf.parseCollectionId(req.params.id);
    if (!collectionId) return res.status(404).json({ error: 'That collection is not on your shelf.' });
    const collection = await shelf.renameCollection(pool, shelf.parseUserId(req.user.id), collectionId, req.body?.name);
    return collection
      ? res.json({ collection })
      : res.status(404).json({ error: 'That collection is not on your shelf.' });
  } catch (error) {
    return sendShelfError(res, error);
  }
});

app.delete('/api/shelf/collections/:id', async (req, res) => {
  try {
    if (!requireShelf(res)) return undefined;
    const collectionId = shelf.parseCollectionId(req.params.id);
    if (!collectionId) return res.status(404).json({ error: 'That collection is not on your shelf.' });
    const deleted = await shelf.deleteCollection(pool, shelf.parseUserId(req.user.id), collectionId);
    if (!deleted) return res.status(404).json({ error: 'That collection is not on your shelf.' });
    const model = await shelf.loadShelf(pool, shelf.parseUserId(req.user.id));
    return res.json({ deleted: true, ...model });
  } catch (error) {
    return sendShelfError(res, error);
  }
});

app.put('/api/shelf/collections/order', async (req, res) => {
  try {
    if (!requireShelf(res)) return undefined;
    const collections = await shelf.reorderCollections(pool, shelf.parseUserId(req.user.id), req.body?.collectionIds);
    return res.json({ collections });
  } catch (error) {
    return sendShelfError(res, error);
  }
});

app.put('/api/shelf/collections/:id/items/:recipeId', async (req, res) => {
  try {
    if (!requireShelf(res)) return undefined;
    const collectionId = shelf.parseCollectionId(req.params.id);
    const recipeId = String(req.params.recipeId || '').trim();
    if (!collectionId) return res.status(404).json({ error: 'That collection is not on your shelf.' });
    if (!RECIPES.some((recipe) => recipe.id === recipeId)) {
      return res.status(400).json({ error: 'That recipe is not in the library.' });
    }
    const userId = shelf.parseUserId(req.user.id);
    const collection = await shelf.getCollection(pool, userId, collectionId);
    if (!collection) return res.status(404).json({ error: 'That collection is not on your shelf.' });
    const items = await shelf.addCollectionItem(pool, userId, collectionId, recipeId);
    return res.json({ collectionId, items, memberships: items.map((item) => ({
      collectionId, collectionName: collection.name, recipeId: item.recipeId, position: item.position,
    })) });
  } catch (error) {
    return sendShelfError(res, error);
  }
});

app.delete('/api/shelf/collections/:id/items/:recipeId', async (req, res) => {
  try {
    if (!requireShelf(res)) return undefined;
    const collectionId = shelf.parseCollectionId(req.params.id);
    const recipeId = String(req.params.recipeId || '').trim();
    if (!collectionId) return res.status(404).json({ error: 'That collection is not on your shelf.' });
    const removed = await shelf.removeCollectionItem(pool, shelf.parseUserId(req.user.id), collectionId, recipeId);
    return removed
      ? res.status(204).end()
      : res.status(404).json({ error: 'That recipe is not in this collection.' });
  } catch (error) {
    return sendShelfError(res, error);
  }
});

app.put('/api/shelf/collections/:id/order', async (req, res) => {
  try {
    if (!requireShelf(res)) return undefined;
    const collectionId = shelf.parseCollectionId(req.params.id);
    if (!collectionId) return res.status(404).json({ error: 'That collection is not on your shelf.' });
    const items = await shelf.reorderCollectionItems(
      pool, shelf.parseUserId(req.user.id), collectionId, req.body?.recipeIds
    );
    return res.json({ collectionId, items });
  } catch (error) {
    return sendShelfError(res, error);
  }
});

app.get('/favicon.ico', (_req, res) => res.status(204).end());
app.use(express.static(path.join(__dirname, 'public'), { index: false }));

app.get('*', (req, res) => {
  if (!req.user) {
    const deepPath = /^\/[A-Za-z0-9\-._~!$&()*+,;=:@\/%?]*$/.test(req.originalUrl)
      ? `?path=${encodeURIComponent(req.originalUrl)}`
      : '';
    if (req.get('sec-fetch-dest') === 'document') {
      return res.redirect(302, `${PLATFORM_ORIGIN}/app/pourover-coffee-51aef8/full${deepPath}`);
    }
    return res.status(401).send(`<!doctype html><meta charset=utf-8><title>Open in Homeroom</title>
<body style="font-family:system-ui;background:#2c211a;color:#f4efe6;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0">
  <div style="max-width:24rem;padding:2rem;text-align:center">
    <h1 style="font-size:1.25rem;margin:0 0 0.5rem">Open Pourover Coffee inside Homeroom</h1>
    <p style="color:#cbb9a9;font-size:0.9rem;margin:0 0 1.25rem">Homeroom securely signs you in before opening the recipe timer.</p>
    <a href="${PLATFORM_ORIGIN}/app/pourover-coffee-51aef8/full${deepPath}" style="display:inline-block;padding:0.65rem 1rem;background:#b95332;color:white;border-radius:999px;text-decoration:none;font-size:0.9rem">Open in Homeroom</a>
  </div>
</body>`);
  }
  return res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[shutdown] ${signal} received, draining`);
  await new Promise((resolve) => {
    if (!server) return resolve();
    const deadline = setTimeout(() => {
      server.closeAllConnections?.();
      resolve();
    }, DRAIN_MS);
    deadline.unref?.();
    server.close(() => {
      clearTimeout(deadline);
      resolve();
    });
    server.closeIdleConnections?.();
    return undefined;
  });
  try {
    await pool?.end();
  } catch (error) {
    console.error(`Database shutdown failed: ${error.message}`);
  }
  process.exit(0);
}

async function boot() {
  try {
    await journal.initializeJournal(pool);
    await shelf.initializeShelf(pool);
  } catch (error) {
    console.error(`App schema failed: ${error.message}`);
    process.exit(1);
    return;
  }
  server = app.listen(port, () => console.log(`Listening on :${port}`));
  server.keepAliveTimeout = 75_000;
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

boot();
