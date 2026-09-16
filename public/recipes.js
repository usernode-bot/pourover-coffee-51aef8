(function exposeRecipes(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PouroverRecipes = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createRecipes() {
  const MIN_COFFEE_GRAMS = 5;
  const MAX_COFFEE_GRAMS = 60;

  const RECIPES = Object.freeze([
    {
      id: 'v60',
      name: 'V60',
      number: '01',
      character: 'Bright and articulate',
      description: 'A clean cup with a gentle bloom and two controlled pours.',
      defaultCoffee: 15,
      ratio: 16.67,
      baseWater: 250,
      temperature: '94°C',
      grind: 'Medium-fine',
      equipment: 'V60 02, paper filter, gooseneck kettle',
      accent: '#b95332',
      soft: '#f2d6c8',
      steps: [
        {
          label: 'Bloom',
          duration: 45,
          target: 45,
          instruction: 'Wet every ground, then give the brewer a gentle swirl.',
        },
        {
          label: 'First pour',
          duration: 35,
          target: 150,
          instruction: 'Pour in slow circles, keeping the water level steady.',
        },
        {
          label: 'Final pour',
          duration: 35,
          target: 250,
          instruction: 'Finish with a calm center pour and one small swirl.',
        },
        {
          label: 'Draw down',
          duration: 65,
          target: 250,
          instruction: 'Let the bed drain flat. Taste once the cup cools a little.',
        },
      ],
    },
    {
      id: 'switch',
      name: 'Hario Switch',
      number: '02',
      character: 'Sweet and balanced',
      description: 'A hybrid recipe that combines a bright percolation start with a full immersion finish.',
      defaultCoffee: 20,
      ratio: 16,
      baseWater: 320,
      temperature: '93°C',
      grind: 'Medium',
      equipment: 'Switch 03, paper filter, gooseneck kettle',
      accent: '#54705a',
      soft: '#d7e2d5',
      steps: [
        {
          label: 'Open bloom',
          duration: 45,
          target: 80,
          instruction: 'Leave the switch open. Saturate the coffee and swirl once.',
        },
        {
          label: 'Open pour',
          duration: 30,
          target: 160,
          instruction: 'Pour gently with the switch still open.',
        },
        {
          label: 'Close and fill',
          duration: 35,
          target: 320,
          instruction: 'Close the switch, add the remaining water, and stir once.',
        },
        {
          label: 'Steep',
          duration: 50,
          target: 320,
          instruction: 'Let the coffee steep without disturbing the bed.',
        },
        {
          label: 'Release',
          duration: 55,
          target: 320,
          instruction: 'Open the switch and let the brewer drain completely.',
        },
      ],
    },
    {
      id: 'mugen',
      name: 'Mugen',
      number: '03',
      character: 'Round and effortless',
      description: 'One steady pour, designed for an easy and repeatable daily cup.',
      defaultCoffee: 20,
      ratio: 12,
      baseWater: 240,
      temperature: '92°C',
      grind: 'Medium-fine',
      equipment: 'Mugen dripper, paper filter, kettle',
      accent: '#8b5d3d',
      soft: '#ead9c9',
      steps: [
        {
          label: 'Settle the bed',
          duration: 10,
          target: 0,
          instruction: 'Make a small well in the center of the dry coffee.',
        },
        {
          label: 'Single pour',
          duration: 45,
          target: 240,
          instruction: 'Pour continuously from the center outward, then return to the center.',
        },
        {
          label: 'Draw down',
          duration: 65,
          target: 240,
          instruction: 'Let the brewer drain. Avoid swirling the steep filter walls.',
        },
      ],
    },
    {
      id: 'clever',
      name: 'Clever Dripper',
      number: '04',
      character: 'Full and forgiving',
      description: 'A water-first immersion recipe with a smooth, dependable drawdown.',
      defaultCoffee: 18,
      ratio: 16.67,
      baseWater: 300,
      temperature: '95°C',
      grind: 'Medium-coarse',
      equipment: 'Clever Dripper, paper filter, spoon',
      accent: '#3f6570',
      soft: '#d5e4e5',
      steps: [
        {
          label: 'Water first',
          duration: 20,
          target: 300,
          instruction: 'Add all the water before the coffee for a faster drawdown.',
        },
        {
          label: 'Add coffee',
          duration: 20,
          target: 300,
          instruction: 'Add the grounds, gently stir until they are evenly wet, then cover.',
        },
        {
          label: 'Steep',
          duration: 100,
          target: 300,
          instruction: 'Let the coffee steep. There is no need to keep stirring.',
        },
        {
          label: 'Break the crust',
          duration: 15,
          target: 300,
          instruction: 'Give the surface one shallow stir and wait for the grounds to settle.',
        },
        {
          label: 'Drain',
          duration: 85,
          target: 300,
          instruction: 'Place the brewer on your cup and let it drain.',
        },
      ],
    },
    {
      id: 'cotton',
      name: 'Cotton Filter',
      number: '05',
      character: 'Silky and concentrated',
      description: 'A patient nel-style brew with slow pulses and a rich, rounded texture.',
      defaultCoffee: 20,
      ratio: 12.5,
      baseWater: 250,
      temperature: '88°C',
      grind: 'Medium-coarse',
      equipment: 'Cotton filter, nel frame, gooseneck kettle',
      accent: '#96743f',
      soft: '#ede2c5',
      steps: [
        {
          label: 'Slow bloom',
          duration: 60,
          target: 50,
          instruction: 'Drip slowly across the surface until the bed is evenly saturated.',
        },
        {
          label: 'First pulse',
          duration: 60,
          target: 125,
          instruction: 'Keep a low, thin stream near the center of the bed.',
        },
        {
          label: 'Second pulse',
          duration: 60,
          target: 200,
          instruction: 'Continue patiently, avoiding the edge of the cotton.',
        },
        {
          label: 'Finish',
          duration: 90,
          target: 250,
          instruction: 'Reach the final weight, then let the last drops fall before serving.',
        },
      ],
    },
  ]);

  function getRecipe(id) {
    return RECIPES.find((recipe) => recipe.id === id) || RECIPES[0];
  }

  function clampCoffee(value) {
    const number = Number(value);
    const rounded = Number.isFinite(number) ? Math.round(number) : MIN_COFFEE_GRAMS;
    return Math.min(MAX_COFFEE_GRAMS, Math.max(MIN_COFFEE_GRAMS, rounded));
  }

  function scaleRecipe(recipeOrId, coffeeValue) {
    const recipe = typeof recipeOrId === 'string' ? getRecipe(recipeOrId) : recipeOrId;
    const coffee = clampCoffee(coffeeValue);
    const water = Math.round(coffee * recipe.ratio);
    let previousTarget = 0;
    const steps = recipe.steps.map((step, index) => {
      const proportional = Math.round(water * (step.target / recipe.baseWater));
      const target = index === recipe.steps.length - 1
        ? water
        : Math.max(previousTarget, Math.min(water, proportional));
      previousTarget = target;
      return { ...step, target };
    });
    return {
      ...recipe,
      coffee,
      water,
      steps,
      totalDuration: steps.reduce((sum, step) => sum + step.duration, 0),
    };
  }

  function formatDuration(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainder = Math.round(seconds % 60);
    return `${minutes}:${String(remainder).padStart(2, '0')}`;
  }

  return {
    MAX_COFFEE_GRAMS,
    MIN_COFFEE_GRAMS,
    RECIPES,
    clampCoffee,
    formatDuration,
    getRecipe,
    scaleRecipe,
  };
});
