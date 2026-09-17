# Pourover Coffee — notes for Claude Code

This app runs on **Homeroom**. If you're Claude Code
editing this repo, read the platform conventions before making
changes:

**Platform conventions (authoritative, always current):**
https://my.onhomeroom.com/claude.md

Fetch that URL at the start of each session — it's the single source
of truth for platform-wide behavior (auth model, `USERNODE_ENV`,
public/private tables, "don't `git push`", etc.). The hosted copy is
updated in place when platform rules change, so fetching it gives you
today's rules, not a stale snapshot.

When running inside Homeroom's dev-chat, those same conventions are
already injected into your system prompt, so the fetch is a no-op in
that path — but it's the right reflex when someone runs Claude Code
against this repo locally or from another harness.

## Connector permission prompts

This repo ships `.claude/settings.json`, which allows the **read-only**
Homeroom connector calls (`mcp__homeroom__get_*`,
`…__list_*`, `…__whoami`) so they stop prompting one at a time. Everything
that acts — filing a request, opening or advancing a proposal — still asks.
Claude Code applies those rules only after you accept the
workspace trust dialog, which lists them for review. See `.claude/README.md`
for the whole story, including what to do if you are still being prompted
(usually: your connector is registered under a different name than the rules
assume).

## Product shell

The starter template has been replaced by the product experience. Keep the
`usernode-dev-console@1` forwarder `<script>` unchanged when editing the
HTML because that block is platform infrastructure. The shell also loads the
centrally hosted bridge and native UI kit from relative `/usernode-*` paths;
never vendor those files.

If a rule below this line conflicts with the hosted conventions, the
hosted conventions win. This file is **app-specific** — write down
things about *this* app that belong in the repo: product intent,
data-model quirks, style preferences, opt-in policies (e.g. which
tables you've marked private), etc.

---

## About Pourover Coffee

Pourover Coffee is a mobile-first recipe and timer companion for manual
coffee brewing. It ships twenty-four original recipes, three each for V60,
Hario Switch, Mugen, Clever Dripper, cotton-filter brewing, Kalita Wave,
Chemex, and AeroPress.

## App-specific conventions

- Recipe water is derived from the selected coffee dose and recipe ratio,
  rounded to the nearest gram. Numeric cumulative step targets scale by the
  same proportion, and the final numeric target must equal total water.
  Action-only steps omit their target instead of inventing a scale reading.
- Recipe definitions and scaling logic live in `public/recipes.js` so the
  browser and Node unit tests exercise the same source.
- Methods and recipes are separate records. Method ids identify brewers;
  stable recipe ids identify a recipe across revisions. Each immutable recipe
  revision has a `<recipe-id>@<version>` id and the latest revision is exposed
  through `RECIPES`. Never change an existing revision in place: append the
  next numbered revision to `RECIPE_REVISIONS`.
  Legacy `?recipe=<method-id>` and `?brew=<method-id>` URLs resolve to that
  method's declared default recipe.
- Recipe discovery uses the typed `TAG_TAXONOMY` facets in
  `public/recipes.js`: roast, profile, technique, experience, and serving.
  `filterRecipes` applies AND semantics across selected facets. The library
  stores those selections in query parameters, using `filterMethod` for the
  method facet so it cannot conflict with the dedicated `method` page route.
- Each recipe step has a value from the controlled `STEP_ACTIONS` vocabulary
  plus short `preparation` copy for the timer's upcoming action card.
  Preparation begins 15 seconds before the step unless that step sets a longer
  `prepareLeadSeconds` value; the final 10 seconds use the strongest visible
  cue.
- Journal entries are private PostgreSQL records. Keep
  `brew_journal_entries` marked `staging:private`, scope every query to the
  verified Homeroom user id, and preserve `recipe_snapshot` when editable
  notes or setup fields change. Recipe snapshots are created server-side from
  a known revision and include the scaled instructions used for that cup.
- Personal recipes and their append-only revisions are private PostgreSQL
  records. Keep both `personal_recipes` and `personal_recipe_revisions`
  marked `staging:private`, scope every query to the verified user id, and
  insert a new numbered revision for every brew-defining edit. Archive state
  is reversible metadata on the stable recipe. Deleting a personal recipe
  must never delete or rewrite a journal snapshot.
- Glossary copy lives in `public/glossary.js`, deliberately separate from
  `public/recipes.js`. Terms are keyed by stable ids, and taxonomy values and
  timer step labels map onto those ids rather than restating definitions.
  `tests/glossary.test.js` asserts every taxonomy value and mapped step has a
  definition and that the copy is complete.
- Definitions open in a panel over the current screen, so the timer and form
  state are never lost. The panel is reachable by keyboard, closes on Escape,
  and leaves the screen behind it inert while open.
- Preferred doses are non-sensitive device preferences and stay in
  `localStorage`, keyed by recipe id. Read the previous method-level key as a
  migration fallback before using the recipe's base dose.
- Keep the experience calm and practical. Add one brewing variable at a
  time, and frame every recipe as a starting point rather than a rule.
- Brew adjustment guidance is deterministic and recipe-aware. Keep the
  controlled symptom rules in `public/adjustments.js`, recommend only one
  variable at a time, name what stays unchanged, and treat conflicting or
  unsupported inputs as a reason to ask for a dominant symptom rather than
  guessing. Recommendations never mutate a journal entry or recipe until the
  brewer explicitly saves through the existing controls.
