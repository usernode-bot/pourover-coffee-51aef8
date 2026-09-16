# Pourover Coffee

A calm, mobile-first companion for finding and scaling pour-over recipes,
then following a brew one timed step at a time. It includes fifteen original
recipes across V60, Hario Switch, Mugen, Clever Dripper, and cotton-filter
brewing.

## What it does

- Scales coffee from 5g to 60g and calculates total water from each recipe's
  ratio.
- Scales every cumulative pour target with the chosen dose.
- Separates brewing methods from recipes, with three distinct recipes for
  every supported brewer.
- Filters the recipe library by method, roast, cup profile, technique,
  experience, and serving size. Filters combine across facets and remain in
  the URL so a result set can be shared or checked directly.
- Guides a brew with a timestamp-based timer that stays accurate after the
  page has been in the background.
- Keeps the next action visible with its scheduled time, countdown, scaled
  water target, and a preparation cue.
- Provides pause, resume, previous, next, reset, and brew-again controls.
- Saves private brew journal entries from a completed timer or a manual form,
  including coffee, roaster, process, roast date, grinder, setting, water,
  gear, taste ratings, freeform notes, and one change to try next time.
- Lets a brewer filter, inspect, edit, delete, and repeat journal entries. Each
  entry keeps an immutable snapshot of the exact recipe revision and scaled
  dose used for that brew.
- Versions recipes under stable ids. Current recipe links stay canonical while
  historical journal entries can still open and repeat an older revision.
- Remembers a preferred dose for each recipe in local storage. Existing
  method-level preferences remain valid as a fallback.
- Exposes deterministic recipe and timer URLs for Homeroom proposal checks.

Recipes are starting points. Taste the cup and adjust one variable at a time.

Upcoming steps enter their preparation state 15 seconds before the boundary
by default. A recipe step can set `prepareLeadSeconds` when its setup needs
more time. The final 10 seconds always use the stronger get-ready treatment.

## Local development

```sh
npm ci
npm test
npm run build
npm start
```

Homeroom supplies authentication and runtime environment variables in hosted
deployments. The app keeps the scaffold's deny-by-default JWT verification.
Set `DATABASE_URL` to a PostgreSQL database to enable the brew journal. Its
boot-time schema is idempotent and the journal table is marked
`staging:private`, so staged proposals never receive production journal rows.

## Structure

- `public/index.html`: the library, method, recipe, timer, and journal
  application shell.
- `public/app.css`: the coffee-and-paper visual system.
- `public/recipes.js`: method metadata, append-only recipe revisions, immutable
  snapshot creation, tag taxonomy, filtering, legacy-link resolution, and
  dose-scaling logic.
- `public/app.js`: navigation, rendering, local preferences, timer, and journal
  interactions.
- `journal-store.js`: validated and user-scoped PostgreSQL journal storage.
- `server.js`: Homeroom authentication, journal API, static serving, deep
  links, and graceful shutdown.
- `dapp.json`: the app icon and proposal checks.
