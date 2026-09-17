(function exposeBrewCues(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PouroverBrewCues = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createBrewCues() {
  'use strict';

  const CUE_STORAGE_KEY = 'pourover-cue-preferences-v1';
  const CUE_EVENTS = Object.freeze(['prepare', 'transition', 'pause', 'complete']);

  const DEFAULT_SETTINGS = Object.freeze({
    voice: { enabled: false, announcePrepare: true },
    sound: { enabled: false, patterns: { prepare: 'double', transition: 'single', pause: 'low', complete: 'rising' } },
    haptics: { enabled: true, patterns: { prepare: 'pulse', transition: 'single', pause: 'short', complete: 'long' } },
    largeDisplay: { enabled: false },
  });

  const SOUND_PATTERN_NAMES = Object.freeze(['single', 'double', 'low', 'rising']);
  const HAPTIC_PATTERN_NAMES = Object.freeze(['single', 'pulse', 'short', 'long']);

  // Haptic shapes are arrays passed straight to navigator.vibrate.
  const HAPTIC_PATTERNS = Object.freeze({
    single: [18],
    pulse: [12, 36, 12],
    short: [8],
    long: [60],
  });

  // Sound shapes are short WebAudio tone sequences: [freq Hz, offset s, length s].
  const SOUND_PATTERNS = Object.freeze({
    single: [[660, 0, 0.12]],
    double: [[660, 0, 0.1], [660, 0.18, 0.1]],
    low: [[330, 0, 0.16]],
    rising: [[520, 0, 0.12], [660, 0.16, 0.12], [780, 0.32, 0.18]],
  });

  function normalizePatternList(value, allowed, fallback) {
    if (typeof value !== 'string' || !allowed.includes(value)) return fallback;
    return value;
  }

  function normalizeSettings(raw) {
    const merged = {
      voice: { ...DEFAULT_SETTINGS.voice },
      sound: { enabled: false, patterns: { ...DEFAULT_SETTINGS.sound.patterns } },
      haptics: { enabled: true, patterns: { ...DEFAULT_SETTINGS.haptics.patterns } },
      largeDisplay: { ...DEFAULT_SETTINGS.largeDisplay },
    };
    if (!raw || typeof raw !== 'object') return merged;
    if (raw.voice && typeof raw.voice === 'object') {
      merged.voice.enabled = Boolean(raw.voice.enabled);
      merged.voice.announcePrepare = Boolean(raw.voice.announcePrepare);
    }
    if (raw.sound && typeof raw.sound === 'object') {
      merged.sound.enabled = Boolean(raw.sound.enabled);
      for (const event of CUE_EVENTS) {
        merged.sound.patterns[event] = normalizePatternList(
          raw.sound?.patterns?.[event],
          SOUND_PATTERN_NAMES,
          DEFAULT_SETTINGS.sound.patterns[event],
        );
      }
    }
    if (raw.haptics && typeof raw.haptics === 'object') {
      merged.haptics.enabled = Boolean(raw.haptics.enabled);
      for (const event of CUE_EVENTS) {
        merged.haptics.patterns[event] = normalizePatternList(
          raw.haptics?.patterns?.[event],
          HAPTIC_PATTERN_NAMES,
          DEFAULT_SETTINGS.haptics.patterns[event],
        );
      }
    }
    if (raw.largeDisplay && typeof raw.largeDisplay === 'object') {
      merged.largeDisplay.enabled = Boolean(raw.largeDisplay.enabled);
    }
    return merged;
  }

  function loadSettings(storage = null) {
    try {
      const store = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
      const raw = store ? store.getItem(CUE_STORAGE_KEY) : null;
      return normalizeSettings(raw ? JSON.parse(raw) : null);
    } catch {
      return normalizeSettings(null);
    }
  }

  function saveSettings(settings, storage = null) {
    try {
      const store = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
      if (store) store.setItem(CUE_STORAGE_KEY, JSON.stringify(settings));
      return true;
    } catch {
      return false;
    }
  }

  // Spoken form for a cue event. Audio-only use still names the current
  // action, the target, and the next boundary.
  function spokenText(event, context = {}) {
    const { action, target, nextBoundary } = context;
    const parts = [];
    if (event === 'transition' || event === 'complete') {
      if (event === 'complete') parts.push('Brew complete');
      else parts.push(action || 'Next step');
      if (target) parts.push(`Pour to ${target}`);
      if (nextBoundary) parts.push(nextBoundary);
    } else if (event === 'prepare') {
      parts.push(`${action || 'Next step'} in ${Math.max(1, Math.round(context.secondsUntilNext || 0))} seconds`);
      if (target) parts.push(`Pour to ${target}`);
    } else if (event === 'pause') {
      parts.push('Timer paused');
      if (nextBoundary) parts.push(nextBoundary);
    }
    return parts.join('. ').replace(/\.\./g, '.').trim();
  }

  function createCueRunner(settings, options = {}) {
    const active = normalizeSettings(settings);
    const now = options.now || (() => Date.now());
    const win = options.window || (typeof window !== 'undefined' ? window : null);
    const speech = options.speech
      || (typeof window !== 'undefined' && window.speechSynthesis ? window.speechSynthesis : null);
    const audioContext = options.audioContext || null;
    const UtteranceCtor = options.SpeechSynthesisUtterance
      || (typeof SpeechSynthesisUtterance !== 'undefined' ? SpeechSynthesisUtterance : null);
    let audio = audioContext;
    let lastFired = { prepare: -1, transition: -1, pause: -1, complete: -1 };

    function ensureAudio() {
      if (!active.sound.enabled) return null;
      if (audio) return audio;
      const Ctx = win && (win.AudioContext || win.webkitAudioContext);
      if (!Ctx) return null;
      try { audio = new Ctx(); } catch { return null; }
      return audio;
    }

    function unlockAudio() {
      const ctx = ensureAudio();
      if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
    }

    function playSound(patternName) {
      const ctx = ensureAudio();
      if (!ctx || ctx.state !== 'running') return;
      const tones = SOUND_PATTERNS[patternName] || [];
      for (const [freq, offset, length] of tones) {
        try {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.value = freq;
          const start = ctx.currentTime + offset;
          gain.gain.setValueAtTime(0.0001, start);
          gain.gain.exponentialRampToValueAtTime(0.18, start + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
          osc.connect(gain).connect(ctx.destination);
          osc.start(start);
          osc.stop(start + length + 0.05);
        } catch { /* one failed tone must not block the rest */ }
      }
    }

    function speak(text) {
      if (!speech || !text) return;
      try {
        speech.cancel();
        const utterance = UtteranceCtor ? new UtteranceCtor(text) : { text };
        utterance.rate = 1;
        utterance.volume = 1;
        speech.speak(utterance);
      } catch { /* speech unsupported in this frame */ }
    }

    function vibrate(patternName) {
      if (!active.haptics.enabled || !win?.navigator?.vibrate) return;
      try { win.navigator.vibrate(HAPTIC_PATTERNS[patternName] || []); } catch { /* ignore */ }
    }

    function fire(event, context = {}) {
      if (!CUE_EVENTS.includes(event)) return;
      const key = context.stepKey ?? context.stepIndex ?? event;
      if (lastFired[event] === key) return; // dedupe identical renders of the same event
      lastFired[event] = key;
      if (event === 'prepare' && !active.voice.announcePrepare && !active.sound.enabled && !active.haptics.enabled) return;
      if (active.voice.enabled) {
        if (event !== 'prepare' || active.voice.announcePrepare) speak(spokenText(event, context));
      }
      if (active.sound.enabled) playSound(active.sound.patterns[event]);
      if (active.haptics.enabled) vibrate(active.haptics.patterns[event]);
    }

    function cancel() {
      lastFired = { prepare: -1, transition: -1, pause: -1, complete: -1 };
      try { speech?.cancel(); } catch { /* ignore */ }
    }

    function updateSettings(next) {
      Object.assign(active, normalizeSettings(next));
      cancel();
    }

    return { fire, cancel, unlockAudio, updateSettings, getSettings: () => active, _now: now };
  }

  return {
    CUE_STORAGE_KEY,
    CUE_EVENTS,
    DEFAULT_SETTINGS,
    SOUND_PATTERN_NAMES,
    HAPTIC_PATTERN_NAMES,
    HAPTIC_PATTERNS,
    SOUND_PATTERNS,
    normalizeSettings,
    loadSettings,
    saveSettings,
    spokenText,
    createCueRunner,
  };
});
