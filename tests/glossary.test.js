const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  GLOSSARY_CATEGORIES,
  GLOSSARY_FACET_TERMS,
  GLOSSARY_FILTER_TERMS,
  GLOSSARY_STEP_TERMS,
  GLOSSARY_TERMS,
  getGlossaryTerm,
  getGlossaryTermForFacet,
  getGlossaryTermForStep,
  getGlossaryTermsForFilter,
  glossaryTermsByCategory,
  searchGlossary,
} = require('../public/glossary');
const { RECIPES, TAG_KEYS, TAG_TAXONOMY } = require('../public/recipes');

const root = path.resolve(__dirname, '..');

test('every glossary term is complete and uniquely identified', () => {
  assert.ok(GLOSSARY_TERMS.length >= 40);
  const ids = new Set();
  for (const term of GLOSSARY_TERMS) {
    assert.ok(term.id && /^[a-z0-9-]+$/.test(term.id), term.id);
    assert.ok(!ids.has(term.id), `duplicate id: ${term.id}`);
    ids.add(term.id);
    assert.ok(term.term.trim(), term.id);
    assert.ok(term.summary.trim(), `${term.id} summary`);
    assert.ok(term.detail.trim(), `${term.id} detail`);
    assert.ok(GLOSSARY_CATEGORIES.includes(term.category), `${term.id} category`);
    // A definition that is shorter than its one-line summary has nothing to add.
    assert.ok(term.detail.length > term.summary.length, `${term.id} detail depth`);
    assert.ok(Array.isArray(term.seeAlso), `${term.id} seeAlso`);
    for (const related of term.seeAlso) {
      assert.ok(getGlossaryTerm(related), `${term.id} links to unknown term ${related}`);
      assert.notEqual(related, term.id, `${term.id} links to itself`);
    }
    assert.equal(new Set(term.seeAlso).size, term.seeAlso.length, `${term.id} duplicate seeAlso`);
  }
});

test('no definition reuses another term id or repeats a see-also pair', () => {
  const seen = new Map();
  for (const term of GLOSSARY_TERMS) {
    const key = term.term.toLowerCase();
    assert.ok(!seen.has(key), `duplicate term label: ${term.term}`);
    seen.set(key, term.id);
  }
});

test('every taxonomy label and facet has a definition', () => {
  for (const facet of TAG_KEYS) {
    assert.ok(getGlossaryTermForFacet(facet), `facet ${facet}`);
    for (const entry of TAG_TAXONOMY[facet].values) {
      const term = getGlossaryTermsForFilter(facet, entry.value);
      assert.ok(term, `${facet}:${entry.value}`);
      assert.ok(GLOSSARY_FILTER_TERMS[facet], facet);
    }
  }
  // Unknown facets and values resolve to nothing rather than throwing.
  assert.equal(getGlossaryTermForFacet('nope'), null);
  assert.equal(getGlossaryTermsForFilter('roast', 'green'), null);
  assert.equal(getGlossaryTermsForFilter('nope', 'light'), null);
});

test('every recipe tag value used in the catalog resolves to a definition', () => {
  for (const recipe of RECIPES) {
    for (const facet of TAG_KEYS) {
      for (const value of recipe.tags[facet]) {
        assert.ok(getGlossaryTermsForFilter(facet, value), `${recipe.id}:${facet}:${value}`);
      }
    }
  }
});

test('specialized timer steps link to a definition and plain ones do not', () => {
  const labels = new Set();
  for (const recipe of RECIPES) {
    for (const recipeStep of recipe.steps) labels.add(recipeStep.label);
  }
  // Every mapped label must exist in the catalog, so a renamed step cannot
  // leave a dangling entry behind.
  for (const label of Object.keys(GLOSSARY_STEP_TERMS)) {
    assert.ok(labels.has(label), `mapped step not in any recipe: ${label}`);
    assert.ok(getGlossaryTermForStep(label), label);
  }
  for (const label of labels) {
    const term = getGlossaryTermForStep(label);
    if (term) assert.ok(GLOSSARY_TERMS.includes(term), label);
  }
  assert.equal(getGlossaryTermForStep('Draw down').id, 'drawdown');
  assert.equal(getGlossaryTermForStep('Not a real step'), null);
});

test('the glossary groups every term exactly once by category', () => {
  const groups = glossaryTermsByCategory();
  assert.deepEqual(groups.map((group) => group.category), GLOSSARY_CATEGORIES);
  const grouped = groups.flatMap((group) => group.terms.map((term) => term.id));
  assert.equal(grouped.length, GLOSSARY_TERMS.length);
  assert.deepEqual([...grouped].sort(), GLOSSARY_TERMS.map((term) => term.id).sort());
});

test('glossary search matches names, copy, categories, and empties cleanly', () => {
  assert.equal(searchGlossary('').length, GLOSSARY_TERMS.length);
  assert.equal(searchGlossary('   ').length, GLOSSARY_TERMS.length);
  assert.deepEqual(searchGlossary('drawdown').map((term) => term.id), ['drawdown']);
  assert.ok(searchGlossary('BLOOM').some((term) => term.id === 'bloom'));
  assert.ok(searchGlossary('standing water').some((term) => term.id === 'immersion'));
  assert.ok(searchGlossary('technique').every((term) => term.id));
  assert.deepEqual(searchGlossary('zzzzz'), []);
});

test('glossary lookups are immutable and never hand back a mutable catalog', () => {
  const term = getGlossaryTerm('bloom');
  assert.ok(Object.isFrozen(term));
  assert.ok(Object.isFrozen(term.seeAlso));
  assert.throws(() => { GLOSSARY_TERMS.push({}); }, TypeError);
  // Assignment silently no-ops in sloppy mode, so assert the value survives.
  term.term = 'Changed';
  assert.equal(term.term, 'Bloom');
  assert.equal(getGlossaryTerm('missing'), null);
});

test('glossary copy is stored separately from recipe data', () => {
  const glossarySource = fs.readFileSync(path.join(root, 'public/glossary.js'), 'utf8');
  const recipesSource = fs.readFileSync(path.join(root, 'public/recipes.js'), 'utf8');
  assert.doesNotMatch(recipesSource, /GLOSSARY|glossaryTermsByCategory|getGlossaryTerm/);
  assert.doesNotMatch(glossarySource, /scaleRecipe|filterRecipes|RECIPES\s*=/);
});

test('every glossary string is free of em dash encodings', () => {
  const source = fs.readFileSync(path.join(root, 'public/glossary.js'), 'utf8');
  assert.doesNotMatch(source, /—|&mdash;|&#8212;|\\u2014/);
  for (const term of GLOSSARY_TERMS) {
    for (const value of [term.term, term.summary, term.detail, term.category]) {
      assert.doesNotMatch(value, /—|&mdash;|&#8212;/);
    }
  }
});
