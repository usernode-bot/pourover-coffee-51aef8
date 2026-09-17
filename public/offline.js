// Durable offline mutation queue for Pourover Coffee.
// Journal, favorite, and personal-recipe writes are stored in localStorage and
// replayed with idempotency keys after the connection returns.
'use strict';

const PouroverOffline = (() => {
  const QUEUE_KEY = 'pourover-coffee:offline-queue:v1';
  const TOKEN_KEY = 'pourover-coffee:auth-token:v1';
  const MAX_ATTEMPTS = 5;
  const IDEMPOTENT_METHODS = new Set(['POST', 'PUT', 'PATCH']);

  let queue = [];
  let token = '';
  let flushing = false;
  const listeners = new Set();

  function emit() {
    const snapshot = status();
    listeners.forEach((listener) => {
      try { listener(snapshot); } catch (_) {}
    });
  }

  function status() {
    const pending = queue.filter((item) => item.status === 'pending');
    const failed = queue.filter((item) => item.status === 'failed');
    const conflicts = queue.filter((item) => item.status === 'conflict');
    return {
      pendingCount: pending.length,
      failedCount: failed.length,
      conflictCount: conflicts.length,
      failedIds: failed.map((item) => item.id),
      conflictIds: conflicts.map((item) => item.id),
      queuedWrites: queue.length,
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(QUEUE_KEY);
      queue = Array.isArray(JSON.parse(raw)) ? JSON.parse(raw) : [];
    } catch (_) {
      queue = [];
    }
  }

  function persist() {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    emit();
  }

  function readStoredToken() {
    try { return localStorage.getItem(TOKEN_KEY) || ''; } catch (_) { return ''; }
  }

  function rememberToken(value) {
    const candidate = String(value || '').trim();
    if (candidate) {
      token = candidate;
      try { localStorage.setItem(TOKEN_KEY, candidate); } catch (_) {}
    }
  }

  function conflictDetected(error) {
    return error instanceof Error && error.conflict === true;
  }

  function statusFromError(error) {
    if (error && error.conflict) return 'conflict';
    if (error && error.fatal) return 'failed';
    return 'pending';
  }

  async function flush() {
    if (flushing || !token) return;
    flushing = true;
    try {
      for (const item of queue) {
        if (item.status !== 'pending') continue;
        try {
          const response = await fetch(item.path, {
            method: item.method,
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
              'x-usernode-token': token,
              'x-idempotency-key': item.id,
              'x-queued-at': item.queuedAt,
            },
            body: item.body ? JSON.stringify(item.body) : undefined,
          });
          if (response.ok) {
            queue = queue.filter((candidate) => candidate.id !== item.id);
            persist();
          } else if (response.status === 409) {
            item.status = 'conflict';
            item.error = 'The server has newer changes for this record.';
            persist();
          } else if (response.status === 404) {
            // The record no longer exists; a retry can never succeed.
            item.status = 'failed';
            item.error = 'That record no longer exists on the server.';
            persist();
          } else if (response.status === 401) {
            // Token invalid; stop flushing and surface the queue.
            break;
          } else if (response.status === 400) {
            item.status = 'failed';
            const payload = await response.json().catch(() => ({}));
            item.error = payload.error || 'The queued change could not be applied.';
            persist();
          } else {
            item.attempts = (item.attempts || 0) + 1;
            if (item.attempts >= MAX_ATTEMPTS) {
              item.status = 'failed';
              item.error = 'Sync failed repeatedly. You can discard this change.';
            }
            persist();
          }
        } catch (error) {
          if (!navigator.onLine) break;
          item.attempts = (item.attempts || 0) + 1;
          if (item.attempts >= MAX_ATTEMPTS) {
            item.status = 'failed';
            item.error = 'Sync failed repeatedly. You can discard this change.';
          }
          persist();
        }
      }
    } finally {
      flushing = false;
      emit();
    }
  }

  function queueWrite(path, method = 'POST', body = null) {
    const entry = {
      id: crypto.randomUUID ? crypto.randomUUID() : `q-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      path,
      method,
      body,
      queuedAt: new Date().toISOString(),
      attempts: 0,
      status: 'pending',
      label: `${method} ${path}`,
    };
    queue.push(entry);
    persist();
    if (navigator.onLine) flush();
    return entry.id;
  }

  function discard(id) {
    queue = queue.filter((item) => item.id !== id);
    persist();
  }

  function retry(id) {
    const item = queue.find((candidate) => candidate.id === id);
    if (!item) return;
    item.status = 'pending';
    item.attempts = 0;
    item.error = null;
    persist();
    flush();
  }

  function init(appToken) {
    rememberToken(appToken);
    load();
    window.addEventListener('online', () => flush());
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') flush();
    });
    if (navigator.onLine) flush();
    emit();
  }

  return {
    init,
    tokenForOfflineUse: () => readStoredToken(),
    queueItems: () => queue.slice(),
    queueWrite,
    discard,
    retry,
    flush,
    status,
    rememberToken,
    subscribe: (listener) => { listeners.add(listener); return () => listeners.delete(listener); },
  };
})();
window.PouroverOffline = PouroverOffline;
