(function exposeCoffees(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PouroverCoffees = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createCoffees() {
  const COFFEE_REGIONS = Object.freeze([
    'Africa',
    'The Americas',
    'Asia and the Pacific',
  ]);

  const COFFEES = Object.freeze([
    Object.freeze({
      id: 'yirgacheffe',
      name: 'Yirgacheffe',
      region: 'Africa',
      origin: 'Gedeo zone, Ethiopia',
      prized: 'Washed Yirgacheffe is known for jasmine-like aromatics and a lemony, tea-like cup from high-altitude gardens.',
      brewTip: 'Choose a light roast and a medium-fine grind so the florals stay clear.',
      recipeId: 'v60-bright',
    }),
    Object.freeze({
      id: 'harrar',
      name: 'Harrar',
      region: 'Africa',
      origin: 'Eastern highlands, Ethiopia',
      prized: 'Sun-dried Harrar beans are full of ripe fruit, often blueberry, with a heavy, wine-like body.',
      brewTip: 'A fuller steep brings out the sweetness of a natural coffee.',
      recipeId: 'aeropress-inverted',
    }),
    Object.freeze({
      id: 'kenya-aa',
      name: 'Kenya AA',
      region: 'Africa',
      origin: 'Nyeri, Kenya',
      prized: 'AA is Kenya’s largest bean grade, prized for juicy blackcurrant and grapefruit acidity.',
      brewTip: 'A thick paper filter keeps the bright acidity clean and sparkling.',
      recipeId: 'chemex-bright-pulse',
    }),
    Object.freeze({
      id: 'panama-gesha',
      name: 'Gesha',
      region: 'The Americas',
      origin: 'Boquete, Panama',
      prized: 'Panama Gesha became famous through cupping competitions for its bergamot, jasmine and peach notes.',
      brewTip: 'Pour gently with hot water; heavy agitation hides its delicacy.',
      recipeId: 'cotton-delicate-light',
    }),
    Object.freeze({
      id: 'blue-mountain',
      name: 'Blue Mountain',
      region: 'The Americas',
      origin: 'Blue Mountains, Jamaica',
      prized: 'Grown on cool, misty slopes, Blue Mountain is mild, smooth and low in bitterness, and is sold under a protected name.',
      brewTip: 'A balanced flat-bed brew keeps it soft.',
      recipeId: 'kalita-flat-balance',
    }),
    Object.freeze({
      id: 'huila',
      name: 'Huila',
      region: 'The Americas',
      origin: 'Southern Colombia',
      prized: 'Huila brings caramel sweetness with red fruit and a balanced finish.',
      brewTip: 'An open-close hybrid builds sweetness.',
      recipeId: 'switch-hybrid',
    }),
    Object.freeze({
      id: 'antigua',
      name: 'Antigua',
      region: 'The Americas',
      origin: 'Antigua valley, Guatemala',
      prized: 'Grown between volcanoes, Antigua has cocoa, spice and a full body.',
      brewTip: 'Steep it for a rich, forgiving cup.',
      recipeId: 'clever-water-first',
    }),
    Object.freeze({
      id: 'kona',
      name: 'Kona',
      region: 'Asia and the Pacific',
      origin: 'Big Island, Hawaii',
      prized: 'Small farms on volcanic slopes grow Kona, buttery and nutty with gentle acidity.',
      brewTip: 'Even pulses bring out its sweetness.',
      recipeId: 'v60-sweet-pulse',
    }),
    Object.freeze({
      id: 'mandheling',
      name: 'Mandheling',
      region: 'Asia and the Pacific',
      origin: 'North Sumatra, Indonesia',
      prized: 'Wet-hulled Mandheling is earthy and syrupy, with cedar and dark chocolate notes and a famously heavy body.',
      brewTip: 'A medium to dark roast and full immersion suit its weight.',
      recipeId: 'switch-full-immersion',
    }),
    Object.freeze({
      id: 'toraja',
      name: 'Toraja',
      region: 'Asia and the Pacific',
      origin: 'South Sulawesi, Indonesia',
      prized: 'Highland Toraja pairs herbal, spicy notes with dark fruit and a low, rounded acidity.',
      brewTip: 'Steep coffee-first for extra body without bitterness.',
      recipeId: 'clever-coffee-first',
    }),
  ]);

  const COFFEES_BY_ID = new Map(COFFEES.map((coffee) => [coffee.id, coffee]));

  function getCoffee(id) {
    return COFFEES_BY_ID.get(id) || null;
  }

  function coffeesByRegion() {
    return COFFEE_REGIONS.map((region) => ({
      region,
      coffees: COFFEES.filter((coffee) => coffee.region === region),
    }));
  }

  return {
    COFFEE_REGIONS,
    COFFEES,
    coffeesByRegion,
    getCoffee,
  };
});
