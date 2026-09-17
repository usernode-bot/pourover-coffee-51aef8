(function exposeAdjustments(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PouroverAdjustments = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createAdjustments() {
  const MIN_RATIO = 5;
  const RATIO_STEP = 1;

  const SYMPTOMS = Object.freeze([
    Object.freeze({ id: 'sour', label: 'Sour', variable: 'grind', direction: 'finer', rating: 'acidity' }),
    Object.freeze({ id: 'bitter', label: 'Bitter', variable: 'grind', direction: 'coarser', rating: 'sweetness' }),
    Object.freeze({ id: 'dry', label: 'Dry', variable: 'grind', direction: 'coarser', rating: 'sweetness' }),
    Object.freeze({ id: 'weak', label: 'Weak', variable: 'ratio', direction: 'stronger', rating: 'body' }),
    Object.freeze({ id: 'hollow', label: 'Hollow', variable: 'grind', direction: 'finer', rating: 'body' }),
    Object.freeze({ id: 'muddy', label: 'Muddy', variable: 'grind', direction: 'coarser', rating: 'clarity' }),
    Object.freeze({ id: 'slow-drawdown', label: 'Slow drawdown', variable: 'grind', direction: 'coarser', rating: null }),
  ]);
  const SYMPTOM_BY_ID = new Map(SYMPTOMS.map((symptom) => [symptom.id, symptom]));

  function formatRatio(value) {
    const rounded = Math.round(Number(value) * 100) / 100;
    return Number.isInteger(rounded) ? String(rounded) : String(rounded);
  }

  function selectedSymptoms(values) {
    const ids = Array.isArray(values) ? values : String(values || '').split(',');
    return [...new Set(ids.map((value) => String(value).trim()).filter((value) => SYMPTOM_BY_ID.has(value)))]
      .map((id) => SYMPTOM_BY_ID.get(id));
  }

  function failure(code, message) {
    return { ok: false, code, message };
  }

  function ratingContext(symptoms, ratings = {}) {
    const labels = { acidity: 'acidity', sweetness: 'sweetness', body: 'body', clarity: 'clarity' };
    const fields = [...new Set(symptoms.map((symptom) => symptom.rating).filter(Boolean))];
    const evidence = fields.flatMap((field) => {
      const rating = Number(ratings[field]);
      return Number.isInteger(rating) && rating >= 1 && rating <= 5
        ? [`Your ${labels[field]} rating was ${rating}/5.`]
        : [];
    });
    return evidence.join(' ');
  }

  function recommendAdjustment({ symptoms, recipeSnapshot, grinder, grindSetting, ratings } = {}) {
    const selected = selectedSymptoms(symptoms);
    if (!selected.length) return failure('none', 'Choose at least one symptom from the cup.');
    if (!recipeSnapshot || !Number.isFinite(Number(recipeSnapshot.ratio))) {
      return failure('missing-recipe', 'This brew does not have enough recipe context for a recommendation.');
    }

    const signatures = [...new Set(selected.map((symptom) => `${symptom.variable}:${symptom.direction}`))];
    if (signatures.length > 1) {
      const variables = new Set(selected.map((symptom) => symptom.variable));
      return variables.size > 1
        ? failure('multi-variable', 'Those symptoms point to different variables. Choose the symptom that matters most for the next brew.')
        : failure('conflict', 'Those symptoms point in opposite directions. Choose the symptom that matters most for the next brew.');
    }

    const { variable, direction } = selected[0];
    const symptomLabels = selected.map((symptom) => symptom.label);
    const context = `${recipeSnapshot.title || 'This recipe'} v${recipeSnapshot.version || '?'} at 1:${formatRatio(recipeSnapshot.ratio)}`;
    const evidence = ratingContext(selected, ratings);

    if (variable === 'ratio') {
      const currentRatio = Math.round(Number(recipeSnapshot.ratio) * 100) / 100;
      if (currentRatio <= MIN_RATIO) {
        return failure('ratio-boundary', `This recipe is already at the supported 1:${formatRatio(currentRatio)} ratio boundary. Try logging more detail instead of making it stronger.`);
      }
      const nextRatio = Math.max(MIN_RATIO, Math.round((currentRatio - RATIO_STEP) * 100) / 100);
      const change = `Try a stronger 1:${formatRatio(nextRatio)} ratio instead of 1:${formatRatio(currentRatio)}.`;
      return {
        ok: true,
        variable,
        direction,
        symptoms: selected.map((symptom) => symptom.id),
        symptomLabels,
        title: 'Try a modestly stronger ratio',
        change,
        why: `A weak cup may benefit from more coffee relative to water. ${evidence} This is a starting point, not a guaranteed correction.`.replace('  ', ' '),
        keep: 'Keep the grind setting, water temperature, pour timing, and agitation unchanged.',
        context,
        nextRatio,
      };
    }

    const setting = String(grindSetting || '').trim();
    const grinderName = String(grinder || '').trim();
    const snapshotGrind = String(recipeSnapshot.grind || '').trim();
    const origin = setting
      ? `${setting}${grinderName ? ` on ${grinderName}` : ''}`
      : snapshotGrind || 'the recipe grind guidance';
    const change = `Move one small grind step ${direction} from ${origin}.`;
    const symptomCopy = direction === 'finer'
      ? 'These symptoms can point to an under-extracted cup.'
      : 'These symptoms can point to excess extraction or restricted flow.';
    return {
      ok: true,
      variable,
      direction,
      symptoms: selected.map((symptom) => symptom.id),
      symptomLabels,
      title: `Try one small grind step ${direction}`,
      change,
      why: `${symptomCopy} ${evidence} A small grind change may help, but it is not a guaranteed correction.`.replace('  ', ' '),
      keep: 'Keep the coffee dose, brew ratio, water temperature, pour timing, and agitation unchanged.',
      context,
    };
  }

  function recipeFromSnapshot(snapshot) {
    if (!snapshot || !Array.isArray(snapshot.steps) || !snapshot.tags || !snapshot.methodId) return null;
    return {
      ...snapshot,
      defaultCoffee: Number(snapshot.coffee),
      baseWater: Number(snapshot.water),
      tags: Object.fromEntries(Object.entries(snapshot.tags).map(([facet, values]) => [facet, [...values]])),
      steps: snapshot.steps.map((step) => ({ ...step })),
      attribution: snapshot.attribution || { label: 'Saved brew snapshot' },
    };
  }

  function applyRecommendation(recipe, recommendation, { grindSetting, grinder } = {}) {
    if (!recipe || !recommendation?.ok) return null;
    const adjusted = {
      ...recipe,
      tags: Object.fromEntries(Object.entries(recipe.tags || {}).map(([facet, values]) => [facet, [...values]])),
      steps: (recipe.steps || []).map((step) => ({ ...step })),
    };
    if (recommendation.variable === 'grind') {
      const origin = String(grindSetting || '').trim()
        ? `${String(grindSetting).trim()}${String(grinder || '').trim() ? ` on ${String(grinder).trim()}` : ''}`
        : String(recipe.grind || 'the previous setting');
      adjusted.grind = `One small step ${recommendation.direction} than ${origin}`.slice(0, 120);
      return adjusted;
    }

    const previousWater = Number(recipe.baseWater ?? recipe.water);
    const coffee = Number(recipe.defaultCoffee ?? recipe.coffee);
    const nextWater = Math.round(coffee * recommendation.nextRatio);
    if (!Number.isFinite(previousWater) || previousWater <= 0 || !Number.isFinite(nextWater) || nextWater <= 0) return null;
    const numericIndexes = adjusted.steps
      .map((step, index) => (Number.isFinite(step.target) ? index : -1))
      .filter((index) => index >= 0);
    const finalIndex = numericIndexes.at(-1);
    let previousTarget = 0;
    adjusted.steps = adjusted.steps.map((step, index) => {
      if (!Number.isFinite(step.target)) return step;
      const target = index === finalIndex
        ? nextWater
        : Math.max(previousTarget, Math.min(nextWater, Math.round(nextWater * (Number(step.target) / previousWater))));
      previousTarget = target;
      return { ...step, target };
    });
    adjusted.ratio = recommendation.nextRatio;
    adjusted.baseWater = nextWater;
    return adjusted;
  }

  return {
    MIN_RATIO,
    RATIO_STEP,
    SYMPTOMS,
    applyRecommendation,
    recipeFromSnapshot,
    recommendAdjustment,
    selectedSymptoms,
  };
});
