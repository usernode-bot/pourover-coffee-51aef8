(function exposeRecipes(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PouroverRecipes = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createRecipes() {
  const MIN_COFFEE_GRAMS = 5;
  const MAX_COFFEE_GRAMS = 60;
  const DEFAULT_PREPARATION_LEAD_SECONDS = 15;
  const IMMINENT_PREPARATION_SECONDS = 10;

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
          preparation: 'Set the dripper on your server and level the coffee bed.',
        },
        {
          label: 'First pour',
          duration: 35,
          target: 150,
          instruction: 'Pour in slow circles, keeping the water level steady.',
          preparation: 'Lift the kettle and settle into a slow circular pour.',
        },
        {
          label: 'Final pour',
          duration: 35,
          target: 250,
          instruction: 'Finish with a calm center pour and one small swirl.',
          preparation: 'Keep the kettle close and wait for the water level to settle.',
        },
        {
          label: 'Draw down',
          duration: 65,
          target: 250,
          instruction: 'Let the bed drain flat. Taste once the cup cools a little.',
          preparation: 'Set the kettle down and let the coffee drain undisturbed.',
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
          preparation: 'Confirm the switch is open and level the coffee bed.',
        },
        {
          label: 'Open pour',
          duration: 30,
          target: 160,
          instruction: 'Pour gently with the switch still open.',
          preparation: 'Keep the switch open and bring the kettle over the bed.',
        },
        {
          label: 'Close and fill',
          duration: 35,
          target: 320,
          instruction: 'Close the switch, add the remaining water, and stir once.',
          preparation: 'Reach for the switch, then have the kettle and spoon ready.',
          prepareLeadSeconds: 20,
        },
        {
          label: 'Steep',
          duration: 50,
          target: 320,
          instruction: 'Let the coffee steep without disturbing the bed.',
          preparation: 'Set the kettle and spoon down after the fill.',
        },
        {
          label: 'Release',
          duration: 55,
          target: 320,
          instruction: 'Open the switch and let the brewer drain completely.',
          preparation: 'Place the server securely and reach for the switch release.',
          prepareLeadSeconds: 20,
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
          preparation: 'Level the grounds and make a small well in the center.',
        },
        {
          label: 'Single pour',
          duration: 45,
          target: 240,
          instruction: 'Pour continuously from the center outward, then return to the center.',
          preparation: 'Bring the kettle low over the center and prepare for one steady pour.',
        },
        {
          label: 'Draw down',
          duration: 65,
          target: 240,
          instruction: 'Let the brewer drain. Avoid swirling the steep filter walls.',
          preparation: 'Set the kettle down as soon as you reach the final weight.',
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
          preparation: 'Set the Clever on a stable surface and have all the water ready.',
        },
        {
          label: 'Add coffee',
          duration: 20,
          target: 300,
          instruction: 'Add the grounds, gently stir until they are evenly wet, then cover.',
          preparation: 'Have the ground coffee, spoon, and lid within reach.',
          prepareLeadSeconds: 20,
        },
        {
          label: 'Steep',
          duration: 100,
          target: 300,
          instruction: 'Let the coffee steep. There is no need to keep stirring.',
          preparation: 'Fit the lid after the grounds are evenly wet.',
        },
        {
          label: 'Break the crust',
          duration: 15,
          target: 300,
          instruction: 'Give the surface one shallow stir and wait for the grounds to settle.',
          preparation: 'Pick up the spoon for one shallow stir.',
          prepareLeadSeconds: 20,
        },
        {
          label: 'Drain',
          duration: 85,
          target: 300,
          instruction: 'Place the brewer on your cup and let it drain.',
          preparation: 'Place your cup or server nearby and clear space for the brewer.',
          prepareLeadSeconds: 25,
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
          preparation: 'Shape the cotton filter, level the bed, and bring the kettle close.',
        },
        {
          label: 'First pulse',
          duration: 60,
          target: 125,
          instruction: 'Keep a low, thin stream near the center of the bed.',
          preparation: 'Hold the kettle low and prepare a thin centered stream.',
        },
        {
          label: 'Second pulse',
          duration: 60,
          target: 200,
          instruction: 'Continue patiently, avoiding the edge of the cotton.',
          preparation: 'Keep the kettle close without disturbing the cotton edge.',
        },
        {
          label: 'Finish',
          duration: 90,
          target: 250,
          instruction: 'Reach the final weight, then let the last drops fall before serving.',
          preparation: 'Steady the server and prepare to stop exactly at the final weight.',
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

  function getPreparationLead(step) {
    const requested = Number(step?.prepareLeadSeconds);
    if (!Number.isFinite(requested) || requested <= 0) {
      return DEFAULT_PREPARATION_LEAD_SECONDS;
    }
    return Math.max(IMMINENT_PREPARATION_SECONDS, Math.round(requested));
  }

  function getStepStart(recipeOrId, index) {
    const recipe = typeof recipeOrId === 'string' ? getRecipe(recipeOrId) : recipeOrId;
    const safeIndex = Math.max(0, Math.min(recipe.steps.length, Number(index) || 0));
    return recipe.steps
      .slice(0, safeIndex)
      .reduce((sum, step) => sum + step.duration, 0);
  }

  function getBrewTiming(recipeOrId, elapsedValue) {
    const recipe = typeof recipeOrId === 'string' ? getRecipe(recipeOrId) : recipeOrId;
    const totalDuration = recipe.totalDuration
      || recipe.steps.reduce((sum, step) => sum + step.duration, 0);
    const numericElapsed = Number(elapsedValue);
    const elapsed = Math.max(0, Math.min(
      totalDuration,
      Number.isFinite(numericElapsed) ? numericElapsed : 0,
    ));

    let stepIndex = recipe.steps.length - 1;
    let stepStartsAt = getStepStart(recipe, stepIndex);
    let boundary = 0;
    for (let index = 0; index < recipe.steps.length; index += 1) {
      const startsAt = boundary;
      boundary += recipe.steps[index].duration;
      if (elapsed < boundary) {
        stepIndex = index;
        stepStartsAt = startsAt;
        break;
      }
    }

    const nextStepIndex = stepIndex < recipe.steps.length - 1 ? stepIndex + 1 : null;
    const nextStartsAt = nextStepIndex === null
      ? null
      : stepStartsAt + recipe.steps[stepIndex].duration;
    const secondsUntilNext = nextStartsAt === null ? null : Math.max(0, nextStartsAt - elapsed);
    const preparationLeadSeconds = nextStepIndex === null
      ? null
      : getPreparationLead(recipe.steps[nextStepIndex]);

    return {
      elapsed,
      stepIndex,
      stepStartsAt,
      nextStepIndex,
      nextStartsAt,
      secondsUntilNext,
      preparationLeadSeconds,
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
    DEFAULT_PREPARATION_LEAD_SECONDS,
    IMMINENT_PREPARATION_SECONDS,
    MAX_COFFEE_GRAMS,
    MIN_COFFEE_GRAMS,
    RECIPES,
    clampCoffee,
    formatDuration,
    getBrewTiming,
    getPreparationLead,
    getRecipe,
    getStepStart,
    scaleRecipe,
  };
});
