(function startPouroverApp() {
  'use strict';

  const {
    FILTER_KEYS,
    MAX_COFFEE_GRAMS,
    METHODS,
    MIN_COFFEE_GRAMS,
    RECIPES,
    RECIPE_REVISIONS,
    TAG_KEYS,
    TAG_TAXONOMY,
    clampCoffee,
    filterRecipes,
    formatDuration,
    getBrewTiming,
    getMethod,
    getRecipe,
    getRecipeRevision,
    getRecipesForMethod,
    getStepStart,
    getTagLabel,
    isCurrentRecipeRevision,
    normalizeFilters,
    scaleRecipe,
  } = window.PouroverRecipes;

  const screens = {
    library: document.getElementById('library-screen'),
    method: document.getElementById('method-screen'),
    recipe: document.getElementById('recipe-screen'),
    brew: document.getElementById('brew-screen'),
    journal: document.getElementById('journal-screen'),
    journalDetail: document.getElementById('journal-detail-screen'),
    journalForm: document.getElementById('journal-form-screen'),
  };

  const elements = {
    back: document.getElementById('back-button'),
    home: document.getElementById('home-button'),
    journalButton: document.getElementById('journal-button'),
    about: document.getElementById('about-button'),
    methodList: document.getElementById('method-list'),
    recipeList: document.getElementById('recipe-list'),
    resultCount: document.getElementById('recipe-result-count'),
    filters: document.getElementById('recipe-filters'),
    activeFilters: document.getElementById('active-filters'),
    clearFilters: document.getElementById('clear-filters'),
    emptyState: document.getElementById('recipe-empty-state'),
    emptyClear: document.getElementById('empty-clear-filters'),
    methodHero: document.getElementById('method-hero'),
    methodArt: document.getElementById('method-art'),
    methodCharacter: document.getElementById('method-character'),
    methodTitle: document.getElementById('method-title'),
    methodDescription: document.getElementById('method-description'),
    methodRecipeCount: document.getElementById('method-recipe-count'),
    methodRecipeList: document.getElementById('method-recipe-list'),
    methodBrowseAll: document.getElementById('method-browse-all'),
    recipeHero: document.getElementById('recipe-hero'),
    recipeArt: document.getElementById('recipe-art'),
    recipeCharacter: document.getElementById('recipe-character'),
    recipeTitle: document.getElementById('recipe-title'),
    recipeDescription: document.getElementById('recipe-description'),
    recipeAttribution: document.getElementById('recipe-attribution'),
    recipeResult: document.getElementById('recipe-result'),
    recipeTagGroups: document.getElementById('recipe-tag-groups'),
    coffeeDose: document.getElementById('coffee-dose'),
    doseMinus: document.getElementById('dose-minus'),
    dosePlus: document.getElementById('dose-plus'),
    waterTotal: document.getElementById('water-total'),
    recipeRatio: document.getElementById('recipe-ratio'),
    recipeTemperature: document.getElementById('recipe-temperature'),
    recipeGrind: document.getElementById('recipe-grind'),
    recipeDuration: document.getElementById('recipe-duration'),
    recipeDifficulty: document.getElementById('recipe-difficulty'),
    recipeEquipment: document.getElementById('recipe-equipment'),
    stepCount: document.getElementById('step-count'),
    recipeSteps: document.getElementById('recipe-steps'),
    startBrew: document.getElementById('start-brew-button'),
    brewMethod: document.getElementById('brew-method'),
    brewTitle: document.getElementById('brew-title'),
    brewDose: document.getElementById('brew-dose'),
    brewRatio: document.getElementById('brew-ratio'),
    timerPanel: document.getElementById('timer-panel'),
    timerRing: document.getElementById('timer-ring'),
    timerStepKicker: document.getElementById('timer-step-kicker'),
    timerClock: document.getElementById('timer-clock'),
    timerTotal: document.getElementById('timer-total'),
    activeStepNumber: document.getElementById('active-step-number'),
    activeStepLabel: document.getElementById('active-step-label'),
    activeWaterTarget: document.getElementById('active-water-target'),
    activeStepInstruction: document.getElementById('active-step-instruction'),
    nextStepPreview: document.getElementById('next-step-preview'),
    nextStepKicker: document.getElementById('next-step-kicker'),
    nextStepTiming: document.getElementById('next-step-timing'),
    nextStepLabel: document.getElementById('next-step-label'),
    nextStepPreparation: document.getElementById('next-step-preparation'),
    nextStepTargetWrap: document.getElementById('next-step-target-wrap'),
    nextStepTarget: document.getElementById('next-step-target'),
    timerAnnouncement: document.getElementById('timer-announcement'),
    stepProgress: document.getElementById('step-progress'),
    previousStep: document.getElementById('previous-step'),
    nextStep: document.getElementById('next-step'),
    timerToggle: document.getElementById('timer-toggle'),
    timerToggleIcon: document.getElementById('timer-toggle-icon'),
    timerToggleLabel: document.getElementById('timer-toggle-label'),
    resetTimer: document.getElementById('reset-timer'),
    brewComplete: document.getElementById('brew-complete'),
    saveBrewNotes: document.getElementById('save-brew-notes'),
    brewAgain: document.getElementById('brew-again'),
    returnToRecipe: document.getElementById('return-to-recipe'),
    journalCount: document.getElementById('journal-count'),
    journalNew: document.getElementById('journal-new'),
    journalFilters: document.getElementById('journal-filters'),
    journalClearFilters: document.getElementById('journal-clear-filters'),
    journalStatus: document.getElementById('journal-status'),
    journalList: document.getElementById('journal-list'),
    journalEmpty: document.getElementById('journal-empty'),
    journalEmptyCopy: document.getElementById('journal-empty-copy'),
    journalEmptyAction: document.getElementById('journal-empty-action'),
    journalError: document.getElementById('journal-error'),
    journalErrorCopy: document.getElementById('journal-error-copy'),
    journalRetry: document.getElementById('journal-retry'),
    journalDetailMethod: document.getElementById('journal-detail-method'),
    journalDetailTitle: document.getElementById('journal-detail-title'),
    journalDetailDate: document.getElementById('journal-detail-date'),
    journalDetailVersion: document.getElementById('journal-detail-version'),
    journalDemoBadge: document.getElementById('journal-demo-badge'),
    journalVersionStatus: document.getElementById('journal-version-status'),
    journalSnapshotDetails: document.getElementById('journal-snapshot-details'),
    journalTasteScores: document.getElementById('journal-taste-scores'),
    journalSetupDetails: document.getElementById('journal-setup-details'),
    journalDetailNotes: document.getElementById('journal-detail-notes'),
    journalDetailChange: document.getElementById('journal-detail-change'),
    journalDetailActions: document.getElementById('journal-detail-actions'),
    journalRepeat: document.getElementById('journal-repeat'),
    journalEdit: document.getElementById('journal-edit'),
    journalDelete: document.getElementById('journal-delete'),
    journalDeleteConfirmation: document.getElementById('journal-delete-confirmation'),
    journalDeleteCancel: document.getElementById('journal-delete-cancel'),
    journalDeleteConfirm: document.getElementById('journal-delete-confirm'),
    journalDetailError: document.getElementById('journal-detail-error'),
    journalFormKicker: document.getElementById('journal-form-kicker'),
    journalFormTitle: document.getElementById('journal-form-title'),
    journalFormIntro: document.getElementById('journal-form-intro'),
    journalEntryForm: document.getElementById('journal-entry-form'),
    journalFormVersion: document.getElementById('journal-form-version'),
    journalFormSnapshotNote: document.getElementById('journal-form-snapshot-note'),
    journalFormRecipe: document.getElementById('journal-form-recipe'),
    journalFormDose: document.getElementById('journal-form-dose'),
    journalFormBrewedAt: document.getElementById('journal-form-brewed-at'),
    journalFormError: document.getElementById('journal-form-error'),
    journalFormSave: document.getElementById('journal-form-save'),
    journalFormCancel: document.getElementById('journal-form-cancel'),
  };

  const DOSE_STORAGE_KEY = 'pourover-coffee:doses:v1';
  const FILTER_PARAM = Object.freeze({ method: 'filterMethod' });
  const APP_TOKEN = new URLSearchParams(window.location.search).get('token') || '';
  const state = {
    screen: 'library',
    method: METHODS[0],
    recipe: RECIPES[0],
    scaled: scaleRecipe(RECIPES[0], RECIPES[0].defaultCoffee),
    doses: loadDoses(),
    filters: {},
    timer: freshTimer(),
    timerHandle: null,
    lastAnnouncedStep: -1,
    lastPreparationAnnouncementStep: -1,
    lastPreparationHapticStep: -1,
    journal: {
      entries: [],
      entry: null,
      demo: false,
      filters: {},
      formMode: 'create',
      formSource: 'manual',
      returnTo: 'journal',
    },
  };

  function loadDoses() {
    try {
      const stored = JSON.parse(localStorage.getItem(DOSE_STORAGE_KEY) || '{}');
      return stored && typeof stored === 'object' ? stored : {};
    } catch {
      return {};
    }
  }

  function saveDoses() {
    try {
      localStorage.setItem(DOSE_STORAGE_KEY, JSON.stringify(state.doses));
    } catch {
      // Private browsing may decline storage. The current brew still works.
    }
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function formatDate(value, includeTime = false) {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return '';
    return new Intl.DateTimeFormat(undefined, includeTime
      ? { dateStyle: 'medium', timeStyle: 'short' }
      : { dateStyle: 'medium' }).format(date);
  }

  function toDateTimeLocal(value = new Date()) {
    const date = new Date(value);
    const offset = date.getTimezoneOffset() * 60_000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  }

  async function apiFetch(path, options = {}) {
    const headers = {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(APP_TOKEN ? { 'x-usernode-token': APP_TOKEN } : {}),
      ...(options.headers || {}),
    };
    const response = await fetch(path, { ...options, headers });
    if (response.status === 204) return null;
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || 'The brew journal request failed.');
    return payload;
  }

  function recipeRouteReference(recipe) {
    return isCurrentRecipeRevision(recipe) ? recipe.id : recipe.revisionId;
  }

  function freshTimer() {
    return {
      elapsed: 0,
      anchorElapsed: 0,
      anchorTime: 0,
      running: false,
      started: false,
      completed: false,
    };
  }

  function methodSvg(id) {
    const shared = 'viewBox="0 0 96 96" aria-hidden="true"';
    const drawings = {
      v60: `<svg ${shared}><path d="M24 25h48L61 66a13 13 0 0 1-13 10 13 13 0 0 1-13-10L24 25Z"/><path d="M20 20h56M34 32l8 35M62 32l-8 35M62 37h8a10 10 0 0 1 0 20h-5"/><path d="M37 81h22"/></svg>`,
      switch: `<svg ${shared}><path d="M25 25h46L61 64a13 13 0 0 1-13 10 13 13 0 0 1-13-10L25 25Z"/><path d="M21 20h54M37 80h22M61 37h10a9 9 0 0 1 0 18h-6"/><circle cx="71" cy="70" r="8"/><path d="M61 70h-9"/></svg>`,
      mugen: `<svg ${shared}><path d="M22 27h52L62 69H34L22 27Z"/><path d="M18 22h60M34 33l14 30 14-30M31 75h34"/><path d="M63 36h8a9 9 0 0 1 0 18h-3"/></svg>`,
      clever: `<svg ${shared}><path d="M24 20h48l-4 50H28l-4-50Z"/><path d="M20 20h56M30 29h36M34 77h28M69 34h8a10 10 0 0 1 0 20h-6"/><path d="M42 70v7M54 70v7"/></svg>`,
      cotton: `<svg ${shared}><path d="M29 18c3 8 9 11 19 11s16-3 19-11v46c0 10-8 18-19 18S29 74 29 64V18Z"/><path d="M29 26c5 5 11 7 19 7s14-2 19-7M38 32v39M48 34v43M58 32v39"/><path d="M23 18h50"/></svg>`,
    };
    return drawings[id] || drawings.v60;
  }

  function formatRatio(ratio) {
    return Number.isInteger(ratio) ? String(ratio) : ratio.toFixed(1);
  }

  function selectedDose(recipe) {
    const saved = state.doses[recipe.id] ?? state.doses[recipe.methodId] ?? recipe.defaultCoffee;
    return clampCoffee(saved);
  }

  function methodCard(method) {
    const recipeCount = getRecipesForMethod(method.id).length;
    return `
      <button class="recipe-card method-card" type="button" data-method-id="${method.id}" style="--card-accent:${method.accent};--card-soft:${method.soft}" aria-label="Browse ${recipeCount} ${method.name} recipes">
        <span class="recipe-card-number">METHOD ${method.number}</span>
        <span class="method-icon">${methodSvg(method.id)}</span>
        <span class="relative z-10 mt-12 block">
          <span class="block text-2xl font-semibold tracking-[-0.04em]">${method.name}</span>
          <span class="mt-1 block text-sm text-[#705d4f]">${method.character}</span>
        </span>
        <span class="relative z-10 mt-5 flex items-center justify-between gap-3">
          <span class="text-xs font-semibold text-[#776253]">${recipeCount} recipes</span>
          <span class="card-arrow" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg></span>
        </span>
      </button>`;
  }

  function primaryTags(recipe) {
    return [
      `${getTagLabel('roast', recipe.tags.roast[0])} roast`,
      getTagLabel('profile', recipe.tags.profile[0]),
      getTagLabel('technique', recipe.tags.technique[0]),
    ];
  }

  function recipeCard(recipe) {
    const method = getMethod(recipe.methodId);
    const scaled = scaleRecipe(recipe, selectedDose(recipe));
    const tags = primaryTags(recipe).map((tag) => `<span class="recipe-tag">${tag}</span>`).join('');
    return `
      <button class="brew-recipe-card" type="button" data-recipe-id="${recipe.id}" style="--card-accent:${method.accent};--card-soft:${method.soft}">
        <span class="brew-recipe-topline">
          <span>${method.name}</span>
          <span>1:${formatRatio(recipe.ratio)} · ${formatDuration(scaled.totalDuration)}</span>
        </span>
        <span class="brew-recipe-title">${recipe.title}</span>
        <span class="brew-recipe-summary">${recipe.summary}</span>
        <span class="recipe-tags" aria-label="Recipe tags">${tags}</span>
        <span class="brew-recipe-footer">
          <span>${recipe.difficulty} · ${recipe.attribution.label}</span>
          <span class="card-arrow" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg></span>
        </span>
      </button>`;
  }

  function renderRecipeCards(container, recipes) {
    container.innerHTML = recipes.map(recipeCard).join('');
  }

  function populateFilters() {
    const methodSelect = elements.filters.elements.method;
    methodSelect.innerHTML = '<option value="">All methods</option>'
      + METHODS.map((method) => `<option value="${method.id}">${method.name}</option>`).join('');
    for (const facet of TAG_KEYS) {
      const select = elements.filters.elements[facet];
      const taxonomy = TAG_TAXONOMY[facet];
      select.innerHTML = `<option value="">All ${taxonomy.label.toLowerCase()}</option>`
        + taxonomy.values.map((entry) => `<option value="${entry.value}">${entry.label}</option>`).join('');
    }
  }

  function populateJournalControls() {
    elements.journalFilters.elements.methodId.innerHTML = '<option value="">All methods</option>'
      + METHODS.map((method) => `<option value="${method.id}">${method.name}</option>`).join('');
    elements.journalFilters.elements.recipeId.innerHTML = '<option value="">All recipes</option>'
      + RECIPES.map((recipe) => `<option value="${recipe.id}">${getMethod(recipe.methodId).name}: ${recipe.title}</option>`).join('');
    elements.journalFormRecipe.innerHTML = RECIPES.map((recipe) => (
      `<option value="${recipe.id}">${getMethod(recipe.methodId).name}: ${recipe.title} (v${recipe.version})</option>`
    )).join('');
    const ratings = '<option value="">Not rated</option>'
      + [1, 2, 3, 4, 5].map((rating) => `<option value="${rating}">${rating}</option>`).join('');
    elements.journalEntryForm.querySelectorAll('[data-rating]').forEach((select) => {
      select.innerHTML = ratings;
    });
  }

  function filterLabel(key, value) {
    if (key === 'method') return getMethod(value).name;
    return getTagLabel(key, value);
  }

  function renderLibrary() {
    elements.methodList.innerHTML = METHODS.map(methodCard).join('');
    const filtered = filterRecipes(state.filters);
    renderRecipeCards(elements.recipeList, filtered);
    elements.resultCount.textContent = `${filtered.length} ${filtered.length === 1 ? 'recipe' : 'recipes'}`;
    elements.recipeList.hidden = filtered.length === 0;
    elements.emptyState.hidden = filtered.length !== 0;

    for (const key of FILTER_KEYS) {
      elements.filters.elements[key].value = state.filters[key] || '';
    }

    const entries = Object.entries(state.filters);
    elements.activeFilters.innerHTML = entries.map(([key, value]) => `
      <button class="active-filter" type="button" data-remove-filter="${key}" aria-label="Remove ${TAG_TAXONOMY[key]?.label || 'method'} filter ${filterLabel(key, value)}">
        <span>${TAG_TAXONOMY[key]?.label || 'Method'}: ${filterLabel(key, value)}</span>
        <span aria-hidden="true">×</span>
      </button>`).join('');
    elements.activeFilters.hidden = entries.length === 0;
    elements.clearFilters.hidden = entries.length === 0;
  }

  function chooseMethod(id) {
    state.method = getMethod(id);
    applyTheme(state.method);
    renderMethod();
  }

  function renderMethod() {
    const method = state.method;
    const recipes = getRecipesForMethod(method.id);
    elements.methodHero.style.setProperty('--recipe-accent', method.accent);
    elements.methodHero.style.setProperty('--recipe-soft', method.soft);
    elements.methodCharacter.textContent = method.character;
    elements.methodTitle.textContent = method.name;
    elements.methodDescription.textContent = method.description;
    elements.methodArt.innerHTML = methodSvg(method.id);
    elements.methodRecipeCount.textContent = `${recipes.length} recipes for ${method.name}`;
    elements.methodBrowseAll.textContent = `Filter all ${method.name} recipes`;
    renderRecipeCards(elements.methodRecipeList, recipes);
  }

  function chooseRecipe(id) {
    state.recipe = getRecipeRevision(id) || getRecipe(id);
    state.method = getMethod(state.recipe.methodId);
    state.scaled = scaleRecipe(state.recipe, selectedDose(state.recipe));
    applyTheme(state.method);
    renderRecipe();
  }

  function applyTheme(method) {
    document.documentElement.style.setProperty('--accent', method.accent);
    document.documentElement.style.setProperty('--recipe-accent', method.accent);
    document.documentElement.style.setProperty('--recipe-soft', method.soft);
    elements.recipeHero.style.setProperty('--recipe-accent', method.accent);
    elements.recipeHero.style.setProperty('--recipe-soft', method.soft);
    elements.timerPanel.style.setProperty('--recipe-accent', method.accent);
  }

  function renderRecipe() {
    const recipe = state.scaled;
    const method = state.method;
    elements.recipeCharacter.textContent = `${method.name} · ${method.character}`;
    elements.recipeTitle.textContent = recipe.title;
    elements.recipeDescription.textContent = recipe.summary;
    elements.recipeAttribution.textContent = `${recipe.attribution.label} · v${recipe.version}`;
    elements.recipeResult.textContent = recipe.result;
    elements.recipeArt.innerHTML = methodSvg(method.id);
    elements.coffeeDose.value = recipe.coffee;
    elements.waterTotal.textContent = recipe.water;
    elements.recipeRatio.textContent = `1:${formatRatio(recipe.ratio)}`;
    elements.recipeTemperature.textContent = recipe.temperature;
    elements.recipeGrind.textContent = recipe.grind;
    elements.recipeDuration.textContent = formatDuration(recipe.totalDuration);
    elements.recipeDifficulty.textContent = recipe.difficulty;
    elements.recipeEquipment.textContent = `You will need: ${method.equipment}.`;
    elements.recipeTagGroups.innerHTML = TAG_KEYS.map((facet) => {
      const values = recipe.tags[facet].map((value) => getTagLabel(facet, value)).join(', ');
      return `<div class="recipe-tag-group"><dt>${TAG_TAXONOMY[facet].label}</dt><dd>${values}</dd></div>`;
    }).join('');
    elements.stepCount.textContent = `${recipe.steps.length} steps`;
    elements.recipeSteps.innerHTML = recipe.steps.map((recipeStep, index) => `
      <li class="recipe-step">
        <span class="step-index">${index + 1}</span>
        <span>
          <span class="block text-sm font-semibold">${recipeStep.label}</span>
          <span class="mt-1 block text-xs leading-5 text-[#806d5e]">${recipeStep.instruction}</span>
        </span>
        <span class="step-target">${recipeStep.target ? `${recipeStep.target}g` : 'Prep'} · ${formatDuration(recipeStep.duration)}</span>
      </li>`).join('');
    elements.doseMinus.disabled = recipe.coffee <= MIN_COFFEE_GRAMS;
    elements.dosePlus.disabled = recipe.coffee >= MAX_COFFEE_GRAMS;
  }

  function updateDose(value) {
    const coffee = clampCoffee(value);
    state.doses[state.recipe.id] = coffee;
    saveDoses();
    state.scaled = scaleRecipe(state.recipe, coffee);
    renderRecipe();
  }

  function showScreen(screen, { focus = true, transition = 'none' } = {}) {
    const mutate = () => {
      Object.entries(screens).forEach(([name, section]) => {
        const active = name === screen;
        section.hidden = !active;
        section.dataset.active = String(active);
      });
      state.screen = screen;
      elements.back.hidden = screen === 'library';
      window.scrollTo({ top: 0, behavior: 'instant' });
      if (focus) screens[screen].querySelector('h1')?.focus({ preventScroll: true });
    };
    if (transition !== 'none' && window.unNative?.transition) {
      window.unNative.transition(mutate, { type: transition });
    } else {
      mutate();
    }
  }

  function clearRouteParams(url) {
    ['method', 'recipe', 'brew', 'shot', 'filterMethod', 'journal', 'entry', 'edit', 'journalMethod', 'journalRecipe', 'journalQ', 'recipeRef', 'dose', 'from', ...TAG_KEYS]
      .forEach((key) => url.searchParams.delete(key));
  }

  function urlFor(screen, id, shot) {
    const url = new URL(window.location.href);
    clearRouteParams(url);
    if (screen === 'library') {
      for (const [key, value] of Object.entries(state.filters)) {
        url.searchParams.set(FILTER_PARAM[key] || key, value);
      }
    }
    if (screen === 'method') url.searchParams.set('method', id);
    if (screen === 'recipe') url.searchParams.set('recipe', id);
    if (screen === 'brew') url.searchParams.set('brew', id);
    if (screen === 'journal') {
      url.searchParams.set('journal', state.journal.demo ? 'demo' : '1');
      if (state.journal.filters.methodId) url.searchParams.set('journalMethod', state.journal.filters.methodId);
      if (state.journal.filters.recipeId) url.searchParams.set('journalRecipe', state.journal.filters.recipeId);
      if (state.journal.filters.q) url.searchParams.set('journalQ', state.journal.filters.q);
    }
    if (screen === 'journalDetail') {
      url.searchParams.set('journal', state.journal.demo ? 'demo' : '1');
      url.searchParams.set('entry', id);
    }
    if (screen === 'journalForm') {
      if (state.journal.formMode === 'edit') {
        url.searchParams.set('journal', '1');
        url.searchParams.set('edit', id);
      } else {
        url.searchParams.set('journal', 'new');
        if (state.recipe?.revisionId) url.searchParams.set('recipeRef', state.recipe.revisionId);
        if (state.scaled?.coffee) url.searchParams.set('dose', state.scaled.coffee);
        if (state.journal.returnTo) url.searchParams.set('from', state.journal.returnTo);
      }
    }
    if (shot) url.searchParams.set('shot', shot);
    return `${url.pathname}${url.search}${url.hash}`;
  }

  function navigate(screen, id, { replace = false, focus = true, transition = 'push', shot } = {}) {
    if (screen === 'method') chooseMethod(id);
    if (screen === 'recipe' || screen === 'brew') chooseRecipe(id);
    if (screen === 'library') renderLibrary();
    if (screen === 'brew') renderBrewShell();
    const canonicalId = screen === 'method'
      ? state.method.id
      : (screen === 'recipe' || screen === 'brew')
        ? recipeRouteReference(state.recipe)
        : id;
    history[replace ? 'replaceState' : 'pushState']({ screen, id: canonicalId }, '', urlFor(screen, canonicalId, shot));
    showScreen(screen, { focus, transition });
  }

  function filtersFromLocation(params) {
    const values = { method: params.get('filterMethod') || '' };
    for (const facet of TAG_KEYS) values[facet] = params.get(facet) || '';
    return normalizeFilters(values);
  }

  function isKnownRecipeReference(id) {
    return RECIPE_REVISIONS.some((recipe) => recipe.id === id || recipe.revisionId === id)
      || METHODS.some((method) => method.id === id);
  }

  function parseLocation({ focus = false } = {}) {
    const params = new URLSearchParams(window.location.search);
    const journalMode = params.get('journal');
    const journalEntryId = params.get('entry');
    const journalEditId = params.get('edit');
    if (journalMode === 'new') {
      openJournalForm({
        recipeRef: params.get('recipeRef'),
        dose: params.get('dose'),
        source: params.get('from') === 'brew' ? 'guided' : 'manual',
        returnTo: params.get('from') || 'journal',
        historyMode: null,
        focus,
        transition: 'none',
      });
      return;
    }
    if (journalEditId && journalMode === '1') {
      openJournalEdit(journalEditId, { historyMode: null, focus, transition: 'none' });
      return;
    }
    if (journalEntryId && (journalMode === '1' || journalMode === 'demo')) {
      openJournalDetail(journalEntryId, {
        demo: journalMode === 'demo', historyMode: null, focus, transition: 'none',
      });
      return;
    }
    if (journalMode === '1' || journalMode === 'demo') {
      openJournal({
        demo: journalMode === 'demo',
        filters: {
          methodId: METHODS.some((method) => method.id === params.get('journalMethod')) ? params.get('journalMethod') : '',
          recipeId: RECIPES.some((recipe) => recipe.id === params.get('journalRecipe')) ? params.get('journalRecipe') : '',
          q: (params.get('journalQ') || '').slice(0, 120),
        },
        historyMode: null,
        focus,
        transition: 'none',
      });
      return;
    }
    const brewId = params.get('brew');
    const recipeId = params.get('recipe');
    const methodId = params.get('method');
    const shot = params.get('shot');
    if (brewId && isKnownRecipeReference(brewId)) {
      chooseRecipe(brewId);
      state.timer = freshTimer();
      if (shot === 'active') {
        state.scaled = scaleRecipe(state.recipe, state.recipe.defaultCoffee);
        state.timer.elapsed = Math.min(state.scaled.totalDuration - 1, state.scaled.steps[0].duration + 25);
        state.timer.anchorElapsed = state.timer.elapsed;
        state.timer.started = true;
      }
      renderBrewShell();
      showScreen('brew', { focus, transition: 'none' });
      return;
    }
    if (recipeId && isKnownRecipeReference(recipeId)) {
      chooseRecipe(recipeId);
      showScreen('recipe', { focus, transition: 'none' });
      return;
    }
    if (methodId && METHODS.some((method) => method.id === methodId)) {
      chooseMethod(methodId);
      showScreen('method', { focus, transition: 'none' });
      return;
    }
    state.filters = filtersFromLocation(params);
    renderLibrary();
    showScreen('library', { focus, transition: 'none' });
  }

  function updateFilters() {
    const values = {};
    for (const key of FILTER_KEYS) values[key] = elements.filters.elements[key].value;
    state.filters = normalizeFilters(values);
    renderLibrary();
    history.replaceState({ screen: 'library' }, '', urlFor('library'));
  }

  function clearFilters() {
    state.filters = {};
    renderLibrary();
    history.replaceState({ screen: 'library' }, '', urlFor('library'));
  }

  function journalApiPath(path = '') {
    const query = new URLSearchParams();
    if (state.journal.demo) query.set('demo', '1');
    if (!path) {
      if (state.journal.filters.methodId) query.set('methodId', state.journal.filters.methodId);
      if (state.journal.filters.recipeId) query.set('recipeId', state.journal.filters.recipeId);
      if (state.journal.filters.q) query.set('q', state.journal.filters.q);
    }
    const suffix = query.toString();
    return `/api/brews${path}${suffix ? `?${suffix}` : ''}`;
  }

  function syncJournalFilterControls() {
    for (const name of ['methodId', 'recipeId', 'q']) {
      elements.journalFilters.elements[name].value = state.journal.filters[name] || '';
    }
    elements.journalClearFilters.hidden = Object.keys(state.journal.filters).length === 0;
  }

  function journalCard(entry) {
    const snapshot = entry.recipeSnapshot;
    const coffee = entry.coffeeName || 'Coffee not recorded';
    const change = entry.changeNextTime
      ? `<span class="journal-card-change"><strong>Next time:</strong> ${escapeHtml(entry.changeNextTime)}</span>`
      : '<span class="journal-card-change">No adjustment recorded yet.</span>';
    return `
      <button class="journal-card" type="button" data-entry-id="${escapeHtml(entry.id)}">
        <span class="journal-card-topline">
          <span>${escapeHtml(snapshot.methodName)}</span>
          <span>${escapeHtml(formatDate(entry.brewedAt))}</span>
        </span>
        <span class="journal-card-title">${escapeHtml(snapshot.title)}</span>
        <span class="journal-card-coffee">${escapeHtml(coffee)}${entry.roaster ? ` · ${escapeHtml(entry.roaster)}` : ''}</span>
        ${change}
        <span class="journal-card-footer">
          <span>v${escapeHtml(entry.recipeVersion)} · ${escapeHtml(snapshot.coffee)}g / ${escapeHtml(snapshot.water)}g</span>
          <span>${entry.overall ? `${escapeHtml(entry.overall)}/5 overall` : 'Open entry'}</span>
        </span>
      </button>`;
  }

  function renderJournalList() {
    const entries = state.journal.entries;
    elements.journalCount.textContent = `${entries.length} ${entries.length === 1 ? 'brew' : 'brews'}`;
    elements.journalList.innerHTML = entries.map(journalCard).join('');
    elements.journalList.hidden = entries.length === 0;
    elements.journalEmpty.hidden = entries.length !== 0;
    const filtered = Object.keys(state.journal.filters).length > 0;
    elements.journalEmptyCopy.textContent = filtered
      ? 'No brews match these filters. Clear them to see the full journal.'
      : 'Finish a guided brew or log one manually to begin learning from each cup.';
    elements.journalEmptyAction.textContent = filtered ? 'Clear filters' : 'Log your first brew';
    elements.journalStatus.textContent = state.journal.demo
      ? 'Showing read-only staging examples. Your private journal uses the same layout.'
      : '';
  }

  async function loadJournal() {
    elements.journalStatus.textContent = 'Loading your brew history…';
    elements.journalError.hidden = true;
    elements.journalEmpty.hidden = true;
    elements.journalList.hidden = true;
    elements.journalCount.textContent = 'Loading brews';
    try {
      const payload = await apiFetch(journalApiPath());
      state.journal.entries = payload.entries || [];
      state.journal.demo = Boolean(payload.demo);
      renderJournalList();
    } catch (error) {
      state.journal.entries = [];
      elements.journalStatus.textContent = '';
      elements.journalCount.textContent = 'Journal unavailable';
      elements.journalErrorCopy.textContent = error.message;
      elements.journalError.hidden = false;
    }
  }

  function openJournal({ demo = false, filters = {}, historyMode = 'pushState', focus = true, transition = 'push' } = {}) {
    state.journal.demo = demo;
    state.journal.filters = Object.fromEntries(Object.entries(filters).filter(([, value]) => value));
    syncJournalFilterControls();
    if (historyMode) history[historyMode]({ screen: 'journal' }, '', urlFor('journal'));
    showScreen('journal', { focus, transition });
    loadJournal();
  }

  function definitionRows(rows) {
    return rows.map(([label, value]) => `
      <div class="detail-row">
        <dt>${escapeHtml(label)}</dt>
        <dd>${escapeHtml(value || 'Not recorded')}</dd>
      </div>`).join('');
  }

  function renderTasteScores(entry) {
    const labels = {
      sweetness: 'Sweetness', acidity: 'Acidity', body: 'Body', clarity: 'Clarity', overall: 'Overall',
    };
    elements.journalTasteScores.innerHTML = Object.entries(labels).map(([field, label]) => {
      const rating = Number(entry[field]) || 0;
      const track = [1, 2, 3, 4, 5]
        .map((value) => `<span data-filled="${value <= rating}"></span>`).join('');
      return `<div class="taste-score-row"><span>${label}</span><span class="taste-score-track" aria-hidden="true">${track}</span><span class="taste-score-value">${rating ? `${rating}/5` : 'Not rated'}</span></div>`;
    }).join('');
  }

  function renderJournalDetail() {
    const entry = state.journal.entry;
    const snapshot = entry.recipeSnapshot;
    elements.journalDetailMethod.textContent = `${snapshot.methodName} · ${entry.source === 'guided' ? 'Guided brew' : 'Manual entry'}`;
    elements.journalDetailTitle.textContent = entry.coffeeName || snapshot.title;
    elements.journalDetailDate.textContent = `Brewed ${formatDate(entry.brewedAt, true)}`;
    elements.journalDetailVersion.textContent = `${snapshot.title} · v${entry.recipeVersion}`;
    elements.journalDemoBadge.hidden = !state.journal.demo;
    elements.journalDetailActions.hidden = false;
    elements.journalVersionStatus.textContent = entry.isCurrentRecipeRevision
      ? `This is the current ${snapshot.title} revision.`
      : `You brewed revision v${entry.recipeVersion}. The current recipe is v${entry.currentRecipeVersion}; this snapshot remains unchanged.`;
    elements.journalSnapshotDetails.innerHTML = definitionRows([
      ['Coffee dose', `${snapshot.coffee}g`],
      ['Water', `${snapshot.water}g`],
      ['Ratio', `1:${formatRatio(snapshot.ratio)}`],
      ['Temperature', snapshot.temperature],
      ['Grind', snapshot.grind],
      ['Duration', formatDuration(snapshot.totalDuration)],
      ['Published', formatDate(`${snapshot.publishedAt}T00:00:00Z`)],
    ]);
    elements.journalSetupDetails.innerHTML = definitionRows([
      ['Coffee', entry.coffeeName], ['Roaster', entry.roaster], ['Process', entry.process],
      ['Roast date', entry.roastDate ? formatDate(`${entry.roastDate}T00:00:00`) : null],
      ['Grinder', entry.grinder], ['Grind setting', entry.grindSetting], ['Water', entry.water], ['Gear', entry.gear],
    ]);
    renderTasteScores(entry);
    elements.journalDetailNotes.textContent = entry.notes || 'No tasting notes recorded.';
    elements.journalDetailChange.textContent = entry.changeNextTime || 'No change planned yet.';
    elements.journalDetailActions.classList.toggle('sm:grid-cols-3', !state.journal.demo);
    elements.journalDetailActions.classList.toggle('sm:grid-cols-1', state.journal.demo);
    elements.journalEdit.hidden = state.journal.demo;
    elements.journalDelete.hidden = state.journal.demo;
    elements.journalDeleteConfirmation.hidden = true;
    elements.journalDetailError.hidden = true;
    const revisionAvailable = Boolean(RECIPE_REVISIONS.find((recipe) => recipe.revisionId === entry.recipeRevisionId));
    elements.journalRepeat.disabled = !revisionAvailable;
    elements.journalRepeat.textContent = revisionAvailable ? 'Brew again' : 'Revision unavailable';
  }

  async function loadJournalEntry(id, { demo = false } = {}) {
    state.journal.demo = demo;
    const payload = await apiFetch(journalApiPath(`/${encodeURIComponent(id)}`));
    state.journal.entry = payload.entry;
    state.journal.demo = Boolean(payload.demo);
    return payload.entry;
  }

  async function openJournalDetail(id, { demo = false, historyMode = 'pushState', focus = true, transition = 'push' } = {}) {
    state.journal.demo = demo;
    elements.journalDetailMethod.textContent = 'Brew journal';
    elements.journalDetailTitle.textContent = 'Loading brew…';
    elements.journalDetailDate.textContent = '';
    elements.journalDetailError.hidden = true;
    if (historyMode) history[historyMode]({ screen: 'journalDetail', id }, '', urlFor('journalDetail', id));
    showScreen('journalDetail', { focus, transition });
    try {
      await loadJournalEntry(id, { demo });
      renderJournalDetail();
    } catch (error) {
      elements.journalDetailTitle.textContent = 'Brew entry unavailable';
      elements.journalDetailError.textContent = error.message;
      elements.journalDetailError.hidden = false;
      elements.journalDetailActions.hidden = true;
    }
  }

  function setJournalFormValue(name, value) {
    const control = elements.journalEntryForm.elements[name];
    if (control) control.value = value ?? '';
  }

  function renderJournalFormRecipeMeta(recipe) {
    elements.journalFormVersion.textContent = `Recipe v${recipe.version}`;
    elements.journalFormSnapshotNote.textContent = state.journal.formMode === 'edit'
      ? 'The original recipe revision and dose are locked so this brew record stays historically accurate.'
      : 'Saving creates an immutable snapshot of this recipe revision.';
  }

  function prepareCreateForm({ recipeRef, dose, source = 'manual', returnTo = 'journal' } = {}) {
    state.journal.formMode = 'create';
    state.journal.formSource = source;
    state.journal.returnTo = returnTo;
    state.journal.entry = null;
    elements.journalEntryForm.reset();
    chooseRecipe(isKnownRecipeReference(recipeRef) ? recipeRef : RECIPES[0].id);
    elements.journalFormRecipe.disabled = false;
    elements.journalFormDose.disabled = false;
    setJournalFormValue('recipeId', state.recipe.id);
    setJournalFormValue('coffee', clampCoffee(dose ?? selectedDose(state.recipe)));
    setJournalFormValue('brewedAt', toDateTimeLocal());
    elements.journalFormKicker.textContent = source === 'guided' ? 'Guided brew complete' : 'New journal entry';
    elements.journalFormTitle.textContent = source === 'guided' ? 'Save this brew' : 'Log a brew';
    elements.journalFormIntro.textContent = source === 'guided'
      ? 'The recipe and dose are ready. Add the coffee, setup, and tasting notes you want to remember.'
      : 'Record what you used and how the cup tasted. Only the recipe, dose, and brew time are required.';
    elements.journalFormSave.textContent = 'Save journal entry';
    elements.journalFormError.hidden = true;
    renderJournalFormRecipeMeta(state.recipe);
  }

  function prepareEditForm(entry) {
    state.journal.formMode = 'edit';
    state.journal.formSource = entry.source;
    state.journal.returnTo = 'detail';
    state.journal.entry = entry;
    elements.journalEntryForm.reset();
    const recipe = RECIPE_REVISIONS.find((candidate) => candidate.revisionId === entry.recipeRevisionId)
      || getRecipe(entry.recipeId);
    state.recipe = recipe;
    state.method = getMethod(recipe.methodId);
    state.scaled = scaleRecipe(recipe, entry.recipeSnapshot.coffee);
    elements.journalFormRecipe.disabled = true;
    elements.journalFormDose.disabled = true;
    setJournalFormValue('recipeId', entry.recipeId);
    setJournalFormValue('coffee', entry.recipeSnapshot.coffee);
    setJournalFormValue('brewedAt', toDateTimeLocal(entry.brewedAt));
    for (const field of ['coffeeName', 'roaster', 'process', 'roastDate', 'grinder', 'grindSetting', 'water', 'gear', 'sweetness', 'acidity', 'body', 'clarity', 'overall', 'notes', 'changeNextTime']) {
      setJournalFormValue(field, entry[field]);
    }
    elements.journalFormKicker.textContent = 'Edit private notes';
    elements.journalFormTitle.textContent = entry.coffeeName || entry.recipeSnapshot.title;
    elements.journalFormIntro.textContent = 'Update what you used or how the cup tasted. The recipe snapshot stays unchanged.';
    elements.journalFormSave.textContent = 'Save changes';
    elements.journalFormError.hidden = true;
    renderJournalFormRecipeMeta(recipe);
  }

  function openJournalForm(options = {}) {
    prepareCreateForm(options);
    if (options.historyMode !== null) {
      history[options.historyMode || 'pushState']({ screen: 'journalForm' }, '', urlFor('journalForm'));
    }
    showScreen('journalForm', { focus: options.focus !== false, transition: options.transition || 'push' });
  }

  async function openJournalEdit(id, { historyMode = 'pushState', focus = true, transition = 'push' } = {}) {
    try {
      const entry = state.journal.entry?.id === Number(id)
        ? state.journal.entry
        : await loadJournalEntry(id);
      prepareEditForm(entry);
      if (historyMode) history[historyMode]({ screen: 'journalForm', id }, '', urlFor('journalForm', id));
      showScreen('journalForm', { focus, transition });
    } catch (error) {
      elements.journalDetailError.textContent = error.message;
      elements.journalDetailError.hidden = false;
    }
  }

  function readJournalForm() {
    return Object.fromEntries(new FormData(elements.journalEntryForm).entries());
  }

  async function saveJournalForm(event) {
    event.preventDefault();
    elements.journalFormError.hidden = true;
    elements.journalFormSave.disabled = true;
    elements.journalFormSave.textContent = 'Saving…';
    try {
      const body = readJournalForm();
      let payload;
      if (state.journal.formMode === 'edit') {
        payload = await apiFetch(`/api/brews/${state.journal.entry.id}`, {
          method: 'PATCH', body: JSON.stringify(body),
        });
      } else {
        body.recipeId = state.recipe.id;
        body.recipeVersion = state.recipe.version;
        body.coffee = elements.journalFormDose.value;
        body.source = state.journal.formSource;
        payload = await apiFetch('/api/brews', { method: 'POST', body: JSON.stringify(body) });
      }
      state.journal.entry = payload.entry;
      state.journal.demo = false;
      await openJournalDetail(payload.entry.id, { historyMode: 'replaceState', transition: 'pop' });
    } catch (error) {
      elements.journalFormError.textContent = error.message;
      elements.journalFormError.hidden = false;
    } finally {
      elements.journalFormSave.disabled = false;
      elements.journalFormSave.textContent = state.journal.formMode === 'edit' ? 'Save changes' : 'Save journal entry';
    }
  }

  function commitJournalFilters() {
    state.journal.filters = Object.fromEntries(['methodId', 'recipeId', 'q']
      .map((name) => [name, elements.journalFilters.elements[name].value.trim()])
      .filter(([, value]) => value));
    syncJournalFilterControls();
    history.replaceState({ screen: 'journal' }, '', urlFor('journal'));
    loadJournal();
  }

  function repeatJournalEntry() {
    const entry = state.journal.entry;
    const recipe = RECIPE_REVISIONS.find((candidate) => candidate.revisionId === entry.recipeRevisionId);
    if (!recipe) return;
    state.doses[recipe.id] = entry.recipeSnapshot.coffee;
    saveDoses();
    state.timer = freshTimer();
    navigate('brew', recipeRouteReference(recipe), { transition: 'push' });
  }

  async function deleteJournalEntry() {
    elements.journalDeleteConfirm.disabled = true;
    elements.journalDetailError.hidden = true;
    try {
      await apiFetch(`/api/brews/${state.journal.entry.id}`, { method: 'DELETE' });
      state.journal.entry = null;
      openJournal({ historyMode: 'replaceState', transition: 'pop' });
    } catch (error) {
      elements.journalDetailError.textContent = error.message;
      elements.journalDetailError.hidden = false;
    } finally {
      elements.journalDeleteConfirm.disabled = false;
    }
  }

  function elapsedNow() {
    if (!state.timer.running) return state.timer.elapsed;
    return state.timer.anchorElapsed + (Date.now() - state.timer.anchorTime) / 1000;
  }

  function renderBrewShell() {
    state.lastAnnouncedStep = -1;
    state.lastPreparationAnnouncementStep = -1;
    state.lastPreparationHapticStep = -1;
    elements.timerAnnouncement.textContent = '';
    elements.brewMethod.textContent = state.method.name;
    elements.brewTitle.textContent = state.scaled.title;
    elements.brewDose.textContent = `${state.scaled.coffee}g coffee · ${state.scaled.water}g water`;
    elements.brewRatio.textContent = `1:${formatRatio(state.scaled.ratio)} · ${state.scaled.temperature}`;
    elements.timerTotal.textContent = `of ${formatDuration(state.scaled.totalDuration)}`;
    elements.stepProgress.innerHTML = state.scaled.steps.map((recipeStep, index) => (
      `<span class="progress-dot" data-step-dot="${index}" data-state="upcoming" title="${recipeStep.label}"></span>`
    )).join('');
    renderTimer();
  }

  function renderNextStep(timing) {
    if (timing.isFinalStep) {
      elements.nextStepPreview.dataset.state = 'final';
      elements.nextStepKicker.textContent = 'Final step';
      elements.nextStepTiming.textContent = 'Nothing else to prepare';
      elements.nextStepLabel.textContent = 'Brew complete is next';
      elements.nextStepPreparation.textContent = 'Finish this step and let the timer carry you to completion.';
      elements.nextStepTargetWrap.hidden = true;
      return;
    }
    const nextRecipeStep = state.scaled.steps[timing.nextStepIndex];
    elements.nextStepPreview.dataset.state = timing.isImminent ? 'imminent' : timing.isPreparing ? 'preparing' : 'upcoming';
    elements.nextStepKicker.textContent = timing.isImminent ? 'Get ready' : timing.isPreparing ? 'Prepare' : 'Up next';
    elements.nextStepTiming.textContent = `in ${formatDuration(Math.ceil(timing.secondsUntilNext))} · starts at ${formatDuration(timing.nextStartsAt)}`;
    elements.nextStepLabel.textContent = nextRecipeStep.label;
    elements.nextStepPreparation.textContent = nextRecipeStep.preparation;
    elements.nextStepTargetWrap.hidden = false;
    elements.nextStepTarget.textContent = `${nextRecipeStep.target}g`;
    if (state.timer.running && timing.isPreparing && state.lastPreparationAnnouncementStep !== timing.nextStepIndex) {
      elements.timerAnnouncement.textContent = `Prepare for ${nextRecipeStep.label} in ${Math.ceil(timing.secondsUntilNext)} seconds. Water target ${nextRecipeStep.target} grams.`;
      state.lastPreparationAnnouncementStep = timing.nextStepIndex;
    }
    if (state.timer.running && timing.isImminent && state.lastPreparationHapticStep !== timing.nextStepIndex) {
      navigator.vibrate?.([12, 36, 12]);
      state.lastPreparationHapticStep = timing.nextStepIndex;
    }
  }

  function renderTimer() {
    cancelTimerTick();
    const elapsed = Math.max(0, Math.min(state.scaled.totalDuration, elapsedNow()));
    if (elapsed >= state.scaled.totalDuration && !state.timer.completed) {
      state.timer.elapsed = state.scaled.totalDuration;
      state.timer.running = false;
      state.timer.completed = true;
    }
    elements.timerPanel.hidden = state.timer.completed;
    elements.brewComplete.hidden = !state.timer.completed;
    if (state.timer.completed) return;
    const timing = getBrewTiming(state.scaled, elapsed);
    const { stepIndex } = timing;
    const recipeStep = state.scaled.steps[stepIndex];
    elements.timerRing.style.setProperty('--progress', `${Math.min(1, elapsed / state.scaled.totalDuration) * 360}deg`);
    elements.timerClock.textContent = formatDuration(Math.floor(elapsed));
    elements.timerStepKicker.textContent = state.timer.running ? 'Brewing' : state.timer.started ? 'Paused' : 'Ready';
    elements.activeStepNumber.textContent = `Step ${stepIndex + 1} of ${state.scaled.steps.length}`;
    elements.activeStepLabel.textContent = recipeStep.label;
    elements.activeWaterTarget.textContent = recipeStep.target ? `${recipeStep.target}g` : 'Prep';
    elements.activeStepInstruction.textContent = recipeStep.instruction;
    elements.previousStep.disabled = stepIndex === 0 && elapsed <= 0;
    renderNextStep(timing);
    elements.stepProgress.querySelectorAll('[data-step-dot]').forEach((dot, index) => {
      dot.dataset.state = index < stepIndex ? 'done' : index === stepIndex ? 'active' : 'upcoming';
    });
    if (state.lastAnnouncedStep !== -1 && state.lastAnnouncedStep !== stepIndex && state.timer.running) navigator.vibrate?.(18);
    state.lastAnnouncedStep = stepIndex;
    if (state.timer.running) {
      elements.timerToggleLabel.textContent = 'Pause';
      elements.timerToggleIcon.innerHTML = '<path d="M9 7v10M15 7v10"/>';
      state.timerHandle = window.setTimeout(renderTimer, 200);
    } else {
      elements.timerToggleLabel.textContent = state.timer.started ? 'Resume' : 'Start timer';
      elements.timerToggleIcon.innerHTML = '<path d="m9 7 8 5-8 5V7Z"/>';
    }
  }

  function cancelTimerTick() {
    if (state.timerHandle !== null) {
      window.clearTimeout(state.timerHandle);
      state.timerHandle = null;
    }
  }

  function toggleTimer() {
    if (state.timer.completed) resetTimer();
    if (state.timer.running) {
      state.timer.elapsed = Math.min(state.scaled.totalDuration, elapsedNow());
      state.timer.anchorElapsed = state.timer.elapsed;
      state.timer.running = false;
    } else {
      state.timer.anchorElapsed = state.timer.elapsed;
      state.timer.anchorTime = Date.now();
      state.timer.running = true;
      state.timer.started = true;
    }
    renderTimer();
  }

  function seekToStep(index) {
    if (index >= state.scaled.steps.length) {
      state.timer.elapsed = state.scaled.totalDuration;
      state.timer.anchorElapsed = state.timer.elapsed;
      state.timer.running = false;
      state.timer.started = true;
      state.timer.completed = true;
      renderTimer();
      return;
    }
    const safeIndex = Math.max(0, index);
    state.timer.elapsed = getStepStart(state.scaled, safeIndex);
    state.timer.anchorElapsed = state.timer.elapsed;
    state.timer.anchorTime = Date.now();
    state.timer.started = true;
    state.timer.completed = false;
    state.lastAnnouncedStep = safeIndex;
    state.lastPreparationAnnouncementStep = -1;
    state.lastPreparationHapticStep = -1;
    elements.timerAnnouncement.textContent = '';
    renderTimer();
  }

  function resetTimer() {
    cancelTimerTick();
    state.timer = freshTimer();
    state.lastAnnouncedStep = -1;
    renderBrewShell();
  }

  function openAbout() {
    const content = document.getElementById('about-content').content.firstElementChild.cloneNode(true);
    if (window.unNative?.presentModal) {
      const modal = window.unNative.presentModal({ contentEl: content });
      content.querySelector('[data-close-about]').addEventListener('click', () => modal.dismiss());
      return;
    }
    const dialog = document.createElement('dialog');
    dialog.className = 'about-dialog';
    dialog.append(content);
    document.body.append(dialog);
    content.querySelector('[data-close-about]').addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => dialog.remove(), { once: true });
    dialog.showModal();
  }

  function handleRecipeCardClick(event) {
    const card = event.target.closest('[data-recipe-id]');
    if (card) navigate('recipe', card.dataset.recipeId, { transition: 'push' });
  }

  elements.methodList.addEventListener('click', (event) => {
    const card = event.target.closest('[data-method-id]');
    if (card) navigate('method', card.dataset.methodId, { transition: 'push' });
  });
  elements.recipeList.addEventListener('click', handleRecipeCardClick);
  elements.methodRecipeList.addEventListener('click', handleRecipeCardClick);
  elements.filters.addEventListener('change', updateFilters);
  elements.activeFilters.addEventListener('click', (event) => {
    const chip = event.target.closest('[data-remove-filter]');
    if (!chip) return;
    delete state.filters[chip.dataset.removeFilter];
    renderLibrary();
    history.replaceState({ screen: 'library' }, '', urlFor('library'));
  });
  elements.clearFilters.addEventListener('click', clearFilters);
  elements.emptyClear.addEventListener('click', clearFilters);
  elements.methodBrowseAll.addEventListener('click', () => {
    state.filters = { method: state.method.id };
    navigate('library', null, { transition: 'pop' });
  });
  elements.doseMinus.addEventListener('click', () => updateDose(state.scaled.coffee - 1));
  elements.dosePlus.addEventListener('click', () => updateDose(state.scaled.coffee + 1));
  elements.coffeeDose.addEventListener('change', () => updateDose(elements.coffeeDose.value));
  elements.coffeeDose.addEventListener('blur', () => updateDose(elements.coffeeDose.value));
  elements.coffeeDose.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      updateDose(elements.coffeeDose.value);
      elements.coffeeDose.blur();
    }
  });
  elements.startBrew.addEventListener('click', () => {
    state.timer = freshTimer();
    navigate('brew', recipeRouteReference(state.recipe), { transition: 'push' });
  });
  elements.timerToggle.addEventListener('click', toggleTimer);
  elements.previousStep.addEventListener('click', () => seekToStep(getBrewTiming(state.scaled, elapsedNow()).stepIndex - 1));
  elements.nextStep.addEventListener('click', () => seekToStep(getBrewTiming(state.scaled, elapsedNow()).stepIndex + 1));
  elements.resetTimer.addEventListener('click', resetTimer);
  elements.saveBrewNotes.addEventListener('click', () => openJournalForm({
    recipeRef: state.recipe.revisionId,
    dose: state.scaled.coffee,
    source: 'guided',
    returnTo: 'brew',
  }));
  elements.brewAgain.addEventListener('click', () => { resetTimer(); toggleTimer(); });
  elements.returnToRecipe.addEventListener('click', () => navigate('recipe', recipeRouteReference(state.recipe), { transition: 'pop' }));
  elements.journalButton.addEventListener('click', () => openJournal());
  elements.journalNew.addEventListener('click', () => openJournalForm());
  elements.journalEmptyAction.addEventListener('click', () => {
    if (Object.keys(state.journal.filters).length) {
      state.journal.filters = {};
      syncJournalFilterControls();
      history.replaceState({ screen: 'journal' }, '', urlFor('journal'));
      loadJournal();
    } else {
      openJournalForm();
    }
  });
  elements.journalRetry.addEventListener('click', loadJournal);
  elements.journalList.addEventListener('click', (event) => {
    const card = event.target.closest('[data-entry-id]');
    if (card) openJournalDetail(card.dataset.entryId, { demo: state.journal.demo });
  });
  elements.journalFilters.addEventListener('submit', (event) => {
    event.preventDefault();
    commitJournalFilters();
  });
  elements.journalFilters.elements.methodId.addEventListener('change', commitJournalFilters);
  elements.journalFilters.elements.recipeId.addEventListener('change', commitJournalFilters);
  elements.journalFilters.elements.q.addEventListener('blur', commitJournalFilters);
  elements.journalClearFilters.addEventListener('click', () => {
    state.journal.filters = {};
    syncJournalFilterControls();
    history.replaceState({ screen: 'journal' }, '', urlFor('journal'));
    loadJournal();
  });
  elements.journalRepeat.addEventListener('click', repeatJournalEntry);
  elements.journalEdit.addEventListener('click', () => openJournalEdit(state.journal.entry.id));
  elements.journalDelete.addEventListener('click', () => {
    elements.journalDeleteConfirmation.hidden = false;
    elements.journalDeleteConfirm.focus();
  });
  elements.journalDeleteCancel.addEventListener('click', () => {
    elements.journalDeleteConfirmation.hidden = true;
    elements.journalDelete.focus();
  });
  elements.journalDeleteConfirm.addEventListener('click', deleteJournalEntry);
  elements.journalFormRecipe.addEventListener('change', () => {
    chooseRecipe(elements.journalFormRecipe.value);
    elements.journalFormDose.value = selectedDose(state.recipe);
    renderJournalFormRecipeMeta(state.recipe);
  });
  elements.journalEntryForm.addEventListener('submit', saveJournalForm);
  elements.journalFormCancel.addEventListener('click', () => {
    if (state.journal.formMode === 'edit') {
      openJournalDetail(state.journal.entry.id, { historyMode: 'replaceState', transition: 'pop' });
    } else if (state.journal.returnTo === 'brew') {
      navigate('brew', recipeRouteReference(state.recipe), { replace: true, transition: 'pop' });
    } else {
      openJournal({ historyMode: 'replaceState', transition: 'pop' });
    }
  });
  elements.about.addEventListener('click', openAbout);
  elements.home.addEventListener('click', () => {
    state.filters = {};
    navigate('library', null, { transition: 'pop' });
  });
  elements.back.addEventListener('click', () => {
    if (state.screen === 'brew') navigate('recipe', recipeRouteReference(state.recipe), { transition: 'pop' });
    else if (state.screen === 'recipe') navigate('method', state.recipe.methodId, { transition: 'pop' });
    else if (state.screen === 'journalDetail') openJournal({ demo: state.journal.demo, historyMode: 'replaceState', transition: 'pop' });
    else if (state.screen === 'journalForm' && state.journal.formMode === 'edit') openJournalDetail(state.journal.entry.id, { historyMode: 'replaceState', transition: 'pop' });
    else if (state.screen === 'journalForm' && state.journal.returnTo === 'brew') navigate('brew', recipeRouteReference(state.recipe), { replace: true, transition: 'pop' });
    else if (state.screen === 'journalForm') openJournal({ historyMode: 'replaceState', transition: 'pop' });
    else navigate('library', null, { transition: 'pop' });
  });

  window.addEventListener('popstate', () => parseLocation({ focus: true }));
  window.addEventListener('pagehide', cancelTimerTick);

  populateFilters();
  populateJournalControls();
  parseLocation();
})();
