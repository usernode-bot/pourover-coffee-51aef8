(function startPouroverApp() {
  'use strict';

  const {
    MAX_COFFEE_GRAMS,
    MIN_COFFEE_GRAMS,
    RECIPES,
    clampCoffee,
    formatDuration,
    getRecipe,
    scaleRecipe,
  } = window.PouroverRecipes;

  const screens = {
    library: document.getElementById('library-screen'),
    recipe: document.getElementById('recipe-screen'),
    brew: document.getElementById('brew-screen'),
  };

  const elements = {
    back: document.getElementById('back-button'),
    home: document.getElementById('home-button'),
    about: document.getElementById('about-button'),
    recipeList: document.getElementById('recipe-list'),
    recipeHero: document.getElementById('recipe-hero'),
    recipeArt: document.getElementById('recipe-art'),
    recipeCharacter: document.getElementById('recipe-character'),
    recipeTitle: document.getElementById('recipe-title'),
    recipeDescription: document.getElementById('recipe-description'),
    coffeeDose: document.getElementById('coffee-dose'),
    doseMinus: document.getElementById('dose-minus'),
    dosePlus: document.getElementById('dose-plus'),
    waterTotal: document.getElementById('water-total'),
    recipeRatio: document.getElementById('recipe-ratio'),
    recipeTemperature: document.getElementById('recipe-temperature'),
    recipeGrind: document.getElementById('recipe-grind'),
    recipeDuration: document.getElementById('recipe-duration'),
    recipeEquipment: document.getElementById('recipe-equipment'),
    stepCount: document.getElementById('step-count'),
    recipeSteps: document.getElementById('recipe-steps'),
    startBrew: document.getElementById('start-brew-button'),
    brewMethod: document.getElementById('brew-method'),
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
  };

  const DOSE_STORAGE_KEY = 'pourover-coffee:doses:v1';
  const state = {
    screen: 'library',
    recipe: RECIPES[0],
    scaled: scaleRecipe(RECIPES[0], RECIPES[0].defaultCoffee),
    doses: loadDoses(),
    timer: freshTimer(),
    timerHandle: null,
    lastAnnouncedStep: -1,
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
      // A private browsing mode may decline storage. The current brew still works.
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

  function renderLibrary() {
    elements.recipeList.innerHTML = RECIPES.map((recipe) => {
      const scaled = scaleRecipe(recipe, state.doses[recipe.id] || recipe.defaultCoffee);
      return `
        <button class="recipe-card" type="button" data-recipe-id="${recipe.id}" style="--card-accent:${recipe.accent};--card-soft:${recipe.soft}">
          <span class="recipe-card-number">METHOD ${recipe.number}</span>
          <span class="method-icon">${methodSvg(recipe.id)}</span>
          <span class="relative z-10 mt-12 block">
            <span class="block text-2xl font-semibold tracking-[-0.04em]">${recipe.name}</span>
            <span class="mt-1 block text-sm text-[#705d4f]">${recipe.character}</span>
          </span>
          <span class="relative z-10 mt-5 flex items-center justify-between gap-3">
            <span class="text-xs font-semibold text-[#776253]">1:${formatRatio(recipe.ratio)} · ${formatDuration(scaled.totalDuration)}</span>
            <span class="card-arrow" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg></span>
          </span>
        </button>`;
    }).join('');
  }

  function formatRatio(ratio) {
    return Number.isInteger(ratio) ? String(ratio) : ratio.toFixed(1);
  }

  function selectedDose(recipe) {
    return clampCoffee(state.doses[recipe.id] || recipe.defaultCoffee);
  }

  function chooseRecipe(id) {
    state.recipe = getRecipe(id);
    state.scaled = scaleRecipe(state.recipe, selectedDose(state.recipe));
    applyRecipeTheme();
    renderRecipe();
  }

  function applyRecipeTheme() {
    document.documentElement.style.setProperty('--accent', state.recipe.accent);
    document.documentElement.style.setProperty('--recipe-accent', state.recipe.accent);
    document.documentElement.style.setProperty('--recipe-soft', state.recipe.soft);
    elements.recipeHero.style.setProperty('--recipe-accent', state.recipe.accent);
    elements.recipeHero.style.setProperty('--recipe-soft', state.recipe.soft);
    elements.timerPanel.style.setProperty('--recipe-accent', state.recipe.accent);
  }

  function renderRecipe() {
    const recipe = state.scaled;
    elements.recipeCharacter.textContent = recipe.character;
    elements.recipeTitle.textContent = recipe.name;
    elements.recipeDescription.textContent = recipe.description;
    elements.recipeArt.innerHTML = methodSvg(recipe.id);
    elements.coffeeDose.value = recipe.coffee;
    elements.waterTotal.textContent = recipe.water;
    elements.recipeRatio.textContent = `1:${formatRatio(recipe.ratio)}`;
    elements.recipeTemperature.textContent = recipe.temperature;
    elements.recipeGrind.textContent = recipe.grind;
    elements.recipeDuration.textContent = formatDuration(recipe.totalDuration);
    elements.recipeEquipment.textContent = `You will need: ${recipe.equipment}.`;
    elements.stepCount.textContent = `${recipe.steps.length} steps`;
    elements.recipeSteps.innerHTML = recipe.steps.map((step, index) => `
      <li class="recipe-step">
        <span class="step-index">${index + 1}</span>
        <span>
          <span class="block text-sm font-semibold">${step.label}</span>
          <span class="mt-1 block text-xs leading-5 text-[#806d5e]">${step.instruction}</span>
        </span>
        <span class="step-target">${step.target ? `${step.target}g` : 'Prep'} · ${formatDuration(step.duration)}</span>
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
      if (focus) {
        const title = screens[screen].querySelector('h1');
        title?.focus({ preventScroll: true });
      }
    };

    if (transition !== 'none' && window.unNative?.transition) {
      window.unNative.transition(mutate, { type: transition });
    } else {
      mutate();
    }
  }

  function urlFor(screen, recipeId, shot) {
    const url = new URL(window.location.href);
    url.searchParams.delete('recipe');
    url.searchParams.delete('brew');
    url.searchParams.delete('shot');
    if (screen === 'recipe') url.searchParams.set('recipe', recipeId);
    if (screen === 'brew') url.searchParams.set('brew', recipeId);
    if (shot) url.searchParams.set('shot', shot);
    return `${url.pathname}${url.search}${url.hash}`;
  }

  function navigate(screen, recipeId, { replace = false, focus = true, transition = 'push', shot } = {}) {
    if (recipeId) chooseRecipe(recipeId);
    if (screen === 'brew') renderBrewShell();
    const historyMethod = replace ? 'replaceState' : 'pushState';
    history[historyMethod]({ screen, recipeId: state.recipe.id }, '', urlFor(screen, state.recipe.id, shot));
    showScreen(screen, { focus, transition });
  }

  function parseLocation({ focus = false } = {}) {
    const params = new URLSearchParams(window.location.search);
    const brewId = params.get('brew');
    const recipeId = params.get('recipe');
    const shot = params.get('shot');
    if (brewId && RECIPES.some((recipe) => recipe.id === brewId)) {
      chooseRecipe(brewId);
      state.timer = freshTimer();
      if (shot === 'active') {
        // Reviewer captures must not vary with this browser's saved dose.
        state.scaled = scaleRecipe(state.recipe, state.recipe.defaultCoffee);
        state.timer.elapsed = Math.min(state.scaled.totalDuration - 1, state.scaled.steps[0].duration + 20);
        state.timer.anchorElapsed = state.timer.elapsed;
        state.timer.started = true;
      }
      renderBrewShell();
      showScreen('brew', { focus, transition: 'none' });
      return;
    }
    if (recipeId && RECIPES.some((recipe) => recipe.id === recipeId)) {
      chooseRecipe(recipeId);
      showScreen('recipe', { focus, transition: 'none' });
      return;
    }
    showScreen('library', { focus, transition: 'none' });
  }

  function elapsedNow() {
    if (!state.timer.running) return state.timer.elapsed;
    return state.timer.anchorElapsed + (Date.now() - state.timer.anchorTime) / 1000;
  }

  function stepStart(index) {
    return state.scaled.steps.slice(0, index).reduce((sum, step) => sum + step.duration, 0);
  }

  function stepIndexForElapsed(elapsed) {
    let boundary = 0;
    for (let index = 0; index < state.scaled.steps.length; index += 1) {
      boundary += state.scaled.steps[index].duration;
      if (elapsed < boundary) return index;
    }
    return state.scaled.steps.length - 1;
  }

  function renderBrewShell() {
    state.lastAnnouncedStep = -1;
    elements.brewMethod.textContent = state.scaled.name;
    elements.brewDose.textContent = `${state.scaled.coffee}g coffee · ${state.scaled.water}g water`;
    elements.brewRatio.textContent = `1:${formatRatio(state.scaled.ratio)} · ${state.scaled.temperature}`;
    elements.timerTotal.textContent = `of ${formatDuration(state.scaled.totalDuration)}`;
    elements.stepProgress.innerHTML = state.scaled.steps.map((step, index) => (
      `<span class="progress-dot" data-step-dot="${index}" data-state="upcoming" title="${step.label}"></span>`
    )).join('');
    renderTimer();
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

    const stepIndex = stepIndexForElapsed(elapsed);
    const step = state.scaled.steps[stepIndex];
    const progress = Math.min(1, elapsed / state.scaled.totalDuration);
    elements.timerRing.style.setProperty('--progress', `${progress * 360}deg`);
    elements.timerClock.textContent = formatDuration(Math.floor(elapsed));
    elements.timerStepKicker.textContent = state.timer.running ? 'Brewing' : state.timer.started ? 'Paused' : 'Ready';
    elements.activeStepNumber.textContent = `Step ${stepIndex + 1} of ${state.scaled.steps.length}`;
    elements.activeStepLabel.textContent = step.label;
    elements.activeWaterTarget.textContent = step.target ? `${step.target}g` : 'Prep';
    elements.activeStepInstruction.textContent = step.instruction;
    elements.previousStep.disabled = stepIndex === 0 && elapsed <= 0;

    elements.stepProgress.querySelectorAll('[data-step-dot]').forEach((dot, index) => {
      dot.dataset.state = index < stepIndex ? 'done' : index === stepIndex ? 'active' : 'upcoming';
    });

    if (state.lastAnnouncedStep !== -1 && state.lastAnnouncedStep !== stepIndex && state.timer.running) {
      navigator.vibrate?.(18);
    }
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
    state.timer.elapsed = stepStart(safeIndex);
    state.timer.anchorElapsed = state.timer.elapsed;
    state.timer.anchorTime = Date.now();
    state.timer.started = true;
    state.timer.completed = false;
    state.lastAnnouncedStep = safeIndex;
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

  elements.recipeList.addEventListener('click', (event) => {
    const card = event.target.closest('[data-recipe-id]');
    if (card) navigate('recipe', card.dataset.recipeId, { transition: 'push' });
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
  elements.previousStep.addEventListener('click', () => {
    const current = stepIndexForElapsed(elapsedNow());
    seekToStep(current - 1);
  });
  elements.nextStep.addEventListener('click', () => {
    const current = stepIndexForElapsed(elapsedNow());
    seekToStep(current + 1);
  });
  elements.resetTimer.addEventListener('click', resetTimer);
  elements.brewAgain.addEventListener('click', () => {
    resetTimer();
    toggleTimer();
  });
  elements.returnToRecipe.addEventListener('click', () => navigate('recipe', state.recipe.id, { transition: 'pop' }));
  elements.about.addEventListener('click', openAbout);
  elements.home.addEventListener('click', () => navigate('library', null, { transition: 'pop' }));
  elements.back.addEventListener('click', () => {
    if (state.screen === 'brew') navigate('recipe', state.recipe.id, { transition: 'pop' });
    else navigate('library', null, { transition: 'pop' });
  });

  window.addEventListener('popstate', () => parseLocation({ focus: true }));
  window.addEventListener('pagehide', cancelTimerTick);

  renderLibrary();
  parseLocation();
})();
