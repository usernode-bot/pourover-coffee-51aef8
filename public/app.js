(function startPouroverApp() {
  'use strict';

  const {
    FILTER_KEYS,
    MAX_COFFEE_GRAMS,
    METHODS,
    MIN_COFFEE_GRAMS,
    RECIPES,
    TAG_KEYS,
    TAG_TAXONOMY,
    clampCoffee,
    filterRecipes,
    formatDuration,
    getBrewTiming,
    getMethod,
    getRecipe,
    getRecipesForMethod,
    getStepStart,
    getTagLabel,
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
    glossary: document.getElementById('glossary-screen'),
  };

  const elements = {
    back: document.getElementById('back-button'),
    home: document.getElementById('home-button'),
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
    brewAgain: document.getElementById('brew-again'),
    returnToRecipe: document.getElementById('return-to-recipe'),
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
    state.recipe = getRecipe(id);
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
    elements.recipeAttribution.textContent = recipe.attribution.label;
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
      return `
      <li class="recipe-step">
        <span class="step-index">${index + 1}</span>
        <span>
          <span class="recipe-step-label block text-sm font-semibold">${label}</span>
          <span class="mt-1 block text-xs leading-5 text-[#806d5e]">${escapeHtml(recipeStep.instruction)}</span>
        </span>
        <span class="step-target">${recipeStep.target ? `${recipeStep.target}g` : 'Prep'} · ${formatDuration(recipeStep.duration)}</span>
      </li>`;
    }).join('');
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

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[char]));
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
    ['method', 'recipe', 'brew', 'shot', 'glossary', 'term', 'q', 'filterMethod', ...TAG_KEYS].forEach((key) => url.searchParams.delete(key));
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
    const canonicalId = screen === 'method' ? state.method.id : state.recipe.id;
    history[replace ? 'replaceState' : 'pushState']({ screen, id: canonicalId }, '', urlFor(screen, canonicalId, shot));
    showScreen(screen, { focus, transition });
  }

  function filtersFromLocation(params) {
    const values = { method: params.get('filterMethod') || '' };
    for (const facet of TAG_KEYS) values[facet] = params.get(facet) || '';
    return normalizeFilters(values);
  }

  function isKnownRecipeReference(id) {
    return RECIPES.some((recipe) => recipe.id === id) || METHODS.some((method) => method.id === id);
  }

  function parseLocation({ focus = false } = {}) {
    const params = new URLSearchParams(window.location.search);
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
    // The visible step block is no longer an aria-live region (it now holds the
    // definition button), so announce step changes through the dedicated
    // announcer that the upcoming-step preview already uses. This fires for
    // the first step when the brew starts and on every later transition.
    if ((state.timer.running || state.timer.started) && state.lastRenderedStep !== stepIndex) {
      const target = recipeStep.target ? ` Water target ${recipeStep.target} grams.` : '';
      elements.timerAnnouncement.textContent = `Step ${stepIndex + 1} of ${state.scaled.steps.length}. ${recipeStep.label}.${target}`;
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
    navigate('brew', state.recipe.id, { transition: 'push' });
  });
  elements.timerToggle.addEventListener('click', toggleTimer);
  elements.previousStep.addEventListener('click', () => seekToStep(getBrewTiming(state.scaled, elapsedNow()).stepIndex - 1));
  elements.nextStep.addEventListener('click', () => seekToStep(getBrewTiming(state.scaled, elapsedNow()).stepIndex + 1));
  elements.resetTimer.addEventListener('click', resetTimer);
  elements.brewAgain.addEventListener('click', () => { resetTimer(); toggleTimer(); });
  elements.returnToRecipe.addEventListener('click', () => navigate('recipe', state.recipe.id, { transition: 'pop' }));
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
    else if (state.screen === 'brew') navigate('recipe', state.recipe.id, { transition: 'pop' });
    else if (state.screen === 'recipe') navigate('method', state.recipe.methodId, { transition: 'pop' });
    else navigate('library', null, { transition: 'pop' });
  });

  window.addEventListener('popstate', () => {
    closeTerm({ restoreFocus: false });
    parseLocation({ focus: true });
  });
  window.addEventListener('pagehide', cancelTimerTick);

  populateFilters();
  parseLocation();
})();
