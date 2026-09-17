'use strict';

const express = require('express');
const path = require('path');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const {
  METHODS,
  RECIPES,
  RECIPE_REVISIONS,
  createRecipeSnapshot,
  getRecipeRevision,
  isCurrentRecipeRevision,
} = require('./public/recipes');
const journal = require('./journal-store');
const collections = require('./collection-store');

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

function requireShelf(res) {
  if (pool) return true;
  res.status(503).json({ error: 'Favorites and collections are unavailable right now.' });
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

// ---------------------------------------------------------------------------
// Recipe favorites and personal collections.
//
// These records belong to one Homeroom user, so every route derives the owner
// from the verified token and never from the request body. `?demo=1` serves a
// read-only staging shelf so a preview is reviewable without a signed-in
// account's private rows.
// ---------------------------------------------------------------------------

function recipeSummary(recipe) {
  const method = METHODS.find((candidate) => candidate.id === recipe.methodId) || METHODS[0];
  return {
    id: recipe.id,
    revisionId: recipe.revisionId,
    version: recipe.version,
    methodId: method.id,
    methodName: method.name,
    title: recipe.title,
    summary: recipe.summary,
    ratio: recipe.ratio,
    defaultCoffee: recipe.defaultCoffee,
    water: Math.round(recipe.defaultCoffee * recipe.ratio),
    totalDuration: recipe.steps.reduce((sum, step) => sum + step.duration, 0),
    difficulty: recipe.difficulty,
    tags: recipe.tags,
    accent: method.accent,
    soft: method.soft,
  };
}

// Stable recipe ids resolve to the latest revision, and ids that no longer
// exist are dropped rather than failing the whole shelf. That is what keeps a
// favorite or a collection working when a recipe later gains a revision.
function knownRecipeSummaries(recipeIds) {
  return recipeIds
    .map((recipeId) => RECIPES.find((recipe) => recipe.id === recipeId))
    .filter(Boolean)
    .map(recipeSummary);
}

// One client shape for a collection: hydrated latest-revision summaries, in
// the stored order. Every collection route returns this, so the frontend
// never has to resolve recipe ids itself.
function collectionForClient(collection) {
  return {
    id: collection.id,
    name: collection.name,
    recipes: knownRecipeSummaries(collection.recipeIds || []),
  };
}

function demoCollections() {
  return [
    { id: 'demo-weekday', name: 'Staging demo: Weekday mornings', recipeIds: ['v60-bright', 'mugen-one-pour', 'clever-quick-clean'] },
    { id: 'demo-treats', name: 'Staging demo: Weekend treats', recipeIds: ['cotton-silky', 'switch-full-immersion'] },
  ];
}

function demoFavorites() {
  return ['v60-sweet-pulse', 'switch-hybrid', 'cotton-silky'];
}

function demoRecentlyBrewed() {
  return ['v60-sweet-pulse', 'switch-full-immersion', 'v60-gentle-large'];
}

function sendShelfError(res, error) {
  if (error instanceof collections.CollectionValidationError) {
    return res.status(400).json({ error: error.message });
  }
  console.error(`Shelf request failed: ${error.message}`);
  return res.status(500).json({ error: 'The shelf could not complete that request.' });
}

app.get('/api/shelf', async (req, res) => {
  try {
    if (IS_STAGING && req.query.demo === '1') {
      return res.json({
        demo: true,
        favorites: knownRecipeSummaries(demoFavorites()),
        collections: demoCollections().map(collectionForClient),
        recentlyBrewed: knownRecipeSummaries(demoRecentlyBrewed()),
      });
    }
    if (!requireShelf(res)) return undefined;
    const shelf = await collections.loadShelf(pool, req.user.id);
    return res.json({
      demo: false,
      favorites: knownRecipeSummaries(shelf.favorites),
      collections: shelf.collections.map(collectionForClient),
      recentlyBrewed: knownRecipeSummaries(shelf.recentlyBrewed),
    });
  } catch (error) {
    return sendShelfError(res, error);
  }
});

app.get('/api/favorites', async (req, res) => {
  try {
    if (!requireShelf(res)) return undefined;
    return res.json({ recipeIds: await collections.listFavorites(pool, req.user.id) });
  } catch (error) {
    return sendShelfError(res, error);
  }
});

app.put('/api/favorites/:recipeId', async (req, res) => {
  try {
    if (!requireShelf(res)) return undefined;
    const recipeId = collections.normalizeRecipeId(req.params.recipeId);
    if (!RECIPES.some((recipe) => recipe.id === recipeId)) {
      return res.status(404).json({ error: 'That recipe is not available.' });
    }
    await collections.addFavorite(pool, req.user.id, recipeId);
    return res.json({ recipeId, favorite: true });
  } catch (error) {
    return sendShelfError(res, error);
  }
});

app.delete('/api/favorites/:recipeId', async (req, res) => {
  try {
    if (!requireShelf(res)) return undefined;
    const recipeId = collections.normalizeRecipeId(req.params.recipeId);
    await collections.removeFavorite(pool, req.user.id, recipeId);
    return res.json({ recipeId, favorite: false });
  } catch (error) {
    return sendShelfError(res, error);
  }
});

app.get('/api/collections', async (req, res) => {
  try {
    if (!requireShelf(res)) return undefined;
    const list = await collections.listCollections(pool, req.user.id);
    return res.json({ collections: list.map(collectionForClient) });
  } catch (error) {
    return sendShelfError(res, error);
  }
});

app.post('/api/collections', async (req, res) => {
  try {
    if (!requireShelf(res)) return undefined;
    const collection = await collections.createCollection(pool, req.user.id, req.body?.name);
    return res.status(201).json({ collection: collectionForClient(collection) });
  } catch (error) {
    return sendShelfError(res, error);
  }
});

app.patch('/api/collections/order', async (req, res) => {
  try {
    if (!requireShelf(res)) return undefined;
    const list = await collections.reorderCollections(pool, req.user.id, req.body?.collectionIds);
    return res.json({ collections: list.map(collectionForClient) });
  } catch (error) {
    return sendShelfError(res, error);
  }
});

app.patch('/api/collections/:id', async (req, res) => {
  try {
    if (!requireShelf(res)) return undefined;
    const collectionId = collections.parseCollectionId(req.params.id);
    if (!collectionId) return res.status(404).json({ error: 'Collection not found.' });
    const renamed = await collections.renameCollection(pool, req.user.id, collectionId, req.body?.name);
    if (!renamed) return res.status(404).json({ error: 'Collection not found.' });
    return res.json({ collection: collectionForClient(await collections.getCollection(pool, req.user.id, collectionId)) });
  } catch (error) {
    return sendShelfError(res, error);
  }
});

app.delete('/api/collections/:id', async (req, res) => {
  try {
    if (!requireShelf(res)) return undefined;
    const collectionId = collections.parseCollectionId(req.params.id);
    if (!collectionId) return res.status(404).json({ error: 'Collection not found.' });
    const deleted = await collections.deleteCollection(pool, req.user.id, collectionId);
    return deleted ? res.status(204).end() : res.status(404).json({ error: 'Collection not found.' });
  } catch (error) {
    return sendShelfError(res, error);
  }
});

app.post('/api/collections/:id/recipes', async (req, res) => {
  try {
    if (!requireShelf(res)) return undefined;
    const collectionId = collections.parseCollectionId(req.params.id);
    if (!collectionId) return res.status(404).json({ error: 'Collection not found.' });
    const recipeId = collections.normalizeRecipeId(req.body?.recipeId);
    if (!RECIPES.some((recipe) => recipe.id === recipeId)) {
      return res.status(404).json({ error: 'That recipe is not available.' });
    }
    const collection = await collections.addRecipeToCollection(pool, req.user.id, collectionId, recipeId);
    if (!collection) return res.status(404).json({ error: 'Collection not found.' });
    return res.status(201).json({ collection: collectionForClient(collection) });
  } catch (error) {
    return sendShelfError(res, error);
  }
});

app.delete('/api/collections/:id/recipes/:recipeId', async (req, res) => {
  try {
    if (!requireShelf(res)) return undefined;
    const collectionId = collections.parseCollectionId(req.params.id);
    if (!collectionId) return res.status(404).json({ error: 'Collection not found.' });
    const collection = await collections.removeRecipeFromCollection(
      pool, req.user.id, collectionId, req.params.recipeId
    );
    if (!collection) return res.status(404).json({ error: 'Collection not found.' });
    return res.json({ collection });
  } catch (error) {
    return sendShelfError(res, error);
  }
});

app.patch('/api/collections/:id/order', async (req, res) => {
  try {
    if (!requireShelf(res)) return undefined;
    const collectionId = collections.parseCollectionId(req.params.id);
    if (!collectionId) return res.status(404).json({ error: 'Collection not found.' });
    const collection = await collections.reorderCollectionRecipes(
      pool, req.user.id, collectionId, req.body?.recipeIds
    );
    if (!collection) return res.status(404).json({ error: 'Collection not found.' });
    return res.json({ collection: collectionForClient(collection) });
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
    await collections.initializeCollections(pool);
  } catch (error) {
    console.error(`Brew journal schema failed: ${error.message}`);
    process.exit(1);
    return;
  }
  server = app.listen(port, () => console.log(`Listening on :${port}`));
  server.keepAliveTimeout = 75_000;
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

boot();
