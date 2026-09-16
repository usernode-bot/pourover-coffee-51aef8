(function exposeGlossary(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PouroverGlossary = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createGlossary() {
  const GLOSSARY_CATEGORIES = Object.freeze([
    'Recipe basics',
    'Technique',
    'Brewing steps',
    'In the cup',
    'Choosing a recipe',
  ]);

  const GLOSSARY_TERMS = Object.freeze([
    // Recipe basics
    {
      id: 'dose',
      term: 'Dose',
      category: 'Recipe basics',
      summary: 'The weight of dry coffee you start the brew with, in grams.',
      detail: 'Every other number in a recipe follows from the dose. Change the dose and the water targets and cup size change with it, which is why the app scales a whole recipe from one value.',
      seeAlso: ['brew-ratio', 'total-water'],
    },
    {
      id: 'brew-ratio',
      term: 'Brew ratio',
      category: 'Recipe basics',
      summary: 'How much water you use per gram of coffee, written like 1:16.',
      detail: 'A 1:16 ratio means 16 grams of water for every gram of coffee, so a 15 gram dose makes a 240 gram cup. Lower ratios taste stronger and heavier, higher ratios taste lighter and more tea-like.',
      seeAlso: ['dose', 'total-water', 'body'],
    },
    {
      id: 'grind-size',
      term: 'Grind size',
      category: 'Recipe basics',
      summary: 'How coarse or fine the coffee is ground before brewing.',
      detail: 'Finer grounds expose more surface and slow the water down, which pulls out more flavor and more bitterness. Coarser grounds drain faster for a lighter, cleaner cup. Grind is the first thing to adjust when a cup tastes off.',
      seeAlso: ['drawdown', 'brightness', 'body'],
    },
    {
      id: 'water-temperature',
      term: 'Water temperature',
      category: 'Recipe basics',
      summary: 'How hot the water is when it meets the coffee.',
      detail: 'Hotter water extracts faster and more completely, which suits lighter roasts. Cooler water slows extraction and softens bitterness, which suits darker roasts and larger doses.',
      seeAlso: ['light-roast', 'dark-roast', 'grind-size'],
    },
    {
      id: 'total-water',
      term: 'Total water',
      category: 'Recipe basics',
      summary: 'Every gram of water in the brew added together, bloom included.',
      detail: 'The final cumulative target of a recipe equals its total water. If you stop short or pour past it, the ratio you chose is no longer the ratio you brewed.',
      seeAlso: ['dose', 'brew-ratio', 'water-target'],
    },
    {
      id: 'water-target',
      term: 'Water target',
      category: 'Recipe basics',
      summary: 'The running total to reach by the end of a step, not the amount added in it.',
      detail: 'Targets are cumulative and always climb. A step that says 250g means the scale should read 250g when the step ends, even if you only added 100g during it.',
      seeAlso: ['total-water', 'pour'],
    },

    // Technique
    {
      id: 'percolation',
      term: 'Percolation',
      category: 'Technique',
      summary: 'Water passes through the coffee bed once and drains away.',
      detail: 'The classic pour-over shape: water flows in at the top and leaves through the filter, continuously replacing what drains. Percolation gives a clean, articulate cup because the liquid is always being renewed.',
      seeAlso: ['immersion', 'hybrid', 'clarity'],
    },
    {
      id: 'immersion',
      term: 'Immersion',
      category: 'Technique',
      summary: 'The coffee steeps in standing water before the brewer drains.',
      detail: 'Immersion is the French press idea with a paper filter underneath. Wait times matter more than pouring skill, so it is forgiving and produces a rounder, sweeter cup.',
      seeAlso: ['percolation', 'hybrid', 'steep', 'forgiving'],
    },
    {
      id: 'hybrid',
      term: 'Hybrid',
      category: 'Technique',
      summary: 'A brew that switches between percolation and immersion.',
      detail: 'Valve brewers like the Hario Switch let you steep part of the brew with the switch closed, then open it to drain. You get immersion sweetness with a filtered, percolation-style finish.',
      seeAlso: ['percolation', 'immersion', 'drawdown'],
    },
    {
      id: 'pulse-pour',
      term: 'Pulse pour',
      category: 'Technique',
      summary: 'The brew is built from several separate pours instead of one long one.',
      detail: 'Each pulse raises the water level a little and then lets it settle, keeping the bed agitated evenly without flooding it. Pulse pours give you repeated chances to correct the flow and suit larger doses.',
      seeAlso: ['single-pour', 'pour', 'agitation'],
    },
    {
      id: 'single-pour',
      term: 'Single pour',
      category: 'Technique',
      summary: 'All the water goes in as one continuous pour.',
      detail: 'One steady pour, usually low over the center, keeps the bed temperature stable and the brew simple. It is the most repeatable technique to learn because there is only one motion to get right.',
      seeAlso: ['pulse-pour', 'pour', 'quick'],
    },
    {
      id: 'agitation',
      term: 'Agitation',
      category: 'Technique',
      summary: 'Any motion that stirs the coffee bed while it brews.',
      detail: 'Swirling, stirring, and the force of the pour itself all count. A little agitation evens out extraction and lifts sweetness. Too much drives fines into the filter and slows the drain.',
      seeAlso: ['swirl', 'stir', 'drawdown'],
    },
    {
      id: 'swirl',
      term: 'Swirl',
      category: 'Technique',
      summary: 'A gentle circular shake of the brewer or server.',
      detail: 'Swirling settles the coffee bed into a flat, even layer and knocks grounds off the filter wall, so water passes through the whole bed at the same rate. Keep it light. A hard swirl stirs up fines.',
      seeAlso: ['agitation', 'stir', 'bed-prep'],
    },
    {
      id: 'stir',
      term: 'Stir',
      category: 'Technique',
      summary: 'Using a spoon to move the grounds through the water.',
      detail: 'Stirring is the strongest form of agitation. One or two shallow passes spread at the start of a brew even out the extraction, and a single stir later can settle a crust of floating grounds.',
      seeAlso: ['agitation', 'swirl', 'break-crust'],
    },
    {
      id: 'bypass',
      term: 'Bypass',
      category: 'Technique',
      summary: 'Water that reaches the cup without passing through the coffee.',
      detail: 'Bypass runs down the filter wall or through a gap beside the bed, diluting the cup and thinning the body. Slow, centered pours and a flat bed keep it to a minimum. Some cone brewers are designed with a deliberate low-bypass shape.',
      seeAlso: ['pour', 'bed-prep', 'body'],
    },
    {
      id: 'pour-order',
      term: 'Water first, or coffee first',
      category: 'Technique',
      summary: 'Whether the water or the grounds go into the brewer first.',
      detail: 'Adding water first and then the coffee keeps the grounds from clumping and speeds the drain, a common immersion trick. Adding coffee first lets you level the dry bed, which matters more in cone brewers.',
      seeAlso: ['immersion', 'bed-prep', 'grind-size'],
    },

    // Brewing steps
    {
      id: 'bloom',
      term: 'Bloom',
      category: 'Brewing steps',
      summary: 'The first small pour that wets the coffee and lets gas escape.',
      detail: 'Freshly roasted coffee holds carbon dioxide. Wetting the grounds and waiting lets that gas leave, so the coffee can absorb water evenly instead of repelling it. A bloom is usually about two to three times the dose in water.',
      seeAlso: ['dose', 'pour', 'grind-size'],
    },
    {
      id: 'drawdown',
      term: 'Drawdown',
      category: 'Brewing steps',
      summary: 'The stage after the last pour while the water leaves the bed.',
      detail: 'On a cone brewer the bed drains through the filter. On a valve brewer you start it by opening the switch, and on a cloth filter it is the slow finish. Drawdown time tells you whether the grind was right: very slow means too fine, very fast means too coarse.',
      seeAlso: ['grind-size', 'percolation', 'drain'],
    },
    {
      id: 'drain',
      term: 'Drain',
      category: 'Brewing steps',
      summary: 'Letting the finished coffee leave the brewer and reach your cup.',
      detail: 'Draining is the last stretch of a brew. Let the bed finish flat and undisturbed so the filter is not pulled into the flow, then serve promptly so the coffee does not keep extracting in the brewer.',
      seeAlso: ['drawdown', 'percolation'],
    },
    {
      id: 'steep',
      term: 'Steep',
      category: 'Brewing steps',
      summary: 'A waiting period where the coffee sits in still water.',
      detail: 'Nothing is poured and nothing is stirred. The coffee keeps extracting on its own, which lets you control strength with time instead of technique. Longer steeps give more sweetness and body, then turn heavy if pushed too far.',
      seeAlso: ['immersion', 'body', 'sweetness'],
    },
    {
      id: 'break-crust',
      term: 'Break the crust',
      category: 'Brewing steps',
      summary: 'A single shallow stir that settles the grounds floating on top.',
      detail: 'During a steep, lighter grounds float and form a crust. One shallow stir breaks it, releases the coffee trapped in it, and lets the bed settle flat before draining.',
      seeAlso: ['stir', 'steep', 'agitation'],
    },
    {
      id: 'bed-prep',
      term: 'Prepare the bed',
      category: 'Brewing steps',
      summary: 'Leveling the dry grounds and making a shallow well in the center.',
      detail: 'An uneven bed brews unevenly: thin spots drain fast and pull bypass while thick spots stay under-extracted. Leveling the grounds and opening a small center well gives the first pour somewhere even to land.',
      seeAlso: ['bypass', 'swirl', 'pour'],
    },
    {
      id: 'pour',
      term: 'Pour',
      category: 'Brewing steps',
      summary: 'A measured addition of water, usually in slow circles from the center outward.',
      detail: 'Pour low and steadily, starting at the center and widening if the recipe asks for it. Pouring height and speed are really agitation controls: a low thin stream disturbs the bed least, a high fast one stirs it up.',
      seeAlso: ['agitation', 'water-target', 'bypass'],
    },

    // In the cup
    {
      id: 'brightness',
      term: 'Brightness',
      category: 'In the cup',
      summary: 'The lively, juicy tartness that reads as fruit or citrus.',
      detail: 'Brightness comes from the coffee itself plus a faster, cooler extraction. It reads as clarity when it is clean and as sourness when the brew is under-extracted.',
      seeAlso: ['clarity', 'light-roast', 'grind-size'],
    },
    {
      id: 'sweetness',
      term: 'Sweetness',
      category: 'In the cup',
      summary: 'The round, sugary impression in the middle of the cup.',
      detail: 'Sweetness peaks when extraction is even and complete. Too little and the cup tastes sharp and hollow, too much and it turns sweet in a heavy, syrupy way. A flat bed and an even pour are what usually unlock it.',
      seeAlso: ['body', 'bloom', 'extraction'],
    },
    {
      id: 'balance',
      term: 'Balance',
      category: 'In the cup',
      summary: 'No single quality dominates the cup.',
      detail: 'A balanced brew has acidity, sweetness, and body in proportion, so nothing shouts. It is the easiest target to hit and the easiest to recognize, which makes it a good default when a new coffee is unknown.',
      seeAlso: ['brightness', 'sweetness', 'body'],
    },
    {
      id: 'clarity',
      term: 'Clarity',
      category: 'In the cup',
      summary: 'How sharply you can taste distinct flavors in the cup.',
      detail: 'Clarity is about separation: fruit reads as a specific fruit instead of a general sweetness. Paper-filtered percolation brews tend to have the most clarity, while immersion and cloth filters trade some clarity for texture.',
      seeAlso: ['percolation', 'body', 'brightness'],
    },
    {
      id: 'body',
      term: 'Body',
      category: 'In the cup',
      summary: 'The weight and texture of the coffee in your mouth.',
      detail: 'Body ranges from watery and tea-like to syrupy and dense. Lower ratios, immersion, and cloth filters all push body up. Higher ratios and paper filters bring it down.',
      seeAlso: ['brew-ratio', 'immersion', 'clarity'],
    },
    {
      id: 'intensity',
      term: 'Intensity',
      category: 'In the cup',
      summary: 'How concentrated and forceful the cup feels overall.',
      detail: 'Intensity combines strength with flavor impact. A short ratio and a low water temperature can make a small, dense cup that lands hard without tasting bitter.',
      seeAlso: ['brew-ratio', 'body', 'water-temperature'],
    },
    {
      id: 'extraction',
      term: 'Extraction',
      category: 'In the cup',
      summary: 'How much of the coffee has dissolved into the water.',
      detail: 'Under-extracted coffee tastes sour, thin, and hollow. Over-extracted coffee tastes bitter, dry, and harsh. Grind size, water temperature, and how long water stays in contact all move extraction up or down.',
      seeAlso: ['grind-size', 'water-temperature', 'drawdown'],
    },

    // Choosing a recipe
    {
      id: 'light-roast',
      term: 'Light roast',
      category: 'Choosing a recipe',
      summary: 'Roasted briefly, so the bean keeps more of its origin character.',
      detail: 'Light roasts are denser and harder to extract, so they usually want hotter water, a finer grind, or a longer brew. They reward clarity and brightness and punish under-extraction quickly.',
      seeAlso: ['brightness', 'water-temperature', 'clarity'],
    },
    {
      id: 'medium-roast',
      term: 'Medium roast',
      category: 'Choosing a recipe',
      summary: 'A middle roast that balances origin flavor with sweetness.',
      detail: 'Medium roasts extract easily across a wide range of recipes, which is why they are the usual default for learning a new brewer. They show sweetness and body together without much coaxing.',
      seeAlso: ['sweetness', 'balance', 'body'],
    },
    {
      id: 'dark-roast',
      term: 'Dark roast',
      category: 'Choosing a recipe',
      summary: 'Roasted longer, with deeper caramelized and bittersweet flavors.',
      detail: 'Dark roasts are more soluble and can turn bitter fast, so they often prefer cooler water, a coarser grind, or a shorter contact time. They carry milk and sweetness well.',
      seeAlso: ['water-temperature', 'grind-size', 'body'],
    },
    {
      id: 'forgiving',
      term: 'Forgiving',
      category: 'Choosing a recipe',
      summary: 'A recipe that still tastes good if your timing or pour drifts.',
      detail: 'Forgiving recipes lean on immersion, longer steeps, or wide tolerance for pour speed, so small mistakes cost little. They are the right choice for a distracted morning or a new brewer.',
      seeAlso: ['immersion', 'quick', 'steep'],
    },
    {
      id: 'quick',
      term: 'Quick',
      category: 'Choosing a recipe',
      summary: 'A recipe that finishes in roughly two minutes or less.',
      detail: 'Quick recipes usually use one continuous pour and a fast drain, which keeps the total time short. They reward a steady hand because there is little room to correct mid-brew.',
      seeAlso: ['single-pour', 'drawdown', 'precise'],
    },
    {
      id: 'precise',
      term: 'Precise',
      category: 'Choosing a recipe',
      summary: 'A recipe where small changes noticeably change the cup.',
      detail: 'Precise recipes use tighter ratios, finer grinds, or several timed pours, so pour control and timing both matter. They are the most rewarding to repeat once you have a steady pour.',
      seeAlso: ['pulse-pour', 'grind-size', 'experimental'],
    },
    {
      id: 'experimental',
      term: 'Experimental',
      category: 'Choosing a recipe',
      summary: 'A recipe built to explore an unusual ratio, dose, or method.',
      detail: 'Expect a distinct cup rather than a safe everyday one. Treat the first brew as a starting point and change one variable at a time so you can tell what caused the difference.',
      seeAlso: ['precise', 'grind-size', 'intensity'],
    },
    {
      id: 'single-cup',
      term: 'Single cup',
      category: 'Choosing a recipe',
      summary: 'A recipe sized for one mug, roughly 200 to 300 grams.',
      detail: 'Single-cup recipes let you dial in a coffee quickly and waste little when an idea does not work. The smaller bed drains faster, so grind and pour speed matter more than they do at batch size.',
      seeAlso: ['large-cup', 'dose', 'grind-size'],
    },
    {
      id: 'large-cup',
      term: 'Large cup',
      category: 'Choosing a recipe',
      summary: 'A recipe sized for a big mug or a generous serving, around 400 grams.',
      detail: 'A larger dose and a taller bed need a broader pour to keep the whole bed active. If the drain slows noticeably, grind slightly coarser to keep the timing on track.',
      seeAlso: ['single-cup', 'batch', 'grind-size'],
    },
    {
      id: 'batch',
      term: 'Batch',
      category: 'Choosing a recipe',
      summary: 'A recipe sized to serve two or more cups at once.',
      detail: 'Batching a pour-over changes the brew more than doubling the numbers suggests: the bed is deeper, so heat and flow are less even. Expect to grind coarser and pour in stages.',
      seeAlso: ['large-cup', 'pulse-pour', 'total-water'],
    },

    // The filter facets themselves, so every label on the recipe library has
    // a plain-language explanation.
    {
      id: 'roast-level',
      term: 'Roast',
      category: 'Choosing a recipe',
      summary: 'How far the coffee was roasted, from light through dark.',
      detail: 'Roast decides how easily the coffee gives up its flavor. Lighter roasts need more heat and a finer grind to taste sweet, while darker roasts extract quickly and turn bitter if pushed.',
      seeAlso: ['light-roast', 'medium-roast', 'dark-roast'],
    },
    {
      id: 'cup-profile',
      term: 'Cup profile',
      category: 'Choosing a recipe',
      summary: 'The overall character you want the finished cup to have.',
      detail: 'Filtering by cup profile skips the brewer question and starts from the result: bright and juicy, sweet and round, clean and separate, or full and heavy. Pick the profile first when you already know what you feel like drinking.',
      seeAlso: ['brightness', 'sweetness', 'clarity', 'body'],
    },
    {
      id: 'technique-facet',
      term: 'Technique',
      category: 'Choosing a recipe',
      summary: 'How water moves through the coffee during the brew.',
      detail: 'The technique filter separates recipes by the way they brew rather than by the brewer itself: water passing through once, coffee steeping in standing water, or a brew that switches between the two.',
      seeAlso: ['percolation', 'immersion', 'hybrid', 'pulse-pour'],
    },
    {
      id: 'experience-facet',
      term: 'Experience',
      category: 'Choosing a recipe',
      summary: 'How demanding a recipe is to brew well.',
      detail: 'This filter describes the recipe, not you. A forgiving recipe tolerates a rough pour, a quick one fits a busy morning, a precise one rewards careful timing, and an experimental one is built to explore.',
      seeAlso: ['forgiving', 'quick', 'precise', 'experimental'],
    },
    {
      id: 'serving-size',
      term: 'Serving',
      category: 'Choosing a recipe',
      summary: 'How much coffee the recipe makes in one go.',
      detail: 'Serving size changes the depth of the coffee bed, and a deeper bed brews differently from a shallow one. That is why a recipe sized for one mug is not simply half of a batch recipe.',
      seeAlso: ['single-cup', 'large-cup', 'batch'],
    },
  ]);

  // Frozen all the way down: the catalog is content, and both the app and the
  // content-integrity tests should be able to rely on it never changing shape.
  GLOSSARY_TERMS.forEach((entry) => {
    Object.freeze(entry.seeAlso);
    Object.freeze(entry);
  });

  const TERMS_BY_ID = Object.freeze(GLOSSARY_TERMS.reduce((map, entry) => {
    map[entry.id] = entry;
    return map;
  }, {}));

  // Timer step labels that deserve a definition, mapped to a glossary term.
  // Only labels whose meaning is genuinely specialized are listed; plain
  // preparation steps stay unlinked.
  const GLOSSARY_STEP_TERMS = Object.freeze({
    Bloom: 'bloom',
    'Long bloom': 'bloom',
    'Open bloom': 'bloom',
    'Closed bloom': 'bloom',
    'Slow bloom': 'bloom',
    'Gentle bloom': 'bloom',
    'Deep bloom': 'bloom',
    'Draw down': 'drawdown',
    Drain: 'drain',
    Release: 'drain',
    'Release bloom': 'drain',
    'Last drops': 'drain',
    Steep: 'steep',
    'Short steep': 'steep',
    'Break the crust': 'break-crust',
    'Gentle stir': 'stir',
    Settle: 'stir',
    'Fill and stir': 'stir',
    'Add and stir': 'stir',
    'Settle the bed': 'bed-prep',
    'Prepare the bed': 'bed-prep',
    'Shape the bed': 'bed-prep',
    'First pulse': 'pulse-pour',
    'Second pulse': 'pulse-pour',
    'Final pulse': 'pulse-pour',
    'Center pulse': 'pulse-pour',
    'Single pour': 'single-pour',
    'Gentle one-pour': 'single-pour',
    'Bold one-pour': 'single-pour',
    'Water first': 'pour-order',
    'Coffee first': 'pour-order',
    'First pour': 'pour',
    'Final pour': 'pour',
    'Middle pour': 'pour',
    'Main pour': 'pour',
    'Open pour': 'pour',
    'Build the bed': 'pour',
    'Build body': 'pour',
    Finish: 'pour',
    'Concentrated finish': 'pour',
  });

  // Taxonomy facet value to glossary term, so every filter label and every
  // recipe tag has a definition.
  const GLOSSARY_FILTER_TERMS = Object.freeze({
    roast: Object.freeze({ light: 'light-roast', medium: 'medium-roast', dark: 'dark-roast' }),
    profile: Object.freeze({
      bright: 'brightness',
      sweet: 'sweetness',
      balanced: 'balance',
      'high-clarity': 'clarity',
      'full-bodied': 'body',
      intense: 'intensity',
    }),
    technique: Object.freeze({
      percolation: 'percolation',
      immersion: 'immersion',
      hybrid: 'hybrid',
      'single-pour': 'single-pour',
      pulse: 'pulse-pour',
    }),
    experience: Object.freeze({
      forgiving: 'forgiving',
      quick: 'quick',
      precise: 'precise',
      experimental: 'experimental',
    }),
    serving: Object.freeze({
      'single-cup': 'single-cup',
      'large-cup': 'large-cup',
      batch: 'batch',
    }),
  });

  // Facet label to glossary term, so each recipe-library filter control can
  // explain what it is filtering on.
  const GLOSSARY_FACET_TERMS = Object.freeze({
    roast: 'roast-level',
    profile: 'cup-profile',
    technique: 'technique-facet',
    experience: 'experience-facet',
    serving: 'serving-size',
  });

  function getGlossaryTerm(id) {
    return TERMS_BY_ID[id] || null;
  }

  function getGlossaryTermForStep(label) {
    return getGlossaryTerm(GLOSSARY_STEP_TERMS[label]);
  }

  function getGlossaryTermsForFilter(facet, value) {
    const facetMap = GLOSSARY_FILTER_TERMS[facet];
    const term = facetMap ? getGlossaryTerm(facetMap[value]) : null;
    return term;
  }

  function getGlossaryTermForFacet(facet) {
    return getGlossaryTerm(GLOSSARY_FACET_TERMS[facet]);
  }

  function glossaryTermsByCategory() {
    return GLOSSARY_CATEGORIES.map((category) => ({
      category,
      terms: GLOSSARY_TERMS.filter((entry) => entry.category === category),
    }));
  }

  function searchGlossary(query) {
    const needle = String(query || '').trim().toLowerCase();
    if (!needle) return GLOSSARY_TERMS.slice();
    return GLOSSARY_TERMS.filter((entry) => (
      entry.term.toLowerCase().includes(needle)
      || entry.summary.toLowerCase().includes(needle)
      || entry.detail.toLowerCase().includes(needle)
      || entry.category.toLowerCase().includes(needle)
    ));
  }

  return {
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
  };
});
