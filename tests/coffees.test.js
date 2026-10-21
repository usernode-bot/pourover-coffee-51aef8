const test = require('node:test');
const assert = require('node:assert/strict');

const {
  COFFEE_REGIONS,
  COFFEES,
  coffeesByRegion,
  getCoffee,
} = require('../public/coffees');
const { getRecipe } = require('../public/recipes');

test('every coffee entry is complete and uniquely identified', () => {
  assert.equal(COFFEES.length, 10);
  const ids = new Set();
  const names = new Set();
  for (const coffee of COFFEES) {
    assert.ok(coffee.id && /^[a-z0-9-]+$/.test(coffee.id), coffee.id);
    assert.ok(!ids.has(coffee.id), `duplicate id: ${coffee.id}`);
    ids.add(coffee.id);
    assert.ok(coffee.name.trim(), `${coffee.id} name`);
    assert.ok(!names.has(coffee.name), `duplicate name: ${coffee.name}`);
    names.add(coffee.name);
    assert.ok(coffee.origin.trim(), `${coffee.id} origin`);
    assert.ok(coffee.prized.trim(), `${coffee.id} prized`);
    assert.ok(coffee.brewTip.trim(), `${coffee.id} brewTip`);
    assert.ok(COFFEE_REGIONS.includes(coffee.region), `${coffee.id} region`);
    for (const value of [coffee.name, coffee.origin, coffee.prized, coffee.brewTip]) {
      assert.doesNotMatch(value, /—|&mdash;|&#8212;/, coffee.id);
    }
  }
});

test('every coffee recipe link resolves to a recipe', () => {
  for (const coffee of COFFEES) {
    if (coffee.recipeId) assert.ok(getRecipe(coffee.recipeId), `${coffee.id} -> ${coffee.recipeId}`);
  }
});

test('coffees group by region in the declared order', () => {
  const groups = coffeesByRegion();
  assert.deepEqual(groups.map((group) => group.region), COFFEE_REGIONS);
  for (const group of groups) assert.ok(group.coffees.length > 0, group.region);
  const grouped = groups.flatMap((group) => group.coffees.map((coffee) => coffee.id));
  assert.equal(grouped.length, COFFEES.length);
  assert.deepEqual([...grouped].sort(), COFFEES.map((coffee) => coffee.id).sort());
  assert.equal(getCoffee('panama-gesha').name, 'Gesha');
  assert.equal(getCoffee('nope'), null);
});
