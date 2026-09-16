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
coffee brewing. It ships fifteen original recipes, three each for V60,
Hario Switch, Mugen, Clever Dripper, and cotton-filter brewing.

## App-specific conventions

- Recipe water is derived from the selected coffee dose and recipe ratio,
  rounded to the nearest gram. Every cumulative step target scales by the
  same proportion, and the final target must equal total water.
- Recipe definitions and scaling logic live in `public/recipes.js` so the
  browser and Node unit tests exercise the same source.
- Methods and recipes are separate records. Method ids identify brewers;
  stable recipe ids identify an exact set of dose, ratio, steps, and tags.
  Legacy `?recipe=<method-id>` and `?brew=<method-id>` URLs resolve to that
  method's declared default recipe.
- Recipe discovery uses the typed `TAG_TAXONOMY` facets in
  `public/recipes.js`: roast, profile, technique, experience, and serving.
  `filterRecipes` applies AND semantics across selected facets. The library
  stores those selections in query parameters, using `filterMethod` for the
  method facet so it cannot conflict with the dedicated `method` page route.
- Each recipe step includes short `preparation` copy for the timer's upcoming
  action card. Preparation begins 15 seconds before the step unless that step
  sets a longer `prepareLeadSeconds` value; the final 10 seconds use the
  strongest visible cue.
- Preferred doses are non-sensitive device preferences and stay in
  `localStorage`, keyed by recipe id. Read the previous method-level key as a
  migration fallback before using the recipe's base dose. The MVP has no
  server-side user data and needs no database.
- Keep the experience calm and practical. Add one brewing variable at a
  time, and frame every recipe as a starting point rather than a rule.
