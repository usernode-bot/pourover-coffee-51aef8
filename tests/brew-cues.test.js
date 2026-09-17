const test = require('node:test');
const assert = require('node:assert/strict');

const {
  CUE_EVENTS,
  DEFAULT_SETTINGS,
  HAPTIC_PATTERN_NAMES,
  SOUND_PATTERN_NAMES,
  createCueRunner,
  normalizeSettings,
  loadSettings,
  saveSettings,
  spokenText,
} = require('../public/brew-cues.js');

function fakeStorage(initial = {}) {
  const data = { ...initial };
  return {
    getItem: (key) => (key in data ? data[key] : null),
    setItem: (key, value) => { data[key] = String(value); },
  };
}

function makeRunner(settings, overrides = {}) {
  const calls = { spoken: [], vibrated: [] };
  const speech = {
    cancel() { calls.spoken.push('<cancel>'); },
    speak(u) { calls.spoken.push(u.text); },
  };
  const navigator = { vibrate(pattern) { calls.vibrated.push(pattern); } };
  const runner = createCueRunner(settings, {
    window: { navigator },
    speech,
    ...overrides,
  });
  return { runner, calls };
}

test('settings normalize to safe defaults', () => {
  const settings = normalizeSettings(null);
  assert.deepEqual(settings, DEFAULT_SETTINGS);
  assert.equal(settings.voice.enabled, false);
  assert.equal(settings.sound.enabled, false);
  assert.equal(settings.haptics.enabled, true);
  assert.equal(settings.largeDisplay.enabled, false);
});

test('malformed settings fall back to defaults per section', () => {
  const settings = normalizeSettings({
    voice: 'nope',
    sound: { enabled: 'yes', patterns: { prepare: 'not-a-pattern', complete: 'rising' } },
    haptics: { enabled: 1, patterns: { pause: 'long', bogus: 'x' } },
    largeDisplay: { enabled: true },
  });
  assert.equal(settings.voice.enabled, false);
  assert.equal(settings.sound.enabled, true);
  assert.equal(settings.sound.patterns.prepare, 'double');
  assert.equal(settings.sound.patterns.complete, 'rising');
  assert.equal(settings.haptics.enabled, true);
  assert.equal(settings.haptics.patterns.pause, 'long');
  assert.equal(settings.largeDisplay.enabled, true);
});

test('every cue event has a default sound and haptic pattern', () => {
  for (const event of CUE_EVENTS) {
    assert.ok(SOUND_PATTERN_NAMES.includes(DEFAULT_SETTINGS.sound.patterns[event]));
    assert.ok(HAPTIC_PATTERN_NAMES.includes(DEFAULT_SETTINGS.haptics.patterns[event]));
  }
});

test('preferences persist and reload from storage', () => {
  const storage = fakeStorage();
  const saved = normalizeSettings({ voice: { enabled: true, announcePrepare: false }, largeDisplay: { enabled: true } });
  saveSettings(saved, storage);
  const loaded = loadSettings(storage);
  assert.equal(loaded.voice.enabled, true);
  assert.equal(loaded.voice.announcePrepare, false);
  assert.equal(loaded.largeDisplay.enabled, true);
  assert.equal(loaded.haptics.enabled, true);
});

test('transition cue speaks action, target, and next boundary', () => {
  const { runner, calls } = makeRunner({ voice: { enabled: true, announcePrepare: true }, haptics: { enabled: false } });
  runner.fire('transition', { action: 'Pour', target: '150g', nextBoundary: 'Swirl in 30 seconds', stepIndex: 1 });
  assert.deepEqual(calls.spoken, ['<cancel>', 'Pour. Pour to 150g. Swirl in 30 seconds']);
});

test('prepare cue includes countdown and target', () => {
  const text = spokenText('prepare', { action: 'Swirl', secondsUntilNext: 15, target: '250g' });
  assert.match(text, /Swirl in 15 seconds/);
  assert.match(text, /Pour to 250g/);
});

test('complete cue announces brew completion', () => {
  const { runner, calls } = makeRunner({ voice: { enabled: true }, haptics: { enabled: false } });
  runner.fire('complete', {});
  assert.deepEqual(calls.spoken, ['<cancel>', 'Brew complete']);
});

test('disabled cues are silent no-ops and never block the timer', () => {
  const { runner, calls } = makeRunner({ haptics: { enabled: false } });
  runner.fire('transition', { action: 'Pour', stepIndex: 2 });
  assert.deepEqual(calls.spoken, []);
  assert.deepEqual(calls.vibrated, []);
});

test('haptic patterns fire through navigator.vibrate', () => {
  const { runner, calls } = makeRunner({ haptics: { enabled: true, patterns: { transition: 'pulse' } } });
  runner.fire('transition', { action: 'Pour', stepIndex: 3 });
  assert.deepEqual(calls.vibrated, [[12, 36, 12]]);
});

test('identical events for the same step fire once', () => {
  const { runner, calls } = makeRunner({ haptics: { enabled: true, patterns: { transition: 'single' } } });
  runner.fire('transition', { action: 'Pour', stepIndex: 1 });
  runner.fire('transition', { action: 'Pour', stepIndex: 1 });
  runner.fire('transition', { action: 'Swirl', stepIndex: 2 });
  assert.equal(calls.vibrated.length, 2);
  assert.equal(calls.spoken.length, 0);
});

test('cancel resets dedupe and stops pending speech', () => {
  const { runner, calls } = makeRunner({ voice: { enabled: true }, haptics: { enabled: false } });
  runner.fire('transition', { action: 'Pour', stepIndex: 1 });
  runner.cancel();
  runner.fire('transition', { action: 'Pour', stepIndex: 1 });
  assert.equal(calls.spoken.length, 5); // speak, then cancel + speak, then cancel + speak
});

test('updateSettings applies new preferences mid-run', () => {
  const { runner, calls } = makeRunner({ haptics: { enabled: false } });
  runner.updateSettings({ haptics: { enabled: true, patterns: { prepare: 'long' } } });
  runner.fire('prepare', { action: 'Pour', stepIndex: 0 });
  assert.deepEqual(calls.vibrated, [[60]]);
});

test('missing speech and vibrate APIs degrade without throwing', () => {
  const runner = createCueRunner({ voice: { enabled: true }, haptics: { enabled: true } }, { window: {}, speech: null });
  assert.doesNotThrow(() => {
    runner.fire('transition', { action: 'Pour', stepIndex: 5 });
    runner.fire('complete', {});
    runner.cancel();
  });
});

test('audio-only use still communicates action, target, and next boundary', () => {
  const text = spokenText('transition', {
    action: 'Pour', target: '150 grams', nextBoundary: 'Next, swirl at 1:15',
  });
  assert.ok(text.includes('Pour') && text.includes('150 grams') && text.includes('swirl at 1:15'));
});
