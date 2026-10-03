(function (root, factory) {
  const api = factory(typeof module === 'object' && module.exports ? require('./recipes.js') : root.PouroverRecipes);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PouroverActiveBrew = api;
})(typeof window !== 'undefined' ? window : globalThis, function (recipes) {
  'use strict';

  const STORAGE_PREFIX = 'pourover-coffee:active-brew:v1:';
  const MAX_AGE_MS = 24 * 60 * 60 * 1000;
  const MAX_RECORD_LENGTH = 32_768;

  // This claim selects a device-local namespace only. It grants no access:
  // the server still verifies the token for every authenticated request.
  function ownerFromToken(token) {
    try {
      const encoded = String(token || '').split('.')[1];
      const claims = JSON.parse(atob(encoded.replace(/-/g, '+').replace(/_/g, '/')));
      return Number.isSafeInteger(claims.id) && claims.id > 0 ? String(claims.id) : null;
    } catch {
      return null;
    }
  }

  function elapsedSeconds(timer, now = Date.now()) {
    return timer.running
      ? timer.anchorElapsed + Math.max(0, now - timer.anchorTime) / 1000
      : timer.elapsed;
  }

  function validSnapshot(snapshot) {
    if (!snapshot || snapshot.schemaVersion !== 1
        || !Number.isSafeInteger(snapshot.version) || snapshot.version < 1
        || snapshot.revisionId !== `${snapshot.id}@${snapshot.version}`
        || !recipes.METHODS.some((method) => method.id === snapshot.methodId)
        || !Number.isInteger(snapshot.coffee) || snapshot.coffee < recipes.MIN_COFFEE_GRAMS
        || snapshot.coffee > recipes.MAX_COFFEE_GRAMS
        || !Number.isFinite(snapshot.ratio) || snapshot.ratio <= 0
        || !Number.isInteger(snapshot.water) || snapshot.water <= 0
        || !Array.isArray(snapshot.steps) || !snapshot.steps.length || snapshot.steps.length > 20
        || !snapshot.attribution || typeof snapshot.attribution.label !== 'string') return false;
    if (!['title', 'summary', 'result', 'temperature', 'grind', 'difficulty']
      .every((key) => typeof snapshot[key] === 'string')) return false;
    if (!recipes.TAG_KEYS.every((key) => Array.isArray(snapshot.tags?.[key])
      && snapshot.tags[key].every((value) => recipes.TAG_TAXONOMY[key].values.some((tag) => tag.value === value)))) return false;
    if (!snapshot.steps.every((step) => step && Object.hasOwn(recipes.STEP_ACTIONS, step.action)
      && Number.isInteger(step.duration) && step.duration >= 0 && step.duration <= 1800
      && typeof step.label === 'string' && typeof step.instruction === 'string'
      && typeof step.preparation === 'string'
      && (step.target === undefined || (Number.isFinite(step.target) && step.target >= 0))
      && (step.prepareLeadSeconds === undefined || (Number.isFinite(step.prepareLeadSeconds) && step.prepareLeadSeconds > 0)))) return false;
    const duration = snapshot.steps.reduce((sum, step) => sum + step.duration, 0);
    return duration > 0 && snapshot.totalDuration === duration;
  }

  function recipeFromSavedSnapshot(snapshot) {
    if (!validSnapshot(snapshot)) return null;
    if (!snapshot.isPersonal) return recipes.getRecipeRevision(snapshot.revisionId);
    if (!/^personal-[0-9a-f-]{36}$/i.test(snapshot.id)) return null;
    // The stored steps are already scaled to the saved dose. They form the
    // base of this exact private revision even when its API is unreachable.
    return { ...snapshot, defaultCoffee: snapshot.coffee, baseWater: snapshot.water };
  }

  function createStore(owner, { storage, now = () => Date.now() } = {}) {
    const key = owner ? `${STORAGE_PREFIX}${owner}` : null;
    function deviceStorage() {
      return storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    }
    function clear() {
      try { if (key) deviceStorage()?.removeItem(key); } catch { /* storage may be denied */ }
    }
    function save(recipe, coffee, timer) {
      if (!key) return false;
      if (!timer.started || timer.completed) { clear(); return false; }
      try {
        const savedAt = now();
        const record = {
          version: 1,
          savedAt,
          recipe: recipes.createRecipeSnapshot(recipe, coffee),
          running: timer.running,
          elapsedAtAnchor: timer.running ? timer.anchorElapsed : timer.elapsed,
          anchorTimestamp: timer.running ? timer.anchorTime : savedAt,
        };
        const serialized = JSON.stringify(record);
        if (serialized.length > MAX_RECORD_LENGTH) return false;
        const target = deviceStorage();
        if (!target) return false;
        target.setItem(key, serialized);
        return true;
      } catch { return false; }
    }
    function read() {
      if (!key) return null;
      try {
        const raw = deviceStorage()?.getItem(key);
        if (!raw) return null;
        if (raw.length > MAX_RECORD_LENGTH) { clear(); return null; }
        const record = JSON.parse(raw);
        const at = now();
        if (!record || record.version !== 1 || typeof record.running !== 'boolean'
            || !Number.isFinite(record.savedAt) || record.savedAt <= 0
            || record.savedAt > at + 300_000 || at - record.savedAt > MAX_AGE_MS
            || !Number.isFinite(record.anchorTimestamp) || record.anchorTimestamp <= 0
            || record.anchorTimestamp > record.savedAt
            || !Number.isFinite(record.elapsedAtAnchor) || record.elapsedAtAnchor < 0) {
          clear(); return null;
        }
        const recipe = recipeFromSavedSnapshot(record.recipe);
        if (!recipe || record.elapsedAtAnchor > record.recipe.totalDuration) { clear(); return null; }
        const elapsed = Math.min(record.recipe.totalDuration, record.elapsedAtAnchor
          + (record.running ? Math.max(0, at - record.anchorTimestamp) / 1000 : 0));
        const completed = elapsed >= record.recipe.totalDuration;
        if (completed) clear();
        return {
          recipe,
          coffee: record.recipe.coffee,
          timer: { elapsed, anchorElapsed: elapsed, anchorTime: at, running: record.running && !completed, started: true, completed },
        };
      } catch { clear(); return null; }
    }
    return { save, read, clear };
  }

  return { STORAGE_PREFIX, MAX_AGE_MS, ownerFromToken, elapsedSeconds, createStore };
});
