# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

`statusline-pro` is a Claude Code status line script. Claude Code invokes `bin/cli.js` each render and pipes a JSON blob describing the current session to stdin; the script writes a single line of decorated text to stdout.

Pure ESM (`"type": "module"`), Node >=18, zero runtime dependencies (uses global `fetch`, `node:child_process`, `node:fs`).

## Commands

```bash
# Render once with no session input (blank stdin path)
node bin/cli.js < /dev/null

# Render with a realistic Claude Code payload
echo '{"cost":{"total_duration_ms":125000,"total_cost_usd":0.42},"context_window":{"total_input_tokens":12000,"total_output_tokens":3000,"used_percentage":47}}' | node bin/cli.js

# `npm test` is aliased to the same thing — there is no real test suite
```

There is no linter, formatter, or test framework configured. `npm test` just runs the CLI.

## Architecture

### Render pipeline (`src/index.js`)

`render(input)` builds a list of segment strings and joins them with `  │  `. Each segment is produced by a module in `src/` and is responsible for returning `""` when it has nothing to show (falsy segments are filtered out). Adding a segment = write a `formatX()` that returns a string or `""`, import it, and add to the array.

Current segments, in order: `formatMood()`, `formatSession(input)`, `formatStreak(getStreak())`, `getHNStatus()`.

### Input shape (`src/session.js`)

The JSON piped in by Claude Code is read in `bin/cli.js` with a **500ms hard timeout** — the status line must never hang. Malformed JSON is silently ignored. `session.js` reads these optional fields:

- `cost.total_duration_ms`, `cost.total_cost_usd`
- `context_window.total_input_tokens`, `total_output_tokens`, `used_percentage`

Every field is optional; missing fields are omitted from the output rather than defaulted.

### HN segment — caching & background refresh (`src/hackernews.js`)

This is the only segment that does network I/O, and the pattern matters:

- Cache lives at `~/.config/yaccstatus/hn-cache.json` (directory name is legacy, not `statusline-pro`). Rotation state at `~/.config/yaccstatus/hn-state.json`.
- TTL is 30 minutes. If the cache is fresh, `getHNStatus()` is synchronous-ish and fast.
- If the cache is **stale but present**, it's served immediately and `triggerBackgroundRefresh()` spawns `src/refresh-worker.js` as a detached, stdio-ignored child process. The parent exits without waiting.
- Only if there's **no cache at all** does it fetch synchronously (bounded by a 3s `AbortController` timeout).
- Stories are filtered: `score >= 50`, posted within the last 24h, `type === "story"`. Rotation advances via `hn-state.json` only after the current story has been displayed for `STORY_MIN_DISPLAY_MS` (15s) — Claude Code can re-render the status line many times a second and we don't want the headline to flicker faster than a human can read it.
- Titles are rendered as OSC8 hyperlinks (`\e]8;;URL\e\\TEXT\e]8;;\e\\`) so supporting terminals make them clickable; others show plain text.

When modifying this module, preserve the invariant that **a cold render never blocks on the network for more than 3s** and a warm render never blocks at all.

### Streak (`src/streak.js`)

Shells out to `git log` via `execSync` with a 2s timeout and swallows errors. Runs inside whatever directory Claude Code invoked the status line from (the user's project, not this repo), so the streak reflects the user's current project.

## Conventions

- **Never let a segment throw out to `render()`.** Each `formatX()` must return a string (possibly `""`). Network/filesystem/git calls must be wrapped in try/catch or `.catch(() => "")`.
- **Bound every I/O call.** Network = `AbortController` with timeout; git = `execSync` with `timeout`; stdin = 500ms hard timeout. The status line renders on every prompt; slowness is user-visible.
- Unicode glyphs are written as `\u{...}` escapes in source (not raw emoji) — keep that consistent.
