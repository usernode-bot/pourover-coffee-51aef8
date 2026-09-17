const test = require('node:test');
const assert = require('node:assert/strict');

const {
  SYMPTOMS,
  applyRecommendation,
  recipeFromSnapshot,
  recommendAdjustment,
  selectedSymptoms,
} = require('../public/adjustments');

function snapshot(overrides = {}) {
  return {
    id: 'v60-test',
    revisionId: 'v60-test@2',
    version: 2,
    methodId: 'v60',
    title: 'Test V60',
    coffee: 20,
    water: 334,
    ratio: 16.67,
    grind: 'Medium-fine',
    temperature: '93°C',
    difficulty: 'Approachable',
    equipment: 'V60 and kettle',
    summary: 'Test summary',
    result: 'Test result',
    attribution: { label: 'Pourover Coffee original' },
    tags: {
      roast: ['light'], profile: ['balanced'], technique: ['percolation'],
      experience: ['forgiving'], serving: ['single-cup'],
    },
    steps: [
      { label: 'Bloom', action: 'pour', duration: 40, target: 60, instruction: 'Bloom.', preparation: 'Prepare.' },
      { label: 'Pause', action: 'wait', duration: 10, instruction: 'Wait.', preparation: 'Watch.' },
      { label: 'Finish', action: 'pour', duration: 80, target: 334, instruction: 'Finish.', preparation: 'Pour.' },
    ],
    ...overrides,
  };
}

test('the controlled symptom vocabulary covers every supported issue symptom', () => {
  assert.deepEqual(SYMPTOMS.map((symptom) => symptom.id), [
    'sour', 'bitter', 'dry', 'weak', 'hollow', 'muddy', 'slow-drawdown',
  ]);
  assert.deepEqual(selectedSymptoms('sour,unknown,sour').map((symptom) => symptom.id), ['sour']);
});

test('each symptom deterministically returns its one bounded variable and direction', () => {
  const expected = {
    sour: ['grind', 'finer'],
    bitter: ['grind', 'coarser'],
    dry: ['grind', 'coarser'],
    weak: ['ratio', 'stronger'],
    hollow: ['grind', 'finer'],
    muddy: ['grind', 'coarser'],
    'slow-drawdown': ['grind', 'coarser'],
  };
  for (const [symptom, [variable, direction]] of Object.entries(expected)) {
    const result = recommendAdjustment({ symptoms: [symptom], recipeSnapshot: snapshot() });
    assert.equal(result.ok, true, symptom);
    assert.equal(result.variable, variable, symptom);
    assert.equal(result.direction, direction, symptom);
    assert.match(result.why, /not a guaranteed correction/i, symptom);
  }
});

test('compatible symptoms combine only when they resolve to the same change', () => {
  const finer = recommendAdjustment({ symptoms: ['sour', 'hollow'], recipeSnapshot: snapshot() });
  const coarser = recommendAdjustment({ symptoms: ['bitter', 'dry', 'muddy', 'slow-drawdown'], recipeSnapshot: snapshot() });
  assert.equal(finer.ok, true);
  assert.equal(finer.title, 'Try one small grind step finer');
  assert.equal(coarser.ok, true);
  assert.equal(coarser.title, 'Try one small grind step coarser');
});

test('opposite and multi-variable symptom combinations ask for one dominant symptom', () => {
  const conflict = recommendAdjustment({ symptoms: ['sour', 'bitter'], recipeSnapshot: snapshot() });
  const multiVariable = recommendAdjustment({ symptoms: ['sour', 'weak'], recipeSnapshot: snapshot() });
  assert.deepEqual([conflict.ok, conflict.code], [false, 'conflict']);
  assert.deepEqual([multiVariable.ok, multiVariable.code], [false, 'multi-variable']);
  assert.match(conflict.message, /matters most/);
  assert.match(multiVariable.message, /matters most/);
});

test('recorded setup and relevant ratings explain context without changing the rule', () => {
  const result = recommendAdjustment({
    symptoms: ['sour'],
    recipeSnapshot: snapshot(),
    grinder: 'C40',
    grindSetting: '24 clicks',
    ratings: { acidity: 5, sweetness: 2 },
  });
  assert.equal(result.change, 'Move one small grind step finer from 24 clicks on C40.');
  assert.match(result.why, /acidity rating was 5\/5/);
  assert.doesNotMatch(result.why, /sweetness/);
  assert.match(result.keep, /brew ratio/);
});

test('weak cups get a bounded stronger ratio and preserve all other variables', () => {
  const result = recommendAdjustment({ symptoms: ['weak'], recipeSnapshot: snapshot(), ratings: { body: 2 } });
  assert.equal(result.ok, true);
  assert.equal(result.nextRatio, 15.67);
  assert.equal(result.change, 'Try a stronger 1:15.67 ratio instead of 1:16.67.');
  assert.match(result.why, /body rating was 2\/5/);
  assert.match(result.keep, /grind setting/);

  const boundary = recommendAdjustment({ symptoms: ['weak'], recipeSnapshot: snapshot({ ratio: 5 }) });
  assert.deepEqual([boundary.ok, boundary.code], [false, 'ratio-boundary']);
  const clamped = recommendAdjustment({ symptoms: ['weak'], recipeSnapshot: snapshot({ ratio: 5.5 }) });
  assert.equal(clamped.nextRatio, 5);
});

test('missing selections and recipe context fail transparently', () => {
  assert.deepEqual(recommendAdjustment({ symptoms: [], recipeSnapshot: snapshot() }).code, 'none');
  assert.deepEqual(recommendAdjustment({ symptoms: ['sour'] }).code, 'missing-recipe');
});

test('follow-up grind recipes change only grind guidance', () => {
  const base = recipeFromSnapshot(snapshot());
  const result = recommendAdjustment({ symptoms: ['sour'], recipeSnapshot: snapshot() });
  const adjusted = applyRecommendation(base, result, { grinder: 'C40', grindSetting: '24 clicks' });
  assert.equal(adjusted.grind, 'One small step finer than 24 clicks on C40');
  assert.equal(adjusted.ratio, base.ratio);
  assert.equal(adjusted.baseWater, base.baseWater);
  assert.deepEqual(adjusted.steps, base.steps);
});

test('follow-up ratio recipes proportionally rescale cumulative targets only', () => {
  const base = recipeFromSnapshot(snapshot());
  const result = recommendAdjustment({ symptoms: ['weak'], recipeSnapshot: snapshot() });
  const adjusted = applyRecommendation(base, result);
  assert.equal(adjusted.ratio, 15.67);
  assert.equal(adjusted.baseWater, 313);
  assert.equal(adjusted.grind, base.grind);
  assert.deepEqual(adjusted.steps.map((step) => step.target), [56, undefined, 313]);
  assert.deepEqual(adjusted.steps.map((step) => step.action), base.steps.map((step) => step.action));
});
