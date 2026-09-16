# `.claude/` — Claude Code settings for this repo

## Why `settings.json` is here

This app is built on **Homeroom**, and Homeroom has a hosted MCP connector
that Claude and ChatGPT can talk to. Without an allow rule, Claude Code asks
permission on **every** connector call — including read-only ones like
`whoami`, `get_proposal` and `list_requests`. In a Claude Code web session
that grant does not persist, so the prompts come back next session. The
calls that genuinely deserve a confirmation — `submit_work` puts a change to
a group vote — end up buried in that noise and approved by reflex.

`settings.json` allows the read-only connector calls and **nothing else**:

```json
{
  "permissions": {
    "allow": [
      "mcp__homeroom__get_*",
      "mcp__homeroom__list_*",
      "mcp__homeroom__whoami",
      "mcp__homeroom__notify_awaiting_input",
      "mcp__homeroom__notify_input_received",
      "mcp__Homeroom__get_*",
      "mcp__Homeroom__list_*",
      "mcp__Homeroom__whoami",
      "mcp__Homeroom__notify_awaiting_input",
      "mcp__Homeroom__notify_input_received",
      "mcp__usernode__get_*",
      "mcp__usernode__list_*",
      "mcp__usernode__whoami",
      "mcp__usernode__notify_awaiting_input",
      "mcp__usernode__notify_input_received",
      "mcp__Usernode__get_*",
      "mcp__Usernode__list_*",
      "mcp__Usernode__whoami",
      "mcp__Usernode__notify_awaiting_input",
      "mcp__Usernode__notify_input_received"
    ]
  }
}
```

Deliberately not `mcp__homeroom__*`. This file is committed
into the repo, so it grants on behalf of everyone who opens it — and "every
call this connector can make" is not something one repo should decide for a
stranger's machine. These entries can only ever match reads, and they repeat
because a permission rule names its server literally: the same short list,
once per spelling the connector may be registered under.

If you want the acting calls (`submit_work`, `create_request`,
`prepare_work`, `start_platform_build`, `submit_platform_build`) allowed
too, grant that on your own account rather than here — set the connector to
allow-always in Claude's connector settings, or add the rules to your own
`~/.claude/settings.json`, where the decision covers your machine only.

## You will still see one trust dialog

`permissions.allow` rules in a project's `.claude/settings.json` grant
capability, so Claude Code applies them only after you accept the
**workspace trust dialog** for this workspace. Until then it reads the rules
but does not apply them. The dialog lists the rules, so you can review them
before accepting. One reviewable consent instead of dozens of per-call
prompts is the whole trade — and a repo silently granting a connector
permission on your behalf is exactly what that check exists to prevent.

## If you are still being prompted

The server segment of a permission rule is a **literal** — `mcp__*__get_*`
is not a thing — so these rules only match a connector named exactly one of
the spellings the shipped list covers:

`homeroom`, `Homeroom`, `usernode`, `Usernode`

The last two are what this connector was called before it was renamed, kept
so a connector added earlier keeps working. Claude.ai's "Add custom
connector" dialog takes whatever **name you type**, and a rule aimed at a
different one fails silently: no error, you just keep getting prompted.

**Read the name off your own tool list rather than trusting this file.** The
tool names you actually see are either `mcp__<server>__whoami` or
`mcp__claude_ai_<server>__whoami` — the prefix differs by surface. Copy the
`<server>` segment you see and edit the rules to match, or reconnect
the connector naming it `homeroom` exactly.

## Adding your own rules

This file is yours — add project rules alongside the connector ones. Just
keep the connector entries narrow: never widen them to a whole-server
wildcard, for the version reason above.

To stop the prompts in **every** repo at once rather than one at a time, put
the same rules under `permissions.allow` in your personal
`~/.claude/settings.json`. Homeroom's Settings → Connectors page has the
exact block, a copy button, and a field that rewrites the rules for a
connector registered under some other name.
