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
    formatStepTiming,
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

  const {
    getGlossaryTerm,
    getGlossaryTermForFacet,
    getGlossaryTermForStep,
    getGlossaryTermsForFilter,
    glossaryTermsByCategory,
    searchGlossary,
  } = window.PouroverGlossary;

  const screens = {
    library: document.getElementById('library-screen'),
    method: document.getElementById('method-screen'),
    recipe: document.getElementById('recipe-screen'),
    brew: document.getElementById('brew-screen'),
    journal: document.getElementById('journal-screen'),
    journalDetail: document.getElementById('journal-detail-screen'),
    journalForm: document.getElementById('journal-form-screen'),
    shelf: document.getElementById('shelf-screen'),
    collection: document.getElementById('collection-screen'),
    glossary: document.getElementById('glossary-screen'),
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
    activeStepTiming: document.getElementById('active-step-timing'),
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
    shelfButton: document.getElementById('shelf-button'),
    shelfScreen: document.getElementById('shelf-screen'),
    shelfView: document.getElementById('shelf-view'),
    shelfTitle: document.getElementById('shelf-title'),
    shelfIntro: document.getElementById('shelf-intro'),
    shelfStatus: document.getElementById('shelf-status'),
    shelfRecipeList: document.getElementById('shelf-recipe-list'),
    shelfCollections: document.getElementById('shelf-collections'),
    shelfEmpty: document.getElementById('shelf-empty'),
    shelfEmptyTitle: document.getElementById('shelf-empty-title'),
    shelfEmptyCopy: document.getElementById('shelf-empty-copy'),
    shelfEmptyAction: document.getElementById('shelf-empty-action'),
    shelfError: document.getElementById('shelf-error'),
    shelfErrorCopy: document.getElementById('shelf-error-copy'),
    shelfRetry: document.getElementById('shelf-retry'),
    collectionCreateForm: document.getElementById('collection-create-form'),
    collectionCreateName: document.getElementById('collection-create-name'),
    collectionList: document.getElementById('collection-list'),
    collectionListEmpty: document.getElementById('collection-list-empty'),
    libraryFavoritesToggle: document.getElementById('library-favorites-toggle'),
    libraryBrewedToggle: document.getElementById('library-brewed-toggle'),
    libraryCollectionsLink: document.getElementById('library-collections-link'),
    libraryShelfStatus: document.getElementById('library-shelf-status'),
    recipeFavoriteButton: document.getElementById('recipe-favorite-button'),
    recipeFavoriteLabel: document.getElementById('recipe-favorite-label'),
    recipeCollectionsButton: document.getElementById('recipe-collections-button'),
    collectionScreen: document.getElementById('collection-screen'),
    collectionTitle: document.getElementById('collection-title'),
    collectionCount: document.getElementById('collection-count'),
    collectionRename: document.getElementById('collection-rename'),
    collectionDelete: document.getElementById('collection-delete'),
    collectionBrowse: document.getElementById('collection-browse'),
    collectionRenameForm: document.getElementById('collection-rename-form'),
    collectionRenameInput: document.getElementById('collection-rename-input'),
    collectionRenameSave: document.getElementById('collection-rename-save'),
    collectionRenameCancel: document.getElementById('collection-rename-cancel'),
    collectionDeleteConfirmation: document.getElementById('collection-delete-confirmation'),
    collectionDeleteCancel: document.getElementById('collection-delete-cancel'),
    collectionDeleteConfirm: document.getElementById('collection-delete-confirm'),
    collectionStatus: document.getElementById('collection-status'),
    collectionOrderHint: document.getElementById('collection-order-hint'),
    collectionRecipeList: document.getElementById('collection-recipe-list'),
    collectionEmpty: document.getElementById('collection-empty'),
    collectionEmptyAction: document.getElementById('collection-empty-action'),
    collectionError: document.getElementById('collection-error'),
    collectionPicker: document.getElementById('collection-picker'),
    collectionPickerBackdrop: document.getElementById('collection-picker-backdrop'),
    collectionPickerTitle: document.getElementById('collection-picker-title'),
    collectionPickerRecipe: document.getElementById('collection-picker-recipe'),
    collectionPickerList: document.getElementById('collection-picker-list'),
    collectionPickerCreate: document.getElementById('collection-picker-create'),
    collectionPickerName: document.getElementById('collection-picker-name'),
    collectionPickerError: document.getElementById('collection-picker-error'),
    collectionPickerClose: document.getElementById('collection-picker-close'),
    collectionPickerDone: document.getElementById('collection-picker-done'),
    glossary: document.getElementById('glossary-button'),
    glossarySearch: document.getElementById('glossary-search'),
    glossaryList: document.getElementById('glossary-list'),
    glossaryResultCount: document.getElementById('glossary-result-count'),
    glossaryEmptyState: document.getElementById('glossary-empty-state'),
    glossaryClearSearch: document.getElementById('glossary-clear-search'),
    termPanel: document.getElementById('term-panel'),
    termPanelBackdrop: document.getElementById('term-panel-backdrop'),
    termPanelCategory: document.getElementById('term-panel-category'),
    termPanelTitle: document.getElementById('term-panel-title'),
    termPanelSummary: document.getElementById('term-panel-summary'),
    termPanelDetail: document.getElementById('term-panel-detail'),
    termPanelRelated: document.getElementById('term-panel-related'),
    termPanelClose: document.getElementById('term-panel-close'),
    termPanelDone: document.getElementById('term-panel-done'),
    recipeRatioLabel: document.getElementById('recipe-ratio-label'),
    recipeWaterLabel: document.getElementById('recipe-water-label'),
    recipeGrindLabel: document.getElementById('recipe-grind-label'),
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
    glossaryQuery: '',
    term: { open: false, id: null, trigger: null },
    lastActiveStepLabel: null,
    lastNextStepLabel: null,
    lastRenderedStep: null,
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
    shelf: {
      demo: false,
      loaded: false,
      favorites: [],
      collections: [],
      recentlyBrewed: [],
      view: 'favorites',
      loadedDemo: null,
    },
    shelfFilters: { favorites: false, brewed: false },
    collection: { id: null, recipeId: null },
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
    let filtered = filterRecipes(state.filters);
    const shelfFilterActive = state.shelfFilters.favorites || state.shelfFilters.brewed;
    // Degrade open: if the shelf could not be loaded, an empty filter set would
    // hide the whole library. Better to show everything and say so than to
    // answer "no favorites" from data we do not have.
    const shelfIds = !shelfFilterActive || !state.shelf.loaded
      ? null
      : new Set([
        ...(state.shelfFilters.favorites ? state.shelf.favorites.map((recipe) => recipe.id) : []),
        ...(state.shelfFilters.brewed ? state.shelf.recentlyBrewed.map((recipe) => recipe.id) : []),
      ]);
    if (shelfIds) filtered = filtered.filter((recipe) => shelfIds.has(recipe.id));
    renderRecipeCards(elements.recipeList, filtered);
    elements.resultCount.textContent = `${filtered.length} ${filtered.length === 1 ? 'recipe' : 'recipes'}`;
    elements.recipeList.hidden = filtered.length === 0;
    elements.emptyState.hidden = filtered.length !== 0;
    elements.emptyState.querySelector('h3').textContent = shelfIds ? 'Nothing on your shelf matches' : 'No recipes match yet';
    elements.emptyState.querySelector('p').textContent = shelfIds
      ? 'Clear the shelf filter or a facet to see more.'
      : 'Try removing one filter to broaden the shelf.';
    syncShelfUi();

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
    elements.recipeRatioLabel.innerHTML = `Ratio${termMark('brew-ratio', 'Brew ratio')}`;
    elements.recipeWaterLabel.innerHTML = `Water${termMark('water-temperature', 'Water temperature')}`;
    elements.recipeGrindLabel.innerHTML = `Grind${termMark('grind-size', 'Grind size')}`;
    elements.recipeTagGroups.innerHTML = TAG_KEYS.map((facet) => {
      const values = recipe.tags[facet].map((value) => {
        const term = getGlossaryTermsForFilter(facet, value);
        return term ? termTrigger(term.id, getTagLabel(facet, value)) : escapeHtml(getTagLabel(facet, value));
      }).join(', ');
      return `<div class="recipe-tag-group"><dt>${escapeHtml(TAG_TAXONOMY[facet].label)}</dt><dd>${values}</dd></div>`;
    }).join('');
    elements.stepCount.textContent = `${recipe.steps.length} steps`;
    elements.recipeSteps.innerHTML = recipe.steps.map((recipeStep, index) => {
      const stepTerm = getGlossaryTermForStep(recipeStep.label);
      const label = stepTerm ? termTrigger(stepTerm.id, recipeStep.label) : escapeHtml(recipeStep.label);
      const timing = formatStepTiming(recipe, index);
      return `
      <li class="recipe-step">
        <span class="step-index">${index + 1}</span>
        <span>
          <span class="recipe-step-label block text-sm font-semibold">${label}</span>
          <span class="mt-1 block text-xs leading-5 text-[#806d5e]">${escapeHtml(recipeStep.instruction)}</span>
        </span>
        <span class="step-target">${recipeStep.target ? `${recipeStep.target}g` : 'Prep'} · ${timing.primary}<span class="step-duration">${timing.secondary}</span></span>
      </li>`;
    }).join('');
    elements.doseMinus.disabled = recipe.coffee <= MIN_COFFEE_GRAMS;
    elements.dosePlus.disabled = recipe.coffee >= MAX_COFFEE_GRAMS;
    syncShelfUi();
  }

  function updateDose(value) {
    const coffee = clampCoffee(value);
    state.doses[state.recipe.id] = coffee;
    saveDoses();
    state.scaled = scaleRecipe(state.recipe, coffee);
    renderRecipe();
  }

  // A definition the reader can open by keyboard or pointer. The trigger is a
  // real button, so no essential instruction is ever hidden behind a tooltip:
  // the surrounding copy is complete on its own and the definition adds depth.
  function termTrigger(termId, label) {
    const term = getGlossaryTerm(termId);
    if (!term) return escapeHtml(label);
    return `<button class="term-link" type="button" data-term="${term.id}" aria-label="Definition of ${escapeHtml(label)}"><span>${escapeHtml(label)}</span><span class="term-link-mark" aria-hidden="true">?</span></button>`;
  }

  function termMark(termId, label) {
    const term = getGlossaryTerm(termId);
    if (!term) return '';
    return `<button class="term-mark" type="button" data-term="${term.id}" aria-label="Definition of ${escapeHtml(label)}">?</button>`;
  }

  // The timer's active and upcoming step names get the same treatment as the
  // recipe step list, so a term can be opened mid-brew without losing state.
  // The timer re-renders several times a second, so only rewrite the label
  // when it actually changed: replacing it every tick would destroy the
  // definition button and drop focus out from under a keyboard user.
  function setStepLabel(el, label, cacheKey) {
    if (state[cacheKey] === label) return;
    state[cacheKey] = label;
    const term = getGlossaryTermForStep(label);
    el.innerHTML = term ? termTrigger(term.id, label) : escapeHtml(label);
  }

  function renderActiveStepLabel(label) {
    setStepLabel(elements.activeStepLabel, label, 'lastActiveStepLabel');
  }

  function renderNextStepLabel(label) {
    setStepLabel(elements.nextStepLabel, label, 'lastNextStepLabel');
  }

  function renderGlossary() {
    const matches = searchGlossary(state.glossaryQuery);
    const searching = Boolean(state.glossaryQuery.trim());
    if (searching) {
      elements.glossaryList.innerHTML = matches.map(glossaryCard).join('');
    } else {
      elements.glossaryList.innerHTML = glossaryTermsByCategory().map((group) => `
        <div class="glossary-group">
          <h3 class="glossary-group-heading">${escapeHtml(group.category)}</h3>
          <div class="glossary-group-cards">${group.terms.map(glossaryCard).join('')}</div>
        </div>`).join('');
    }
    elements.glossaryResultCount.textContent = `${matches.length} ${matches.length === 1 ? 'term' : 'terms'}`;
    elements.glossaryList.hidden = matches.length === 0;
    elements.glossaryEmptyState.hidden = matches.length !== 0;
    // Only write the field when it differs, so typing never moves the caret.
    if (elements.glossarySearch.value !== state.glossaryQuery) elements.glossarySearch.value = state.glossaryQuery;
  }

  function glossaryCard(term) {
    return `
      <button class="glossary-card un-pressable" type="button" data-term="${term.id}" aria-label="Definition of ${escapeHtml(term.term)}">
        <span class="glossary-card-category">${escapeHtml(term.category)}</span>
        <span class="glossary-card-term">${escapeHtml(term.term)}</span>
        <span class="glossary-card-summary">${escapeHtml(term.summary)}</span>
      </button>`;
  }

  function openTerm(termId, trigger) {
    const term = getGlossaryTerm(termId);
    if (!term) return;
    state.term = { open: true, id: term.id, trigger: trigger || null };
    elements.termPanelCategory.textContent = term.category;
    elements.termPanelTitle.textContent = term.term;
    elements.termPanelSummary.textContent = term.summary;
    elements.termPanelDetail.textContent = term.detail;
    const related = term.seeAlso.map((id) => getGlossaryTerm(id)).filter(Boolean);
    elements.termPanelRelated.hidden = related.length === 0;
    elements.termPanelRelated.innerHTML = related.length
      ? `<p class="term-panel-related-label">Related terms</p>${related.map((entry) => `<button class="term-chip" type="button" data-term="${entry.id}">${escapeHtml(entry.term)}</button>`).join('')}`
      : '';
    elements.termPanel.hidden = false;
    document.body.classList.add('term-open');
    // Take the screens behind the panel out of the tab order and the
    // accessibility tree, so the definition is genuinely modal for keyboard
    // and screen-reader users rather than only visually on top.
    document.getElementById('app-shell').inert = true;
    elements.termPanelTitle.focus({ preventScroll: true });
  }

  function closeTerm({ restoreFocus = true } = {}) {
    if (!state.term.open) return;
    const trigger = state.term.trigger;
    state.term = { open: false, id: null, trigger: null };
    elements.termPanel.hidden = true;
    document.body.classList.remove('term-open');
    document.getElementById('app-shell').inert = false;
    if (restoreFocus && trigger && document.contains(trigger)) trigger.focus({ preventScroll: true });
  }

  function openGlossary() {
    closeTerm({ restoreFocus: false });
    navigate('glossary', null, { transition: 'push' });
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
    ['method', 'recipe', 'brew', 'shot', 'filterMethod', 'journal', 'entry', 'edit', 'journalMethod', 'journalRecipe', 'journalQ', 'recipeRef', 'dose', 'from', 'glossary', 'term', 'q', 'shelf', 'collection', 'favorites', 'brewed', 'demo', 'collections', ...TAG_KEYS]
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
    if (screen === 'shelf') {
      url.searchParams.set('shelf', state.shelf.view);
      if (state.shelf.demo) url.searchParams.set('demo', '1');
    }
    if (screen === 'collection') {
      url.searchParams.set('collection', id);
      if (state.shelf.demo) url.searchParams.set('demo', '1');
    }
    if (screen === 'library') {
      if (state.shelfFilters.favorites) url.searchParams.set('favorites', '1');
      if (state.shelfFilters.brewed) url.searchParams.set('brewed', '1');
    }
    if (screen === 'glossary') {
      url.searchParams.set('glossary', '1');
      if (state.glossaryQuery.trim()) url.searchParams.set('q', state.glossaryQuery.trim());
    }
    if (shot) url.searchParams.set('shot', shot);
    return `${url.pathname}${url.search}${url.hash}`;
  }

  function navigate(screen, id, { replace = false, focus = true, transition = 'push', shot } = {}) {
    if (screen === 'method') chooseMethod(id);
    if (screen === 'recipe' || screen === 'brew') chooseRecipe(id);
    if (screen === 'library') renderLibrary();
    if (screen === 'brew') renderBrewShell();
    if (screen === 'glossary') renderGlossary();
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
    const shelfMode = params.get('shelf');
    const collectionId = params.get('collection');
    const demo = params.get('demo') === '1';
    if (collectionId) {
      openShelf({ view: 'collections', demo, historyMode: null, focus, transition: 'none' });
      openCollection(collectionId, { historyMode: null, focus, transition: 'none' });
      return;
    }
    if (shelfMode === 'favorites' || shelfMode === 'brewed' || shelfMode === 'collections') {
      openShelf({ view: shelfMode, demo, historyMode: null, focus, transition: 'none' });
      return;
    }
    const brewId = params.get('brew');
    const recipeId = params.get('recipe');
    const methodId = params.get('method');
    const shot = params.get('shot');
    const termId = params.get('term');
    const termRecord = termId ? getGlossaryTerm(termId) : null;
    if (params.get('glossary') === '1') {
      state.glossaryQuery = params.get('q') || '';
      renderGlossary();
      showScreen('glossary', { focus: focus && !termRecord, transition: 'none' });
      if (termRecord) openTerm(termRecord.id, null);
      return;
    }
    if (termRecord) {
      // A direct link to one definition renders its owning screen underneath,
      // so closing the panel leaves a real screen rather than a blank page.
      state.glossaryQuery = '';
      renderLibrary();
      showScreen('library', { focus: false, transition: 'none' });
      openTerm(termRecord.id, null);
      return;
    }
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
      state.shelf.demo = demo;
      if (demo !== state.shelf.loadedDemo) loadShelf({ demo, quiet: true });
      showScreen('recipe', { focus, transition: 'none' });
      if (shot === 'picker') openCollectionPicker(state.recipe.id);
      return;
    }
    if (methodId && METHODS.some((method) => method.id === methodId)) {
      chooseMethod(methodId);
      showScreen('method', { focus, transition: 'none' });
      return;
    }
    state.filters = filtersFromLocation(params);
    state.shelfFilters = {
      favorites: params.get('favorites') === '1',
      brewed: params.get('brewed') === '1',
    };
    state.shelf.demo = demo;
    if (!state.shelf.loaded || demo !== state.shelf.loadedDemo) loadShelf({ demo, quiet: true });
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
    state.shelfFilters = { favorites: false, brewed: false };
    renderLibrary();
    history.replaceState({ screen: 'library' }, '', urlFor('library'));
  }

  function setShelfFilter(name) {
    state.shelfFilters[name] = !state.shelfFilters[name];
    if (state.shelfFilters[name] && !state.shelf.loaded) loadShelf({ demo: state.shelf.demo, quiet: true });
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


  // -------------------------------------------------------------------------
  // Favorites and personal collections ("the shelf").
  //
  // The server owns the data and returns latest-revision summaries, so the
  // client never has to resolve a recipe id itself. Local mirrors here only
  // exist so the library can filter and so a favorite heart can render its
  // pressed state without a round trip per card.
  // -------------------------------------------------------------------------

  function shelfApiPath(path = '') {
    const query = new URLSearchParams();
    if (state.shelf.demo) query.set('demo', '1');
    const suffix = query.toString();
    return `/api/shelf${path}${suffix ? `?${suffix}` : ''}`;
  }

  function shelfRecipes(kind) {
    if (kind === 'brewed') return state.shelf.recentlyBrewed;
    return state.shelf.favorites;
  }

  function favoriteIdSet() {
    return new Set(state.shelf.favorites.map((recipe) => recipe.id));
  }

  function isFavoriteRecipe(recipeId) {
    return favoriteIdSet().has(recipeId);
  }

  // Boot kicks off a shelf load and the route handler may kick off another
  // (a different demo flag). Only the newest request is allowed to write
  // state, so a slower earlier response can never blank a newer one.
  let shelfRequestSeq = 0;

  async function loadShelf({ demo = state.shelf.demo, quiet = false } = {}) {
    const requestId = (shelfRequestSeq += 1);
    state.shelf.demo = demo;
    if (!quiet) {
      elements.shelfStatus.textContent = 'Loading your shelf…';
      elements.shelfError.hidden = true;
      elements.shelfEmpty.hidden = true;
    }
    try {
      const payload = await apiFetch(shelfApiPath());
      if (requestId !== shelfRequestSeq) return;
      state.shelf.favorites = payload.favorites || [];
      state.shelf.collections = payload.collections || [];
      state.shelf.recentlyBrewed = payload.recentlyBrewed || [];
      state.shelf.demo = Boolean(payload.demo);
      state.shelf.loaded = true;
      state.shelf.loadedDemo = Boolean(payload.demo);
      renderShelf();
      // The library's shelf filter and every favorite heart are rendered from
      // this data, so a late-arriving shelf has to repaint whichever screen is
      // already on screen rather than only the shelf view.
      if (state.screen === 'library') renderLibrary();
      if (state.screen === 'recipe' || state.screen === 'brew') renderRecipe();
      if (state.screen === 'collection') renderCollectionScreen();
      if (!elements.collectionPicker.hidden) renderCollectionPicker();
      syncShelfUi();
    } catch (error) {
      if (requestId !== shelfRequestSeq) return;
      state.shelf.favorites = [];
      state.shelf.collections = [];
      state.shelf.recentlyBrewed = [];
      state.shelf.loaded = false;
      elements.shelfStatus.textContent = '';
      elements.shelfErrorCopy.textContent = error.message;
      elements.shelfError.hidden = false;
      elements.shelfRecipeList.hidden = true;
      elements.shelfCollections.hidden = true;
      elements.shelfEmpty.hidden = true;
      syncShelfUi();
    }
  }

  // Favoriting happens on the recipe screen only, so the recipe page's own
  // control is the one piece of favorite state that needs syncing. The
  // library's shelf filter reads the same list rather than a card's heart.
  function syncShelfUi() {
    const favorites = favoriteIdSet();
    const detailFavorite = state.recipe && favorites.has(state.recipe.id);
    elements.recipeFavoriteButton.setAttribute('aria-pressed', String(Boolean(detailFavorite)));
    elements.recipeFavoriteButton.classList.toggle('is-favorite', Boolean(detailFavorite));
    elements.recipeFavoriteLabel.textContent = detailFavorite ? 'Saved to favorites' : 'Favorite';

    const activeFilters = state.shelfFilters.favorites || state.shelfFilters.brewed;
    elements.libraryFavoritesToggle.setAttribute('aria-pressed', String(state.shelfFilters.favorites));
    elements.libraryBrewedToggle.setAttribute('aria-pressed', String(state.shelfFilters.brewed));
    elements.libraryFavoritesToggle.classList.toggle('is-active', state.shelfFilters.favorites);
    elements.libraryBrewedToggle.classList.toggle('is-active', state.shelfFilters.brewed);
    if (activeFilters && state.shelf.demo) {
      elements.libraryShelfStatus.textContent = 'Showing read-only staging examples. Your own shelf uses the same layout.';
      elements.libraryShelfStatus.hidden = false;
    } else if (activeFilters && !state.shelf.loaded) {
      elements.libraryShelfStatus.textContent = 'Your shelf could not be loaded, so no recipes are filtered out.';
      elements.libraryShelfStatus.hidden = false;
    } else {
      elements.libraryShelfStatus.textContent = '';
      elements.libraryShelfStatus.hidden = true;
    }
  }

  async function setFavorite(recipeId, favorite) {
    const request = favorite
      ? apiFetch(`/api/favorites/${encodeURIComponent(recipeId)}`, { method: 'PUT' })
      : apiFetch(`/api/favorites/${encodeURIComponent(recipeId)}`, { method: 'DELETE' });
    await request;
    const set = favoriteIdSet();
    if (favorite) set.add(recipeId); else set.delete(recipeId);
    const recipe = RECIPES.find((candidate) => candidate.id === recipeId);
    const summary = recipe ? recipeSummaryForClient(recipe) : null;
    const list = state.shelf.favorites.filter((entry) => entry.id !== recipeId);
    if (favorite && summary) list.unshift(summary);
    state.shelf.favorites = list;
    state.shelf.loaded = true;
    state.shelf.loadedDemo = state.shelf.demo;
    renderLibrary();
    renderShelf();
    syncShelfUi();
  }

  async function toggleFavorite(recipeId, button) {
    const wasFavorite = isFavoriteRecipe(recipeId);
    button.disabled = true;
    try {
      await setFavorite(recipeId, !wasFavorite);
      if (window.unNative?.toast) {
        window.unNative.toast(wasFavorite ? 'Removed from favorites' : 'Saved to favorites');
      }
    } catch (error) {
      if (window.unNative?.toast) window.unNative.toast(error.message);
      else console.warn(error.message);
    } finally {
      button.disabled = false;
    }
  }

  function recipeSummaryForClient(recipe) {
    const method = getMethod(recipe.methodId);
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
      totalDuration: recipe.steps.reduce((sum, recipeStep) => sum + recipeStep.duration, 0),
      difficulty: recipe.difficulty,
      tags: recipe.tags,
      accent: method.accent,
      soft: method.soft,
    };
  }

  function shelfRecipeCard(recipe) {
    const method = getMethod(recipe.methodId);
    return `
      <button class="brew-recipe-card" type="button" data-recipe-id="${recipe.id}" style="--card-accent:${method.accent};--card-soft:${method.soft}">
        <span class="brew-recipe-topline">
          <span>${escapeHtml(method.name)}</span>
          <span>${escapeHtml(getTagLabel('profile', recipe.tags.profile[0]))} · v${escapeHtml(recipe.version)}</span>
        </span>
        <span class="brew-recipe-title">${escapeHtml(recipe.title)}</span>
        <span class="brew-recipe-summary">${escapeHtml(recipe.summary)}</span>
        <span class="recipe-tags" aria-label="Recipe tags"><span class="recipe-tag">1:${escapeHtml(formatRatio(recipe.ratio))}</span><span class="recipe-tag">${escapeHtml(formatDuration(recipe.totalDuration))}</span></span>
        <span class="brew-recipe-footer">
          <span>${escapeHtml(recipe.difficulty)}</span>
          <span class="card-arrow" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg></span>
        </span>
      </button>`;
  }

  function renderShelf() {
    const view = state.shelf.view;
    elements.shelfView.value = view;
    const collectionsView = view === 'collections';
    const recipes = shelfRecipes(view);
    const heading = view === 'brewed' ? 'Recently brewed' : (collectionsView ? 'Collections' : 'Favorites');
    const intro = view === 'brewed'
      ? 'The recipes behind your latest brews, newest first.'
      : collectionsView
        ? 'Small shelves you arrange yourself. Private to your account.'
        : 'Recipes you starred, kept private to your account.';
    elements.shelfTitle.textContent = heading;
    elements.shelfIntro.textContent = intro;

    elements.shelfCollections.hidden = !collectionsView;
    elements.shelfRecipeList.hidden = collectionsView || recipes.length === 0;
    elements.shelfRecipeList.innerHTML = collectionsView ? '' : recipes.map(shelfRecipeCard).join('');
    if (collectionsView) renderCollections();

    const empty = !collectionsView && recipes.length === 0;
    elements.shelfEmpty.hidden = !empty;
    if (empty) {
      elements.shelfEmptyTitle.textContent = view === 'brewed' ? 'No brews logged yet' : 'No favorites yet';
      elements.shelfEmptyCopy.textContent = view === 'brewed'
        ? 'Finish a guided brew or log one by hand and it will appear here.'
        : 'Open a recipe and choose Favorite to keep it close.';
      elements.shelfEmptyAction.textContent = 'Browse the library';
    }
    elements.shelfStatus.textContent = state.shelf.demo
      ? 'Showing read-only staging examples. Your private shelf uses the same layout.'
      : '';
    elements.shelfEmptyAction.dataset.shelfAction = view === 'brewed' ? 'journal' : 'library';
  }

  function renderCollections() {
    const list = state.shelf.collections;
    elements.collectionListEmpty.hidden = list.length !== 0;
    elements.collectionList.innerHTML = list.map((collection, index) => `
      <li class="collection-row" data-collection-id="${escapeHtml(collection.id)}">
        <button class="collection-open" type="button" data-open-collection="${escapeHtml(collection.id)}">
          <span class="collection-name">${escapeHtml(collection.name)}</span>
          <span class="collection-count">${collection.recipes.length} ${collection.recipes.length === 1 ? 'recipe' : 'recipes'}</span>
        </button>
        <span class="collection-row-actions">
          <button class="icon-button un-touch-target" type="button" data-move-collection="${escapeHtml(collection.id)}" data-direction="up" aria-label="Move ${escapeHtml(collection.name)} up" ${index === 0 ? 'disabled' : ''}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 15 6-6 6 6"/></svg>
          </button>
          <button class="icon-button un-touch-target" type="button" data-move-collection="${escapeHtml(collection.id)}" data-direction="down" aria-label="Move ${escapeHtml(collection.name)} down" ${index === list.length - 1 ? 'disabled' : ''}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
          </button>
        </span>
      </li>`).join('');
  }

  function openShelf({ view = 'favorites', demo = state.shelf.demo, historyMode = 'pushState', focus = true, transition = 'push', reload = false } = {}) {
    state.shelf.view = view;
    state.shelf.demo = demo;
    if (historyMode) history[historyMode]({ screen: 'shelf' }, '', urlFor('shelf'));
    showScreen('shelf', { focus, transition });
    // Compare against what was actually LOADED, not what was just set: a
    // demo/real switch needs a refetch, and the comparison below would
    // otherwise always read equal.
    if (!state.shelf.loaded || reload || demo !== state.shelf.loadedDemo) loadShelf({ demo });
    else renderShelf();
  }

  function findCollection(id) {
    return state.shelf.collections.find((collection) => String(collection.id) === String(id)) || null;
  }

  function formatCollectionId(id) {
    return String(id);
  }

  function renderCollectionScreen() {
    const collection = findCollection(state.collection.id);
    if (!collection) {
      elements.collectionStatus.textContent = '';
      elements.collectionRecipeList.innerHTML = '';
      elements.collectionRecipeList.hidden = true;
      elements.collectionEmpty.hidden = true;
      elements.collectionError.textContent = 'That collection is no longer available.';
      elements.collectionError.hidden = false;
      return;
    }
    elements.collectionError.hidden = true;
    elements.collectionTitle.textContent = collection.name;
    elements.collectionCount.textContent = `${collection.recipes.length} ${collection.recipes.length === 1 ? 'recipe' : 'recipes'} · order kept as you set it`;
    elements.collectionOrderHint.hidden = collection.recipes.length < 2;
    elements.collectionRecipeList.hidden = collection.recipes.length === 0;
    elements.collectionEmpty.hidden = collection.recipes.length !== 0;
    elements.collectionStatus.textContent = state.shelf.demo
      ? 'Read-only staging example. Your own collection uses the same layout.'
      : '';
    elements.collectionRecipeList.innerHTML = collection.recipes.map((recipe, index) => `
      <li class="collection-recipe-row" data-recipe-id="${escapeHtml(recipe.id)}">
        <span class="collection-recipe-position" aria-hidden="true">${index + 1}</span>
        <button class="collection-recipe-open" type="button" data-recipe-id="${escapeHtml(recipe.id)}">
          <span class="collection-recipe-title">${escapeHtml(recipe.title)}</span>
          <span class="collection-recipe-meta">${escapeHtml(recipe.methodName)} · ${escapeHtml(recipe.difficulty)} · v${escapeHtml(recipe.version)}</span>
        </button>
        <span class="collection-recipe-actions">
          <button class="icon-button un-touch-target" type="button" data-move-recipe="${escapeHtml(recipe.id)}" data-direction="up" aria-label="Move ${escapeHtml(recipe.title)} up" ${index === 0 ? 'disabled' : ''}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 15 6-6 6 6"/></svg>
          </button>
          <button class="icon-button un-touch-target" type="button" data-move-recipe="${escapeHtml(recipe.id)}" data-direction="down" aria-label="Move ${escapeHtml(recipe.title)} down" ${index === collection.recipes.length - 1 ? 'disabled' : ''}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
          </button>
          <button class="icon-button un-touch-target" type="button" data-remove-recipe="${escapeHtml(recipe.id)}" aria-label="Remove ${escapeHtml(recipe.title)} from this collection">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
          </button>
        </span>
      </li>`).join('');
  }

  function openCollection(id, { historyMode = 'pushState', focus = true, transition = 'push' } = {}) {
    state.collection.id = formatCollectionId(id);
    if (historyMode) history[historyMode]({ screen: 'collection', id: state.collection.id }, '', urlFor('collection', state.collection.id));
    showScreen('collection', { focus, transition });
    renderCollectionScreen();
  }

  async function mutateCollection(request, { successMessage } = {}) {
    elements.collectionError.hidden = true;
    try {
      const payload = await request();
      if (payload && payload.collection) {
        const index = state.shelf.collections.findIndex((entry) => String(entry.id) === String(payload.collection.id));
        if (index >= 0) state.shelf.collections[index] = payload.collection;
        else state.shelf.collections.push(payload.collection);
      }
      renderCollectionScreen();
      renderCollections();
      if (successMessage && window.unNative?.toast) window.unNative.toast(successMessage);
      return true;
    } catch (error) {
      elements.collectionError.textContent = error.message;
      elements.collectionError.hidden = false;
      return false;
    }
  }

  async function moveCollection(id, direction) {
    const list = [...state.shelf.collections];
    const index = list.findIndex((collection) => String(collection.id) === String(id));
    const target = direction === 'up' ? index - 1 : index + 1;
    if (index < 0 || target < 0 || target >= list.length) return;
    [list[index], list[target]] = [list[target], list[index]];
    state.shelf.collections = list;
    renderCollections();
    try {
      const payload = await apiFetch('/api/collections/order', {
        method: 'PATCH',
        body: JSON.stringify({ collectionIds: list.map((collection) => collection.id) }),
      });
      state.shelf.collections = payload.collections;
      renderCollections();
    } catch (error) {
      elements.shelfStatus.textContent = error.message;
      await loadShelf({ quiet: true });
    }
  }

  async function moveCollectionRecipe(recipeId, direction) {
    const collection = findCollection(state.collection.id);
    if (!collection) return;
    const ids = collection.recipes.map((recipe) => recipe.id);
    const index = ids.indexOf(recipeId);
    const target = direction === 'up' ? index - 1 : index + 1;
    if (index < 0 || target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    const optimistic = { ...collection, recipes: ids.map((id) => collection.recipes.find((recipe) => recipe.id === id)) };
    const position = state.shelf.collections.findIndex((entry) => String(entry.id) === String(collection.id));
    state.shelf.collections[position] = optimistic;
    renderCollectionScreen();
    await mutateCollection(() => apiFetch(`/api/collections/${encodeURIComponent(collection.id)}/order`, {
      method: 'PATCH',
      body: JSON.stringify({ recipeIds: ids }),
    }));
  }

  function collectionPickerRow(collection, recipeId) {
    const member = collection.recipes.some((recipe) => recipe.id === recipeId);
    return `
      <button class="collection-picker-row${member ? ' is-member' : ''}" type="button" data-pick-collection="${escapeHtml(collection.id)}" aria-pressed="${member}">
        <span class="collection-picker-name">${escapeHtml(collection.name)}</span>
        <span class="collection-picker-mark" aria-hidden="true">${member ? '✓' : '＋'}</span>
      </button>`;
  }

  function renderCollectionPicker() {
    const recipeId = state.collection.recipeId;
    const recipe = RECIPES.find((candidate) => candidate.id === recipeId);
    elements.collectionPickerRecipe.textContent = recipe ? recipe.title : '';
    if (!state.shelf.collections.length) {
      elements.collectionPickerList.innerHTML = '<p class="collection-picker-empty">You have no collections yet. Create one below and this recipe goes straight in.</p>';
      return;
    }
    elements.collectionPickerList.innerHTML = state.shelf.collections.map((collection) => collectionPickerRow(collection, recipeId)).join('');
  }

  async function openCollectionPicker(recipeId) {
    state.collection.recipeId = recipeId;
    elements.collectionPickerError.hidden = true;
    elements.collectionPickerName.value = '';
    elements.collectionPicker.hidden = false;
    document.body.classList.add('term-open');
    document.getElementById('app-shell').inert = true;
    elements.collectionPickerTitle.focus({ preventScroll: true });
    if (!state.shelf.loaded) await loadShelf({ quiet: true });
    renderCollectionPicker();
  }

  function closeCollectionPicker({ restoreFocus = true } = {}) {
    if (elements.collectionPicker.hidden) return;
    elements.collectionPicker.hidden = true;
    document.body.classList.remove('term-open');
    document.getElementById('app-shell').inert = false;
    if (restoreFocus && elements.recipeCollectionsButton) elements.recipeCollectionsButton.focus({ preventScroll: true });
  }

  async function pickCollection(collectionId) {
    const recipeId = state.collection.recipeId;
    const collection = findCollection(collectionId);
    if (!collection || !recipeId) return;
    const member = collection.recipes.some((recipe) => recipe.id === recipeId);
    elements.collectionPickerError.hidden = true;
    try {
      if (member) {
        await apiFetch(`/api/collections/${encodeURIComponent(collectionId)}/recipes/${encodeURIComponent(recipeId)}`, { method: 'DELETE' });
        collection.recipes = collection.recipes.filter((recipe) => recipe.id !== recipeId);
      } else {
        const payload = await apiFetch(`/api/collections/${encodeURIComponent(collectionId)}/recipes`, {
          method: 'POST',
          body: JSON.stringify({ recipeId }),
        });
        const index = state.shelf.collections.findIndex((entry) => String(entry.id) === String(collectionId));
        state.shelf.collections[index] = payload.collection;
      }
      renderCollectionPicker();
      renderCollections();
      renderCollectionScreen();
      if (window.unNative?.toast) {
        window.unNative.toast(member ? `Removed from ${collection.name}` : `Added to ${collection.name}`);
      }
    } catch (error) {
      elements.collectionPickerError.textContent = error.message;
      elements.collectionPickerError.hidden = false;
    }
  }

  async function createCollectionFromPicker(event) {
    event.preventDefault();
    const name = elements.collectionPickerName.value.trim();
    if (!name) return;
    elements.collectionPickerError.hidden = true;
    try {
      const payload = await apiFetch('/api/collections', { method: 'POST', body: JSON.stringify({ name }) });
      state.shelf.collections.push(payload.collection);
      elements.collectionPickerName.value = '';
      renderCollectionPicker();
      renderCollections();
      await pickCollection(payload.collection.id);
    } catch (error) {
      elements.collectionPickerError.textContent = error.message;
      elements.collectionPickerError.hidden = false;
    }
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
    state.lastActiveStepLabel = null;
    state.lastNextStepLabel = null;
    state.lastRenderedStep = null;
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
    renderNextStepLabel(nextRecipeStep.label);
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
    renderActiveStepLabel(recipeStep.label);
    elements.activeWaterTarget.textContent = recipeStep.target ? `${recipeStep.target}g` : 'Prep';
    elements.activeStepInstruction.textContent = recipeStep.instruction;
    elements.previousStep.disabled = stepIndex === 0 && elapsed <= 0;
    renderNextStep(timing);
    const activeTiming = formatStepTiming(state.scaled, stepIndex);
    elements.activeStepTiming.textContent = activeTiming.primary;
    const target = recipeStep.target ? `Water target ${recipeStep.target} grams.` : '';
    elements.activeStepTiming.setAttribute('aria-label', `${recipeStep.label} runs from ${formatDuration(activeTiming.startsAt)} to ${formatDuration(activeTiming.endsAt)}. ${target}`);
    // The visible step block is no longer an aria-live region (it now holds the
    // definition button), so announce step changes through the dedicated
    // announcer that the upcoming-step preview already uses. This fires for
    // the first step when the brew starts and on every later transition.
    if ((state.timer.running || state.timer.started) && state.lastRenderedStep !== stepIndex) {
      elements.timerAnnouncement.textContent = `Step ${stepIndex + 1} of ${state.scaled.steps.length}. ${recipeStep.label}. ${activeTiming.primary}. ${target}`;
    }
    state.lastRenderedStep = stepIndex;
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
      // A first start should announce the step in progress; a resume should
      // stay quiet, so only clear the marker on the not-started transition.
      if (!state.timer.started) state.lastRenderedStep = null;
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
  elements.glossary.addEventListener('click', openGlossary);
  elements.glossarySearch.addEventListener('input', () => {
    state.glossaryQuery = elements.glossarySearch.value;
    renderGlossary();
    history.replaceState({ screen: 'glossary' }, '', urlFor('glossary'));
  });
  elements.glossaryClearSearch.addEventListener('click', () => {
    state.glossaryQuery = '';
    renderGlossary();
    history.replaceState({ screen: 'glossary' }, '', urlFor('glossary'));
    elements.glossarySearch.focus({ preventScroll: true });
  });

  // One delegated handler covers every definition trigger, including the ones
  // rendered later by the timer and the recipe detail view. Triggers drawn
  // inside the panel open in place rather than stacking a second panel.
  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-term]');
    if (!trigger) return;
    const insidePanel = elements.termPanel.contains(trigger);
    openTerm(trigger.dataset.term, insidePanel ? null : trigger);
  });
  elements.termPanelClose.addEventListener('click', () => closeTerm());
  elements.termPanelDone.addEventListener('click', () => {
    closeTerm({ restoreFocus: false });
    openGlossary();
  });
  elements.termPanelBackdrop.addEventListener('click', () => closeTerm());
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !elements.collectionPicker.hidden) {
      event.preventDefault();
      closeCollectionPicker();
      return;
    }
    if (event.key === 'Escape' && state.term.open) {
      event.preventDefault();
      closeTerm();
    }
  });
  elements.home.addEventListener('click', () => {
    state.filters = {};
    navigate('library', null, { transition: 'pop' });
  });
  elements.back.addEventListener('click', () => {
    if (state.screen === 'glossary') navigate('library', null, { transition: 'pop' });
    else if (state.screen === 'brew') navigate('recipe', recipeRouteReference(state.recipe), { transition: 'pop' });
    else if (state.screen === 'recipe') navigate('method', state.recipe.methodId, { transition: 'pop' });
    else if (state.screen === 'journalDetail') openJournal({ demo: state.journal.demo, historyMode: 'replaceState', transition: 'pop' });
    else if (state.screen === 'journalForm' && state.journal.formMode === 'edit') openJournalDetail(state.journal.entry.id, { historyMode: 'replaceState', transition: 'pop' });
    else if (state.screen === 'journalForm' && state.journal.returnTo === 'brew') navigate('brew', recipeRouteReference(state.recipe), { replace: true, transition: 'pop' });
    else if (state.screen === 'journalForm') openJournal({ historyMode: 'replaceState', transition: 'pop' });
    else navigate('library', null, { transition: 'pop' });
  });

  window.addEventListener('popstate', () => {
    closeTerm({ restoreFocus: false });
    parseLocation({ focus: true });
  });
  window.addEventListener('pagehide', cancelTimerTick);


  // -------------------------------------------------------------------------
  // Shelf events.
  // -------------------------------------------------------------------------

  elements.shelfButton.addEventListener('click', () => openShelf({ transition: 'push' }));
  elements.libraryFavoritesToggle.addEventListener('click', () => setShelfFilter('favorites'));
  elements.libraryBrewedToggle.addEventListener('click', () => setShelfFilter('brewed'));
  elements.libraryCollectionsLink.addEventListener('click', () => openShelf({ view: 'collections', transition: 'push' }));
  elements.shelfView.addEventListener('change', () => {
    state.shelf.view = elements.shelfView.value;
    history.replaceState({ screen: 'shelf' }, '', urlFor('shelf'));
    renderShelf();
  });
  elements.shelfRetry.addEventListener('click', () => loadShelf());
  elements.shelfEmptyAction.addEventListener('click', () => {
    if (elements.shelfEmptyAction.dataset.shelfAction === 'journal') openJournal({ transition: 'push' });
    else navigate('library', null, { transition: 'push' });
  });
  elements.shelfRecipeList.addEventListener('click', handleRecipeCardClick);

  elements.recipeFavoriteButton.addEventListener('click', () => toggleFavorite(state.recipe.id, elements.recipeFavoriteButton));
  elements.recipeCollectionsButton.addEventListener('click', () => openCollectionPicker(state.recipe.id));
  elements.collectionPickerClose.addEventListener('click', () => closeCollectionPicker());
  elements.collectionPickerDone.addEventListener('click', () => closeCollectionPicker());
  elements.collectionPickerBackdrop.addEventListener('click', () => closeCollectionPicker());
  elements.collectionPickerCreate.addEventListener('submit', createCollectionFromPicker);
  elements.collectionPickerList.addEventListener('click', (event) => {
    const row = event.target.closest('[data-pick-collection]');
    if (row) pickCollection(row.dataset.pickCollection);
  });

  elements.collectionCreateForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const name = elements.collectionCreateName.value.trim();
    if (!name) {
      elements.collectionCreateName.focus({ preventScroll: true });
      return;
    }
    try {
      const payload = await apiFetch('/api/collections', { method: 'POST', body: JSON.stringify({ name }) });
      state.shelf.collections.push(payload.collection);
      state.shelf.loaded = true;
      elements.collectionCreateName.value = '';
      renderCollections();
      if (window.unNative?.toast) window.unNative.toast('Collection created');
    } catch (error) {
      elements.shelfStatus.textContent = error.message;
    }
  });

  elements.collectionList.addEventListener('click', (event) => {
    const open = event.target.closest('[data-open-collection]');
    if (open) {
      openCollection(open.dataset.openCollection, { transition: 'push' });
      return;
    }
    const move = event.target.closest('[data-move-collection]');
    if (move) moveCollection(move.dataset.moveCollection, move.dataset.direction);
  });

  elements.collectionRename.addEventListener('click', () => {
    const collection = findCollection(state.collection.id);
    if (!collection) return;
    elements.collectionRenameInput.value = collection.name;
    elements.collectionRenameForm.hidden = false;
    elements.collectionRenameInput.focus({ preventScroll: true });
  });
  elements.collectionRenameCancel.addEventListener('click', () => {
    elements.collectionRenameForm.hidden = true;
  });
  elements.collectionRenameSave.addEventListener('click', async () => {
    const name = elements.collectionRenameInput.value.trim();
    if (!name) return;
    const ok = await mutateCollection(() => apiFetch(`/api/collections/${encodeURIComponent(state.collection.id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    }), { successMessage: 'Collection renamed' });
    if (ok) elements.collectionRenameForm.hidden = true;
  });
  elements.collectionDelete.addEventListener('click', () => {
    elements.collectionDeleteConfirmation.hidden = false;
    elements.collectionDeleteConfirm.focus();
  });
  elements.collectionDeleteCancel.addEventListener('click', () => {
    elements.collectionDeleteConfirmation.hidden = true;
    elements.collectionDelete.focus();
  });
  elements.collectionDeleteConfirm.addEventListener('click', async () => {
    try {
      await apiFetch(`/api/collections/${encodeURIComponent(state.collection.id)}`, { method: 'DELETE' });
      state.shelf.collections = state.shelf.collections.filter(
        (collection) => String(collection.id) !== String(state.collection.id)
      );
      if (window.unNative?.toast) window.unNative.toast('Collection deleted');
      openShelf({ view: 'collections', historyMode: 'replaceState', transition: 'pop', reload: false });
      renderCollections();
    } catch (error) {
      elements.collectionError.textContent = error.message;
      elements.collectionError.hidden = false;
    }
  });
  elements.collectionBrowse.addEventListener('click', () => navigate('library', null, { transition: 'pop' }));
  elements.collectionEmptyAction.addEventListener('click', () => navigate('library', null, { transition: 'pop' }));
  elements.collectionRecipeList.addEventListener('click', (event) => {
    const move = event.target.closest('[data-move-recipe]');
    if (move) {
      moveCollectionRecipe(move.dataset.moveRecipe, move.dataset.direction);
      return;
    }
    const remove = event.target.closest('[data-remove-recipe]');
    if (remove) {
      mutateCollection(() => apiFetch(
        `/api/collections/${encodeURIComponent(state.collection.id)}/recipes/${encodeURIComponent(remove.dataset.removeRecipe)}`,
        { method: 'DELETE' }
      ), { successMessage: 'Removed from collection' });
      return;
    }
    const open = event.target.closest('.collection-recipe-open');
    if (open) navigate('recipe', open.dataset.recipeId, { transition: 'push' });
  });

  populateFilters();
  populateJournalControls();
  loadShelf({ quiet: true });
  parseLocation();
})();
