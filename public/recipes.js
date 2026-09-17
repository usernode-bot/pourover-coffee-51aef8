(function exposeRecipes(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PouroverRecipes = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createRecipes() {
  const MIN_COFFEE_GRAMS = 5;
  const MAX_COFFEE_GRAMS = 60;
  const DEFAULT_PREPARATION_LEAD_SECONDS = 15;
  const IMMINENT_PREPARATION_SECONDS = 10;
  const INITIAL_RECIPE_PUBLISHED_AT = '2026-09-16';
  const TAG_KEYS = Object.freeze(['roast', 'profile', 'technique', 'experience', 'serving']);
  const FILTER_KEYS = Object.freeze(['method', ...TAG_KEYS]);
  const STEP_ACTIONS = Object.freeze({
    prepare: 'Prepare',
    pour: 'Pour',
    add: 'Add',
    stir: 'Stir',
    swirl: 'Swirl',
    steep: 'Steep',
    release: 'Release',
    drain: 'Drain',
    flip: 'Flip',
    press: 'Press',
    plunge: 'Plunge',
    heat: 'Heat',
    wait: 'Wait',
    serve: 'Serve',
  });

  const TAG_TAXONOMY = Object.freeze({
    roast: Object.freeze({
      label: 'Roast',
      values: Object.freeze([
        { value: 'light', label: 'Light' },
        { value: 'medium', label: 'Medium' },
        { value: 'dark', label: 'Dark' },
      ]),
    }),
    profile: Object.freeze({
      label: 'Cup profile',
      values: Object.freeze([
        { value: 'bright', label: 'Bright' },
        { value: 'sweet', label: 'Sweet' },
        { value: 'balanced', label: 'Balanced' },
        { value: 'high-clarity', label: 'High clarity' },
        { value: 'full-bodied', label: 'Full-bodied' },
        { value: 'intense', label: 'Intense' },
      ]),
    }),
    technique: Object.freeze({
      label: 'Technique',
      values: Object.freeze([
        { value: 'percolation', label: 'Percolation' },
        { value: 'immersion', label: 'Immersion' },
        { value: 'hybrid', label: 'Hybrid' },
        { value: 'pressure-assisted', label: 'Pressure-assisted' },
        { value: 'single-pour', label: 'Single pour' },
        { value: 'pulse', label: 'Pulse pours' },
      ]),
    }),
    experience: Object.freeze({
      label: 'Experience',
      values: Object.freeze([
        { value: 'forgiving', label: 'Forgiving' },
        { value: 'quick', label: 'Quick' },
        { value: 'precise', label: 'Precise' },
        { value: 'experimental', label: 'Experimental' },
      ]),
    }),
    serving: Object.freeze({
      label: 'Serving',
      values: Object.freeze([
        { value: 'single-cup', label: 'Single cup' },
        { value: 'large-cup', label: 'Large cup' },
        { value: 'batch', label: 'Batch' },
      ]),
    }),
  });

  const METHODS = Object.freeze([
    {
      id: 'v60',
      name: 'V60',
      number: '01',
      character: 'Bright and articulate',
      description: 'A responsive cone brewer for clear cups, layered sweetness, and careful pouring.',
      equipment: 'V60 02, paper filter, server, and gooseneck kettle',
      family: 'Cone percolation',
      filterMaterial: 'Paper',
      defaultRecipeId: 'v60-bright',
      accent: '#b95332',
      soft: '#f2d6c8',
    },
    {
      id: 'switch',
      name: 'Hario Switch',
      number: '02',
      character: 'Sweet and adaptable',
      description: 'A valve brewer that moves easily between percolation, immersion, and hybrid cups.',
      equipment: 'Switch 03, paper filter, server, gooseneck kettle, and spoon',
      family: 'Valve hybrid',
      filterMaterial: 'Paper',
      defaultRecipeId: 'switch-hybrid',
      accent: '#54705a',
      soft: '#d7e2d5',
    },
    {
      id: 'mugen',
      name: 'Mugen',
      number: '03',
      character: 'Round and effortless',
      description: 'A low-bypass cone made for simple pours, generous texture, and repeatable daily coffee.',
      equipment: 'Mugen dripper, paper filter, server, and kettle',
      family: 'Low-bypass percolation',
      filterMaterial: 'Paper',
      defaultRecipeId: 'mugen-one-pour',
      accent: '#8b5d3d',
      soft: '#ead9c9',
    },
    {
      id: 'clever',
      name: 'Clever Dripper',
      number: '04',
      character: 'Full and forgiving',
      description: 'An immersion brewer with a paper-filtered finish and an easy, dependable workflow.',
      equipment: 'Clever Dripper, paper filter, cup or server, and spoon',
      family: 'Immersion release',
      filterMaterial: 'Paper',
      defaultRecipeId: 'clever-water-first',
      accent: '#3f6570',
      soft: '#d5e4e5',
    },
    {
      id: 'cotton',
      name: 'Cotton Filter',
      number: '05',
      character: 'Silky and expressive',
      description: 'A patient cloth-filter method for rounded texture, concentrated sweetness, and slow pouring.',
      equipment: 'Cotton filter, nel frame, server, and gooseneck kettle',
      family: 'Cloth percolation',
      filterMaterial: 'Cotton cloth',
      defaultRecipeId: 'cotton-silky',
      accent: '#96743f',
      soft: '#ede2c5',
    },
    {
      id: 'kalita',
      name: 'Kalita Wave',
      number: '06',
      character: 'Balanced and steady',
      description: 'A flat-bottom brewer with three drain holes for even extraction, approachable pulses, and rounded clarity.',
      equipment: 'Kalita Wave 185, Wave paper filter, server, and gooseneck kettle',
      family: 'Flat-bottom percolation',
      filterMaterial: 'Paper',
      defaultRecipeId: 'kalita-flat-balance',
      accent: '#9a5b46',
      soft: '#edd7cf',
    },
    {
      id: 'chemex',
      name: 'Chemex',
      number: '07',
      character: 'Clean and generous',
      description: 'A thick-filter brewer for polished clarity, larger servings, and patient staged pours.',
      equipment: 'Six-cup Chemex, bonded paper filter, scale, and gooseneck kettle',
      family: 'Thick-filter percolation',
      filterMaterial: 'Bonded paper',
      defaultRecipeId: 'chemex-clean-two-stage',
      accent: '#725f4c',
      soft: '#e6ddd1',
    },
    {
      id: 'aeropress',
      name: 'AeroPress',
      number: '08',
      character: 'Fast and versatile',
      description: 'An immersion brewer finished with hand pressure for compact, expressive cups in standard or inverted form.',
      equipment: 'AeroPress, paper micro-filter, sturdy mug, paddle, and kettle',
      family: 'Pressure-assisted immersion',
      filterMaterial: 'Paper micro-filter',
      defaultRecipeId: 'aeropress-standard',
      accent: '#4e6572',
      soft: '#d7e2e6',
    },
  ]);

  const ORIGINAL_ATTRIBUTION = Object.freeze({
    type: 'original',
    name: 'Pourover Coffee',
    label: 'Pourover Coffee original',
  });

  function inferStepAction(label) {
    const value = String(label || '').toLowerCase();
    if (/press/.test(value)) return 'press';
    if (/plunge/.test(value)) return 'plunge';
    if (/flip/.test(value)) return 'flip';
    if (/heat|preheat/.test(value)) return 'heat';
    if (/stir|settle$|break the crust/.test(value)) return 'stir';
    if (/swirl/.test(value)) return 'swirl';
    if (/steep|rest/.test(value)) return 'steep';
    if (/release|open/.test(value) && !/open pour|open bloom/.test(value)) return 'release';
    if (/draw|drain|drops/.test(value)) return 'drain';
    if (/add coffee|coffee first/.test(value)) return 'add';
    if (/prepare|settle the bed|shape the bed/.test(value)) return 'prepare';
    if (/bloom|pour|pulse|fill|finish|build|water first|center/.test(value)) return 'pour';
    return 'wait';
  }

  function step(label, duration, target, instruction, preparation, prepareLeadOrAction, explicitAction) {
    const prepareLeadSeconds = Number.isFinite(prepareLeadOrAction) ? prepareLeadOrAction : null;
    const action = (typeof prepareLeadOrAction === 'string' ? prepareLeadOrAction : explicitAction)
      || inferStepAction(label);
    if (!STEP_ACTIONS[action]) throw new Error(`Unsupported recipe step action: ${action}`);
    return {
      label,
      action,
      duration,
      ...(Number.isFinite(target) ? { target } : {}),
      instruction,
      preparation,
      ...(prepareLeadSeconds ? { prepareLeadSeconds } : {}),
    };
  }

  function originalRecipe(config) {
    const version = Number.isInteger(config.version) && config.version > 0 ? config.version : 1;
    return {
      ...config,
      version,
      revisionId: `${config.id}@${version}`,
      publishedAt: config.publishedAt || INITIAL_RECIPE_PUBLISHED_AT,
      attribution: ORIGINAL_ATTRIBUTION,
    };
  }

  // Keep every historical revision in this append-only collection. To change
  // a recipe, add a higher version with the same id instead of editing the
  // earlier record. RECIPES below exposes only the latest revision per id.
  const RECIPE_REVISIONS = Object.freeze([
    originalRecipe({
      id: 'v60-bright', methodId: 'v60', title: 'Bright two-pour',
      summary: 'A crisp, transparent cup with a gentle bloom and two controlled pours.',
      result: 'Expect lifted acidity, a tea-like finish, and clear separation between flavor notes.',
      defaultCoffee: 15, ratio: 16.67, baseWater: 250, temperature: '94°C', grind: 'Medium-fine', difficulty: 'Precise',
      tags: { roast: ['light'], profile: ['bright', 'high-clarity'], technique: ['percolation', 'pulse'], experience: ['precise'], serving: ['single-cup'] },
      steps: [
        step('Bloom', 45, 45, 'Wet every ground, then give the brewer a gentle swirl.', 'Set the dripper on your server and level the coffee bed.'),
        step('First pour', 35, 150, 'Pour in slow circles, keeping the water level steady.', 'Lift the kettle and settle into a slow circular pour.'),
        step('Final pour', 35, 250, 'Finish with a calm center pour and one small swirl.', 'Keep the kettle close and wait for the water level to settle.'),
        step('Draw down', 65, 250, 'Let the bed drain flat. Taste once the cup cools a little.', 'Set the kettle down and let the coffee drain undisturbed.'),
      ],
    }),
    originalRecipe({
      id: 'v60-sweet-pulse', methodId: 'v60', title: 'Sweet pulse',
      summary: 'Three even pulses build sweetness while keeping the brew easy to read.',
      result: 'Expect a rounder cup with caramel-like sweetness and a soft, balanced finish.',
      defaultCoffee: 20, ratio: 16, baseWater: 320, temperature: '93°C', grind: 'Medium-fine', difficulty: 'Approachable',
      tags: { roast: ['light', 'medium'], profile: ['sweet', 'balanced'], technique: ['percolation', 'pulse'], experience: ['forgiving'], serving: ['large-cup'] },
      steps: [
        step('Bloom', 45, 60, 'Saturate the bed, then swirl until no dry pockets remain.', 'Level the bed and have the kettle ready for a generous bloom.'),
        step('First pulse', 35, 150, 'Pour in relaxed circles and let the water level fall slightly.', 'Bring the kettle back over the center.'),
        step('Second pulse', 35, 235, 'Repeat the same circle size and steady flow.', 'Keep the kettle close as the first pulse settles.'),
        step('Final pulse', 35, 320, 'Finish near the center and give the brewer one gentle swirl.', 'Prepare to finish with a lower, slower stream.'),
        step('Draw down', 60, 320, 'Let the bed drain flat before removing the brewer.', 'Set the kettle down and keep the server steady.'),
      ],
    }),
    originalRecipe({
      id: 'v60-gentle-large', methodId: 'v60', title: 'Gentle large cup',
      summary: 'A coarser, cooler recipe for an even half-liter brew without harshness.',
      result: 'Expect an easy-drinking large cup with mellow sweetness and moderate clarity.',
      defaultCoffee: 30, ratio: 16.67, baseWater: 500, temperature: '92°C', grind: 'Medium', difficulty: 'Forgiving',
      tags: { roast: ['medium'], profile: ['balanced', 'sweet'], technique: ['percolation', 'pulse'], experience: ['forgiving'], serving: ['large-cup', 'batch'] },
      steps: [
        step('Long bloom', 60, 90, 'Saturate the deeper bed and swirl firmly once.', 'Set the larger server in place and level the bed.'),
        step('Build the bed', 50, 240, 'Pour broadly enough to keep the full bed active.', 'Lift the kettle and prepare a wider circular pour.'),
        step('Middle pour', 45, 370, 'Continue at a steady flow without filling to the rim.', 'Wait for the water level to settle by about a third.'),
        step('Finish', 45, 500, 'Finish through the center, then give one gentle swirl.', 'Keep the kettle close for the final measured pour.'),
        step('Draw down', 80, 500, 'Let the large bed drain fully before serving.', 'Set the kettle down and warm both cups if sharing.'),
      ],
    }),
    originalRecipe({
      id: 'switch-hybrid', methodId: 'switch', title: 'Open-close hybrid',
      summary: 'A bright percolation start followed by a sweet immersion finish.',
      result: 'Expect lively aromatics with the rounded sweetness of a short immersion.',
      defaultCoffee: 20, ratio: 16, baseWater: 320, temperature: '93°C', grind: 'Medium', difficulty: 'Approachable',
      tags: { roast: ['light', 'medium'], profile: ['sweet', 'balanced'], technique: ['hybrid'], experience: ['forgiving'], serving: ['large-cup'] },
      steps: [
        step('Open bloom', 45, 80, 'Leave the switch open. Saturate the coffee and swirl once.', 'Confirm the switch is open and level the coffee bed.'),
        step('Open pour', 30, 160, 'Pour gently with the switch still open.', 'Keep the switch open and bring the kettle over the bed.'),
        step('Close and fill', 35, 320, 'Close the switch, add the remaining water, and stir once.', 'Reach for the switch, then have the kettle and spoon ready.', 20),
        step('Steep', 50, 320, 'Let the coffee steep without disturbing the bed.', 'Set the kettle and spoon down after the fill.'),
        step('Release', 55, 320, 'Open the switch and let the brewer drain completely.', 'Place the server securely and reach for the switch release.', 20),
      ],
    }),
    originalRecipe({
      id: 'switch-full-immersion', methodId: 'switch', title: 'Full immersion',
      summary: 'A simple closed-valve steep that favors body, sweetness, and repeatability.',
      result: 'Expect a plush, balanced cup with low sharpness and a longer finish.',
      defaultCoffee: 20, ratio: 15, baseWater: 300, temperature: '92°C', grind: 'Medium-coarse', difficulty: 'Easy',
      tags: { roast: ['medium', 'dark'], profile: ['sweet', 'full-bodied'], technique: ['immersion'], experience: ['forgiving'], serving: ['large-cup'] },
      steps: [
        step('Close and fill', 25, 300, 'Close the switch and add all the water.', 'Confirm the valve is closed and place the brewer securely.'),
        step('Add coffee', 20, 300, 'Add the grounds and stir just enough to wet them evenly.', 'Have the ground coffee and spoon within reach.', 20),
        step('Steep', 100, 300, 'Let the coffee rest with the switch closed.', 'Set the kettle and spoon down.'),
        step('Gentle stir', 15, 300, 'Give the surface one shallow stir and let the grounds settle.', 'Pick up the spoon for one controlled pass.', 20),
        step('Release', 60, 300, 'Open the switch and allow the brewer to drain.', 'Move the brewer over the server and reach for the release.', 20),
      ],
    }),
    originalRecipe({
      id: 'switch-bright-release', methodId: 'switch', title: 'Bright early release',
      summary: 'A short closed bloom and early release keep the cup crisp and aromatic.',
      result: 'Expect a lighter body, bright fruit character, and a clean paper-filtered finish.',
      defaultCoffee: 15, ratio: 16.67, baseWater: 250, temperature: '95°C', grind: 'Medium-fine', difficulty: 'Precise',
      tags: { roast: ['light'], profile: ['bright', 'high-clarity'], technique: ['hybrid', 'percolation'], experience: ['precise', 'experimental'], serving: ['single-cup'] },
      steps: [
        step('Closed bloom', 35, 60, 'Close the switch, saturate the coffee, and swirl once.', 'Confirm the valve is closed before the first pour.'),
        step('Release bloom', 20, 60, 'Open the switch and let the concentrated bloom drain.', 'Reach for the release as the bloom finishes.', 20),
        step('Main pour', 45, 190, 'Pour in controlled circles with the switch open.', 'Keep the valve open and bring the kettle low.'),
        step('Finish', 30, 250, 'Finish through the center without disturbing the filter wall.', 'Prepare a short center pour.'),
        step('Draw down', 55, 250, 'Let the bed drain flat and remove the brewer promptly.', 'Set the kettle down and watch the final drawdown.'),
      ],
    }),
    originalRecipe({
      id: 'mugen-one-pour', methodId: 'mugen', title: 'Everyday one-pour',
      summary: 'One steady pour for an easy, repeatable daily cup.',
      result: 'Expect rounded sweetness, moderate body, and very little ceremony.',
      defaultCoffee: 20, ratio: 12, baseWater: 240, temperature: '92°C', grind: 'Medium-fine', difficulty: 'Easy',
      tags: { roast: ['medium', 'dark'], profile: ['balanced', 'full-bodied'], technique: ['percolation', 'single-pour'], experience: ['quick', 'forgiving'], serving: ['single-cup'] },
      steps: [
        step('Settle the bed', 10, 0, 'Make a small well in the center of the dry coffee.', 'Level the grounds and make a small well in the center.'),
        step('Single pour', 45, 240, 'Pour continuously from the center outward, then return to the center.', 'Bring the kettle low over the center and prepare for one steady pour.'),
        step('Draw down', 65, 240, 'Let the brewer drain. Avoid swirling the steep filter walls.', 'Set the kettle down as soon as you reach the final weight.'),
      ],
    }),
    originalRecipe({
      id: 'mugen-gentle-light', methodId: 'mugen', title: 'Gentle light roast',
      summary: 'A longer, thinner one-pour opens lighter coffees without losing the Mugen simplicity.',
      result: 'Expect more aroma and clarity than the everyday recipe with a soft, sweet center.',
      defaultCoffee: 15, ratio: 15, baseWater: 225, temperature: '94°C', grind: 'Medium-fine', difficulty: 'Precise',
      tags: { roast: ['light', 'medium'], profile: ['sweet', 'high-clarity'], technique: ['percolation', 'single-pour'], experience: ['precise'], serving: ['single-cup'] },
      steps: [
        step('Prepare the bed', 15, 0, 'Level the coffee and make a shallow center well.', 'Seat the filter carefully and preheat the brewer.'),
        step('Gentle one-pour', 60, 225, 'Use a thin stream, widening slowly before returning to the center.', 'Bring the kettle close and settle into a low flow.'),
        step('Draw down', 75, 225, 'Let the bed drain without swirling.', 'Set the kettle down and leave the filter wall untouched.'),
      ],
    }),
    originalRecipe({
      id: 'mugen-bold-cup', methodId: 'mugen', title: 'Bold short-ratio cup',
      summary: 'A concentrated large cup for deeper roasts and milk-friendly intensity.',
      result: 'Expect a dense body, dark sweetness, and enough intensity to stand up to milk.',
      defaultCoffee: 25, ratio: 12, baseWater: 300, temperature: '88°C', grind: 'Medium', difficulty: 'Easy',
      tags: { roast: ['dark'], profile: ['intense', 'full-bodied'], technique: ['percolation', 'single-pour'], experience: ['quick', 'forgiving'], serving: ['large-cup'] },
      steps: [
        step('Shape the bed', 10, 0, 'Make a clear well in the center of the grounds.', 'Level the deeper bed and keep the kettle temperature modest.'),
        step('Bold one-pour', 55, 300, 'Pour steadily, avoiding the high filter wall.', 'Start low in the center and prepare a wider spiral.'),
        step('Draw down', 70, 300, 'Let the brewer finish without agitation.', 'Set the kettle down at the final weight.'),
      ],
    }),
    originalRecipe({
      id: 'clever-water-first', methodId: 'clever', title: 'Water-first classic',
      summary: 'A smooth immersion recipe with a fast, dependable drawdown.',
      result: 'Expect even extraction, mellow sweetness, and a clean but full texture.',
      defaultCoffee: 18, ratio: 16.67, baseWater: 300, temperature: '95°C', grind: 'Medium-coarse', difficulty: 'Easy',
      tags: { roast: ['medium'], profile: ['balanced', 'full-bodied'], technique: ['immersion'], experience: ['forgiving'], serving: ['large-cup'] },
      steps: [
        step('Water first', 20, 300, 'Add all the water before the coffee for a faster drawdown.', 'Set the Clever on a stable surface and have all the water ready.'),
        step('Add coffee', 20, 300, 'Add the grounds, gently stir until they are evenly wet, then cover.', 'Have the ground coffee, spoon, and lid within reach.', 20),
        step('Steep', 100, 300, 'Let the coffee steep. There is no need to keep stirring.', 'Fit the lid after the grounds are evenly wet.'),
        step('Break the crust', 15, 300, 'Give the surface one shallow stir and wait for the grounds to settle.', 'Pick up the spoon for one shallow stir.', 20),
        step('Drain', 85, 300, 'Place the brewer on your cup and let it drain.', 'Place your cup or server nearby and clear space for the brewer.', 25),
      ],
    }),
    originalRecipe({
      id: 'clever-coffee-first', methodId: 'clever', title: 'Coffee-first body',
      summary: 'A traditional immersion order that leans into texture and deeper sweetness.',
      result: 'Expect a fuller, more intense cup with cocoa-like depth and a long finish.',
      defaultCoffee: 20, ratio: 16, baseWater: 320, temperature: '92°C', grind: 'Medium-coarse', difficulty: 'Approachable',
      tags: { roast: ['medium', 'dark'], profile: ['full-bodied', 'intense'], technique: ['immersion'], experience: ['experimental'], serving: ['large-cup'] },
      steps: [
        step('Coffee first', 15, 0, 'Add the grounds to the rinsed filter and level them.', 'Seat the filter and level the dry coffee.'),
        step('Fill and stir', 35, 320, 'Add all the water and stir gently until every ground is wet.', 'Have the kettle and spoon ready for a complete fill.', 20),
        step('Steep', 115, 320, 'Cover the brewer and let the slurry rest.', 'Set the kettle and spoon down, then fit the lid.'),
        step('Settle', 15, 320, 'Give one shallow stir and wait for the surface to settle.', 'Reach for the spoon for one final pass.', 20),
        step('Drain', 85, 320, 'Place the brewer on the server and let it drain completely.', 'Clear space on the server and hold the brewer securely.', 25),
      ],
    }),
    originalRecipe({
      id: 'clever-quick-clean', methodId: 'clever', title: 'Quick clean cup',
      summary: 'A smaller dose and shorter steep for a bright weekday cup.',
      result: 'Expect a lighter body, clean sweetness, and a brisk finish.',
      defaultCoffee: 15, ratio: 16, baseWater: 240, temperature: '94°C', grind: 'Medium', difficulty: 'Easy',
      tags: { roast: ['light', 'medium'], profile: ['bright', 'balanced'], technique: ['immersion'], experience: ['quick', 'forgiving'], serving: ['single-cup'] },
      steps: [
        step('Water first', 15, 240, 'Add all the water to the closed brewer.', 'Confirm the brewer is stable and closed.'),
        step('Add and stir', 20, 240, 'Add the coffee and stir twice to wet every ground.', 'Have the coffee and spoon ready.', 20),
        step('Short steep', 60, 240, 'Let the coffee rest without further agitation.', 'Set the spoon down and fit the lid.'),
        step('Drain', 65, 240, 'Place the Clever on your cup and let it drain.', 'Bring the cup close before the short steep ends.', 20),
      ],
    }),
    originalRecipe({
      id: 'cotton-silky', methodId: 'cotton', title: 'Silky slow pulses',
      summary: 'A patient nel-style brew with slow pulses and a rich, rounded texture.',
      result: 'Expect syrupy sweetness, a velvety body, and restrained acidity.',
      defaultCoffee: 20, ratio: 12.5, baseWater: 250, temperature: '88°C', grind: 'Medium-coarse', difficulty: 'Precise',
      tags: { roast: ['medium'], profile: ['sweet', 'full-bodied'], technique: ['percolation', 'pulse'], experience: ['precise'], serving: ['single-cup'] },
      steps: [
        step('Slow bloom', 60, 50, 'Drip slowly across the surface until the bed is evenly saturated.', 'Shape the cotton filter, level the bed, and bring the kettle close.'),
        step('First pulse', 60, 125, 'Keep a low, thin stream near the center of the bed.', 'Hold the kettle low and prepare a thin centered stream.'),
        step('Second pulse', 60, 200, 'Continue patiently, avoiding the edge of the cotton.', 'Keep the kettle close without disturbing the cotton edge.'),
        step('Finish', 90, 250, 'Reach the final weight, then let the last drops fall before serving.', 'Steady the server and prepare to stop exactly at the final weight.'),
      ],
    }),
    originalRecipe({
      id: 'cotton-delicate-light', methodId: 'cotton', title: 'Delicate light roast',
      summary: 'A lighter ratio and small pulses preserve perfume and clarity through cloth.',
      result: 'Expect floral aroma, soft sweetness, and unusually clear flavor for a cotton brew.',
      defaultCoffee: 15, ratio: 14, baseWater: 210, temperature: '90°C', grind: 'Medium', difficulty: 'Precise',
      tags: { roast: ['light'], profile: ['sweet', 'high-clarity'], technique: ['percolation', 'pulse'], experience: ['precise', 'experimental'], serving: ['single-cup'] },
      steps: [
        step('Gentle bloom', 50, 40, 'Wet the center first, then slowly reach the edge of the bed.', 'Shape the cloth carefully and level the smaller dose.'),
        step('First pulse', 45, 95, 'Use a very thin stream near the center.', 'Bring the kettle low and keep your hand relaxed.'),
        step('Second pulse', 45, 155, 'Continue slowly without pouring directly on the cotton.', 'Wait for the surface to settle before continuing.'),
        step('Final pulse', 50, 210, 'Finish with a centered stream and no agitation.', 'Prepare to stop cleanly at the final weight.'),
        step('Last drops', 45, 210, 'Let the final drops fall, then serve promptly.', 'Set the kettle down and keep the filter steady.'),
      ],
    }),
    originalRecipe({
      id: 'cotton-slow-concentrate', methodId: 'cotton', title: 'Slow concentrate',
      summary: 'A short ratio and low temperature make a dense, dessert-like cotton brew.',
      result: 'Expect deep sweetness, heavy body, and an intense cup suited to darker coffee.',
      defaultCoffee: 25, ratio: 12, baseWater: 300, temperature: '85°C', grind: 'Medium-coarse', difficulty: 'Experimental',
      tags: { roast: ['medium', 'dark'], profile: ['intense', 'full-bodied'], technique: ['percolation', 'pulse'], experience: ['experimental'], serving: ['large-cup'] },
      steps: [
        step('Deep bloom', 70, 60, 'Saturate the deeper bed one slow drop at a time.', 'Shape the filter firmly and keep the water temperature low.'),
        step('Center pulse', 70, 140, 'Keep a narrow stream over the center of the bed.', 'Hold the kettle low and avoid the cloth wall.'),
        step('Build body', 70, 230, 'Widen the pour slightly while keeping the flow slow.', 'Wait until the coffee surface settles.'),
        step('Concentrated finish', 80, 300, 'Finish at the center and allow the last drops to fall.', 'Steady the server and stop exactly at the final weight.'),
      ],
    }),
    originalRecipe({
      id: 'kalita-flat-balance', methodId: 'kalita', title: 'Flat-bed balance',
      summary: 'Three calm additions use the Wave bed to balance sweetness, clarity, and body.',
      result: 'Expect an even, rounded cup with clear flavor and a soft caramel finish.',
      defaultCoffee: 20, ratio: 16, baseWater: 320, temperature: '93°C', grind: 'Medium', difficulty: 'Approachable',
      tags: { roast: ['light', 'medium'], profile: ['balanced', 'sweet'], technique: ['percolation', 'pulse'], experience: ['forgiving'], serving: ['large-cup'] },
      steps: [
        step('Bloom', 40, 60, 'Wet the flat bed evenly, then give the brewer one small swirl.', 'Seat the Wave filter without flattening its ridges and level the coffee.'),
        step('First pulse', 35, 170, 'Pour in small circles that stay inside the coffee bed.', 'Bring the kettle low over the center as the bloom settles.'),
        step('Final pulse', 40, 320, 'Finish with a steady center-weighted pour.', 'Wait for the slurry to fall by about a third before the final pour.'),
        step('Draw down', 55, null, 'Let the bed drain flat, then remove the brewer.', 'Set the kettle down and leave the Wave undisturbed.', 'drain'),
      ],
    }),
    originalRecipe({
      id: 'kalita-sweet-four-pulse', methodId: 'kalita', title: 'Sweet four-pulse',
      summary: 'Four equal pulses keep the flat bed active and build layered sweetness.',
      result: 'Expect a juicy, sweet cup with a little more texture than the balanced recipe.',
      defaultCoffee: 18, ratio: 16.67, baseWater: 300, temperature: '94°C', grind: 'Medium-fine', difficulty: 'Precise',
      tags: { roast: ['light'], profile: ['sweet', 'bright'], technique: ['percolation', 'pulse'], experience: ['precise'], serving: ['single-cup', 'large-cup'] },
      steps: [
        step('Bloom', 45, 55, 'Saturate the whole flat bed and swirl gently once.', 'Level the grounds and bring the kettle close.'),
        step('First pulse', 30, 135, 'Pour evenly over the center two-thirds of the bed.', 'Wait until the bloom surface loses its shine.'),
        step('Second pulse', 30, 215, 'Repeat the same low circular path and flow.', 'Keep the kettle ready as the first pulse falls.'),
        step('Final pulse', 35, 300, 'Finish through the center and avoid the filter wall.', 'Let the slurry settle before the last measured pour.'),
        step('Draw down', 55, null, 'Let the final water pass through without another swirl.', 'Set the kettle down and keep the server steady.', 'drain'),
      ],
    }),
    originalRecipe({
      id: 'kalita-gentle-batch', methodId: 'kalita', title: 'Gentle shared cup',
      summary: 'A coarser four-stage recipe keeps a deeper Wave bed even for two cups.',
      result: 'Expect mellow sweetness, moderate clarity, and enough body for a shared brew.',
      defaultCoffee: 30, ratio: 16.67, baseWater: 500, temperature: '92°C', grind: 'Medium-coarse', difficulty: 'Forgiving',
      tags: { roast: ['medium'], profile: ['balanced', 'full-bodied'], technique: ['percolation', 'pulse'], experience: ['forgiving'], serving: ['batch'] },
      steps: [
        step('Long bloom', 55, 90, 'Wet the deeper bed completely and swirl once.', 'Warm the larger server and level the coffee carefully.'),
        step('Build the bed', 45, 230, 'Pour broadly but keep the stream away from the paper.', 'Bring the kettle low for the first larger addition.'),
        step('Middle pour', 45, 365, 'Maintain an even water level across the flat bed.', 'Wait for the slurry to drop halfway.'),
        step('Finish', 45, 500, 'Finish at the center with a slightly slower stream.', 'Prepare the final measured addition.'),
        step('Draw down', 70, null, 'Let the deeper bed drain fully before serving.', 'Warm both cups while the last water drains.', 'drain'),
      ],
    }),
    originalRecipe({
      id: 'chemex-clean-two-stage', methodId: 'chemex', title: 'Clean two-stage',
      summary: 'Two broad pours and the bonded filter produce a polished, transparent shared cup.',
      result: 'Expect very high clarity, gentle sweetness, and a light, tea-like body.',
      defaultCoffee: 30, ratio: 16.67, baseWater: 500, temperature: '94°C', grind: 'Medium-coarse', difficulty: 'Approachable',
      tags: { roast: ['light', 'medium'], profile: ['high-clarity', 'balanced'], technique: ['percolation', 'pulse'], experience: ['forgiving'], serving: ['batch'] },
      steps: [
        step('Bloom', 50, 90, 'Wet the entire bed, then gently swirl the Chemex.', 'Place the thick filter with its three-layer side over the spout.'),
        step('First pour', 55, 300, 'Use broad circles while keeping water off the filter wall.', 'Lift the kettle as the bloom settles and keep the stream controlled.'),
        step('Final pour', 55, 500, 'Finish in slower circles, ending at the center.', 'Let the water level fall by half before continuing.'),
        step('Draw down', 80, null, 'Let the thick filter finish draining, then discard it.', 'Set the kettle down and gently move the Chemex away from drafts.', 'drain'),
      ],
    }),
    originalRecipe({
      id: 'chemex-bright-pulse', methodId: 'chemex', title: 'Bright three-pulse',
      summary: 'Three smaller additions keep a lighter coffee aromatic through the thick filter.',
      result: 'Expect citrus-like brightness, distinct flavors, and an exceptionally clean finish.',
      defaultCoffee: 24, ratio: 16.67, baseWater: 400, temperature: '95°C', grind: 'Medium', difficulty: 'Precise',
      tags: { roast: ['light'], profile: ['bright', 'high-clarity'], technique: ['percolation', 'pulse'], experience: ['precise'], serving: ['large-cup'] },
      steps: [
        step('Bloom', 50, 75, 'Saturate the bed and swirl until no dry pockets remain.', 'Rinse the bonded filter thoroughly and level the coffee.'),
        step('First pulse', 40, 185, 'Pour in deliberate circles across the coffee bed.', 'Bring the kettle close as the bloom opens.'),
        step('Second pulse', 40, 295, 'Repeat the same path without touching the paper.', 'Wait for the slurry to fall by one-third.'),
        step('Final pulse', 40, 400, 'Finish at the center with a lower stream.', 'Prepare a slightly slower final addition.'),
        step('Draw down', 75, null, 'Let the filter drain without swirling again.', 'Set the kettle down and leave the bed undisturbed.', 'drain'),
      ],
    }),
    originalRecipe({
      id: 'chemex-shared-table', methodId: 'chemex', title: 'Shared table',
      summary: 'A patient staged batch keeps a large Chemex brew sweet and even for several cups.',
      result: 'Expect a generous, balanced batch with cocoa sweetness and clean structure.',
      defaultCoffee: 42, ratio: 16.67, baseWater: 700, temperature: '93°C', grind: 'Coarse', difficulty: 'Precise',
      tags: { roast: ['medium'], profile: ['balanced', 'sweet'], technique: ['percolation', 'pulse'], experience: ['precise'], serving: ['batch'] },
      steps: [
        step('Long bloom', 60, 125, 'Wet the deep bed completely and swirl the vessel once.', 'Preheat the Chemex and make sure the filter does not seal the spout.'),
        step('Build the bed', 60, 320, 'Pour broadly to lift the full bed without flooding it.', 'Use both hands to steady the larger brew.'),
        step('Middle pour', 55, 510, 'Keep the slurry height steady with a controlled spiral.', 'Wait for the water level to fall by one-third.'),
        step('Finish', 55, 700, 'Finish slowly through the center.', 'Prepare the final pour and warm the serving cups.'),
        step('Draw down', 100, null, 'Let the thick filter drain fully, then swirl the brewed coffee.', 'Set the kettle down and keep the spout vent clear.', 'drain'),
      ],
    }),
    originalRecipe({
      id: 'aeropress-standard', methodId: 'aeropress', title: 'Classic standard press',
      summary: 'A straightforward upright steep and press for a balanced everyday cup.',
      result: 'Expect rounded sweetness, a clean finish, and more body than a drip brew.',
      defaultCoffee: 15, ratio: 16, baseWater: 240, temperature: '90°C', grind: 'Medium-fine', difficulty: 'Easy',
      tags: { roast: ['medium'], profile: ['balanced', 'sweet'], technique: ['immersion', 'pressure-assisted'], experience: ['quick', 'forgiving'], serving: ['single-cup'] },
      steps: [
        step('Heat and rinse', 10, null, 'Rinse the filter and warm the chamber and mug.', 'Set the AeroPress upright on a sturdy mug.', 'heat'),
        step('Fill', 20, 240, 'Add all the water, making sure every ground is wet.', 'Have the kettle ready over the open chamber.', 'pour'),
        step('Stir', 10, null, 'Stir front to back five times, then insert the plunger slightly.', 'Pick up the paddle before the fill ends.', 'stir'),
        step('Steep', 60, null, 'Let the coffee steep with the plunger creating a gentle seal.', 'Set the paddle down and keep the mug stable.', 'steep'),
        step('Press', 30, null, 'Press slowly and evenly, stopping at the first hiss.', 'Place both hands securely and keep your weight centered.', 20, 'press'),
      ],
    }),
    originalRecipe({
      id: 'aeropress-inverted', methodId: 'aeropress', title: 'Inverted sweet cup',
      summary: 'An inverted steep gives full immersion before a careful flip and press.',
      result: 'Expect a syrupier, sweeter cup with a long finish and minimal early drip-through.',
      defaultCoffee: 18, ratio: 12.22, baseWater: 220, temperature: '88°C', grind: 'Medium', difficulty: 'Experimental',
      tags: { roast: ['medium', 'dark'], profile: ['sweet', 'full-bodied'], technique: ['immersion', 'pressure-assisted'], experience: ['experimental'], serving: ['single-cup'] },
      steps: [
        step('Assemble inverted', 10, null, 'Insert the plunger just past the seal and stand the chamber upside down.', 'Use a stable, dry surface and keep the filter cap nearby.', 'prepare'),
        step('Fill', 25, 220, 'Add all the water to the inverted chamber.', 'Bring the kettle close and keep one hand on the chamber.', 'pour'),
        step('Stir', 10, null, 'Stir gently five times and attach the rinsed filter cap.', 'Have the paddle and prepared cap within reach.', 'stir'),
        step('Steep', 65, null, 'Let the coffee rest without further agitation.', 'Set the paddle down and keep the chamber stable.', 'steep'),
        step('Flip', 10, null, 'Hold chamber and plunger together, flip onto the mug, and settle it squarely.', 'Grip both parts firmly and position the mug close.', 20, 'flip'),
        step('Press', 30, null, 'Press with steady pressure and stop at the hiss.', 'Center both hands over the plunger.', 20, 'press'),
      ],
    }),
    originalRecipe({
      id: 'aeropress-fast-bright', methodId: 'aeropress', title: 'Fast bright press',
      summary: 'A hot, short steep and gentle press keep a lighter coffee lively and clear.',
      result: 'Expect bright fruit, a lighter body, and a crisp finish in under two minutes.',
      defaultCoffee: 14, ratio: 15.71, baseWater: 220, temperature: '94°C', grind: 'Fine', difficulty: 'Precise',
      tags: { roast: ['light'], profile: ['bright', 'high-clarity'], technique: ['immersion', 'pressure-assisted'], experience: ['quick', 'precise'], serving: ['single-cup'] },
      steps: [
        step('Bloom', 20, 50, 'Add the first water and stir once to release trapped gas.', 'Set the AeroPress upright on a sturdy mug.'),
        step('Fill', 20, 220, 'Add the remaining water quickly and evenly.', 'Keep the kettle close for an immediate fill.', 'pour'),
        step('Swirl', 8, null, 'Insert the plunger slightly and swirl the chamber once.', 'Set the kettle down and grip the chamber.', 'swirl'),
        step('Short steep', 35, null, 'Let the coffee rest under the plunger seal.', 'Keep the mug steady and prepare to press.', 'steep'),
        step('Press', 25, null, 'Press gently and stop as soon as air reaches the filter.', 'Place both hands over the plunger for an even finish.', 15, 'press'),
      ],
    }),
  ]);

  const RECIPES = Object.freeze(Array.from(RECIPE_REVISIONS.reduce((latest, recipe) => {
    const current = latest.get(recipe.id);
    if (!current || recipe.version > current.version) latest.set(recipe.id, recipe);
    return latest;
  }, new Map()).values()));

  function getMethod(id) {
    return METHODS.find((method) => method.id === id) || METHODS[0];
  }

  function getRecipesForMethod(methodId) {
    return RECIPES.filter((recipe) => recipe.methodId === methodId);
  }

  function resolveRecipeId(id) {
    const direct = RECIPES.find((recipe) => recipe.id === id);
    if (direct) return direct.id;
    const legacyMethod = METHODS.find((method) => method.id === id);
    return legacyMethod ? legacyMethod.defaultRecipeId : METHODS[0].defaultRecipeId;
  }

  function getRecipe(id) {
    const resolvedId = resolveRecipeId(id);
    return RECIPES.find((recipe) => recipe.id === resolvedId) || RECIPES[0];
  }

  function getRecipeRevision(idOrRevisionId, versionValue) {
    const raw = String(idOrRevisionId || '');
    const match = raw.match(/^(.+)@(\d+)$/);
    const requestedVersion = match ? Number(match[2]) : Number(versionValue);
    if (!Number.isInteger(requestedVersion) || requestedVersion <= 0) return getRecipe(raw);
    const requestedId = match ? match[1] : raw;
    return RECIPE_REVISIONS.find((recipe) => (
      recipe.id === requestedId && recipe.version === requestedVersion
    )) || null;
  }

  function isCurrentRecipeRevision(recipeOrSnapshot) {
    if (!recipeOrSnapshot) return false;
    const current = RECIPES.find((recipe) => recipe.id === recipeOrSnapshot.id);
    return !!current && current.version === recipeOrSnapshot.version;
  }

  function getTagLabel(facet, value) {
    const definition = TAG_TAXONOMY[facet];
    return definition?.values.find((entry) => entry.value === value)?.label || value;
  }

  function normalizeFilters(filters = {}) {
    const normalized = {};
    if (METHODS.some((method) => method.id === filters.method)) normalized.method = filters.method;
    for (const facet of TAG_KEYS) {
      const value = filters[facet];
      if (TAG_TAXONOMY[facet].values.some((entry) => entry.value === value)) normalized[facet] = value;
    }
    return normalized;
  }

  function filterRecipes(filters = {}, recipes = RECIPES) {
    const normalized = normalizeFilters(filters);
    return recipes.filter((recipe) => {
      if (normalized.method && recipe.methodId !== normalized.method) return false;
      return TAG_KEYS.every((facet) => !normalized[facet] || recipe.tags[facet].includes(normalized[facet]));
    });
  }

  function clampCoffee(value) {
    const number = Number(value);
    const rounded = Number.isFinite(number) ? Math.round(number) : MIN_COFFEE_GRAMS;
    return Math.min(MAX_COFFEE_GRAMS, Math.max(MIN_COFFEE_GRAMS, rounded));
  }

  function scaleRecipe(recipeOrId, coffeeValue) {
    const recipe = typeof recipeOrId === 'string'
      ? (getRecipeRevision(recipeOrId) || getRecipe(recipeOrId))
      : recipeOrId;
    const coffee = clampCoffee(coffeeValue);
    const water = Math.round(coffee * recipe.ratio);
    const numericTargetIndexes = recipe.steps
      .map((recipeStep, index) => (Number.isFinite(recipeStep.target) ? index : -1))
      .filter((index) => index >= 0);
    const finalTargetIndex = numericTargetIndexes.at(-1);
    let previousTarget = 0;
    const steps = recipe.steps.map((recipeStep, index) => {
      if (!Number.isFinite(recipeStep.target)) return { ...recipeStep };
      const proportional = Math.round(water * (recipeStep.target / recipe.baseWater));
      const target = index === finalTargetIndex
        ? water
        : Math.max(previousTarget, Math.min(water, proportional));
      previousTarget = target;
      return { ...recipeStep, target };
    });
    return { ...recipe, coffee, water, steps, totalDuration: steps.reduce((sum, recipeStep) => sum + recipeStep.duration, 0) };
  }

  function deepFreeze(value) {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
    Object.values(value).forEach(deepFreeze);
    return Object.freeze(value);
  }

  RECIPE_REVISIONS.forEach(deepFreeze);

  function createRecipeSnapshot(recipeOrId, coffeeValue) {
    const recipe = typeof recipeOrId === 'string'
      ? (getRecipeRevision(recipeOrId) || getRecipe(recipeOrId))
      : recipeOrId;
    const scaled = scaleRecipe(recipe, coffeeValue);
    const method = getMethod(recipe.methodId);
    return deepFreeze({
      schemaVersion: 1,
      id: recipe.id,
      version: recipe.version,
      revisionId: recipe.revisionId,
      publishedAt: recipe.publishedAt,
      methodId: method.id,
      methodName: method.name,
      title: recipe.title,
      summary: recipe.summary,
      result: recipe.result,
      attribution: { ...recipe.attribution },
      coffee: scaled.coffee,
      water: scaled.water,
      ratio: recipe.ratio,
      temperature: recipe.temperature,
      grind: recipe.grind,
      difficulty: recipe.difficulty,
      equipment: method.equipment,
      tags: Object.fromEntries(TAG_KEYS.map((facet) => [facet, [...recipe.tags[facet]]])),
      totalDuration: scaled.totalDuration,
      steps: scaled.steps.map((recipeStep) => ({ ...recipeStep })),
    });
  }

  function getPreparationLead(recipeStep) {
    const requested = Number(recipeStep?.prepareLeadSeconds);
    if (!Number.isFinite(requested) || requested <= 0) return DEFAULT_PREPARATION_LEAD_SECONDS;
    return Math.max(IMMINENT_PREPARATION_SECONDS, Math.round(requested));
  }

  function getRecipeTimeline(recipeOrId) {
    const recipe = typeof recipeOrId === 'string'
      ? (getRecipeRevision(recipeOrId) || getRecipe(recipeOrId))
      : recipeOrId;
    let startsAt = 0;
    let previousTarget = 0;
    const steps = recipe.steps.map((recipeStep, index) => {
      const duration = Math.max(0, Number(recipeStep.duration) || 0);
      const hasTarget = Number.isFinite(recipeStep.target);
      const target = hasTarget ? Math.max(0, recipeStep.target) : null;
      const targetDelta = hasTarget ? Math.max(0, target - previousTarget) : 0;
      const timelineStep = {
        ...recipeStep,
        index,
        duration,
        target,
        previousTarget,
        targetDelta,
        targetKind: !hasTarget ? 'none' : targetDelta > 0 ? 'action' : target > 0 ? 'context' : 'none',
        startsAt,
        endsAt: startsAt + duration,
      };
      startsAt = timelineStep.endsAt;
      if (hasTarget) previousTarget = target;
      return timelineStep;
    });
    return { steps, totalDuration: startsAt };
  }

  function getStepStart(recipeOrId, index) {
    const timeline = getRecipeTimeline(recipeOrId);
    const safeIndex = Math.max(0, Math.min(timeline.steps.length, Number(index) || 0));
    return safeIndex === timeline.steps.length
      ? timeline.totalDuration
      : timeline.steps[safeIndex].startsAt;
  }

  function getBrewTiming(recipeOrId, elapsedValue) {
    const timeline = getRecipeTimeline(recipeOrId);
    const { totalDuration } = timeline;
    const numericElapsed = Number(elapsedValue);
    const elapsed = Math.max(0, Math.min(totalDuration, Number.isFinite(numericElapsed) ? numericElapsed : 0));
    let stepIndex = timeline.steps.length - 1;
    for (let index = 0; index < timeline.steps.length; index += 1) {
      if (elapsed < timeline.steps[index].endsAt) {
        stepIndex = index;
        break;
      }
    }
    const currentStep = timeline.steps[stepIndex];
    const nextStepIndex = stepIndex < timeline.steps.length - 1 ? stepIndex + 1 : null;
    const nextStep = nextStepIndex === null ? null : timeline.steps[nextStepIndex];
    const stepStartsAt = currentStep.startsAt;
    const nextStartsAt = nextStep?.startsAt ?? null;
    const secondsUntilNext = nextStartsAt === null ? null : Math.max(0, nextStartsAt - elapsed);
    const preparationLeadSeconds = nextStep === null ? null : getPreparationLead(nextStep);
    return {
      elapsed, totalDuration, stepIndex, stepStartsAt, currentStep,
      nextStepIndex, nextStartsAt, nextStep, secondsUntilNext, preparationLeadSeconds,
      isPreparing: secondsUntilNext !== null && secondsUntilNext <= preparationLeadSeconds,
      isImminent: secondsUntilNext !== null && secondsUntilNext <= IMMINENT_PREPARATION_SECONDS,
      isFinalStep: nextStepIndex === null,
    };
  }

  function formatDuration(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainder = Math.round(seconds % 60);
    return `${minutes}:${String(remainder).padStart(2, '0')}`;
  }

  return {
    DEFAULT_PREPARATION_LEAD_SECONDS, FILTER_KEYS, IMMINENT_PREPARATION_SECONDS,
    MAX_COFFEE_GRAMS, METHODS, MIN_COFFEE_GRAMS, RECIPES, RECIPE_REVISIONS,
    STEP_ACTIONS, TAG_KEYS, TAG_TAXONOMY,
    clampCoffee, createRecipeSnapshot, filterRecipes, formatDuration, getBrewTiming,
    getMethod, getPreparationLead, getRecipe, getRecipeRevision, getRecipesForMethod,
    getRecipeTimeline, getStepStart, getTagLabel, isCurrentRecipeRevision, normalizeFilters,
    resolveRecipeId, scaleRecipe,
  };
});
