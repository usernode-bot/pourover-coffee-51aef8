# Pourover Coffee

A calm, mobile-first companion for scaling pour-over recipes and following
a brew one timed step at a time. It includes starting recipes for V60,
Hario Switch, Mugen, Clever Dripper, and cotton-filter brewing.

## What it does

- Scales coffee from 5g to 60g and calculates total water from each recipe's
  ratio.
- Scales every cumulative pour target with the chosen dose.
- Guides a brew with a timestamp-based timer that stays accurate after the
  page has been in the background.
- Keeps the next action visible with its scheduled time, countdown, scaled
  water target, and a preparation cue.
- Provides pause, resume, previous, next, reset, and brew-again controls.
- Remembers a preferred dose for each method in local storage.
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
deployments. The app keeps the scaffold's deny-by-default JWT verification and
uses no database for its current feature set.

## Structure

- `public/index.html`: the three-screen application shell.
- `public/app.css`: the coffee-and-paper visual system.
- `public/recipes.js`: recipe definitions and dose-scaling logic.
- `public/app.js`: navigation, rendering, local preferences, and the timer.
- `server.js`: Homeroom authentication, static serving, deep links, and
  graceful shutdown.
- `dapp.json`: the app icon and proposal checks.
