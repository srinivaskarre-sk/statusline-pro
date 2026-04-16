# statusline-pro

A lightweight Claude Code status line with session stats, branch commit counts, time-of-day mood, and Hacker News headlines — all in one line.

```
☕Peak focus  │  ⏱ 12m3s 🔥 15.2k tok 47% ctx $0.42  │  🌿 +3  │  📰 [312↑] Title of story (example.com)
```

## Setup

### 1. Link the CLI globally

From the repo root:

```bash
npm link
```

This creates a `statusline-pro` symlink in your npm global bin directory pointing at `bin/cli.js`. Verify:

```bash
which statusline-pro
statusline-pro < /dev/null
```

If `which` prints nothing, your npm global bin isn't on `PATH`. Check with `npm config get prefix` and add `<prefix>/bin` to your shell's PATH.

### 2. Wire it into Claude Code

Add this to `~/.claude/settings.json` (create the file if it doesn't exist):

```json
{
  "statusLine": {
    "type": "command",
    "command": "statusline-pro"
  }
}
```

Start a new Claude Code session — the status line should appear at the bottom. That's it.

### Uninstall

```bash
npm unlink -g statusline-pro
```

Then remove the `statusLine` block from `~/.claude/settings.json`.

## What each segment means

| Segment | Source |
|---|---|
| 🌅 / ☕ / 🌙 + label | Local time of day |
| ⏱ duration, 🔥 tokens, `%` context, `$` cost | JSON piped in by Claude Code |
| 🌿 +N | Commits on your current branch that aren't on the default branch yet (i.e. what would go in a PR). Hidden on the default branch or outside a git repo |
| 📰 `[score↑] title (domain)` | Hacker News front-page stories (in HN's own ranking order, filtered to the last 24h), cached for 30 min. Title is a clickable OSC8 hyperlink in supported terminals (iTerm2, WezTerm, Kitty, Terminal.app) |

Segments with nothing to show (e.g. no git history, no cost data) are omitted silently.

## Development

### Layout

```
bin/cli.js            # stdin reader + entry point
src/index.js          # render() — composes segments
src/mood.js           # time-of-day label
src/session.js        # parses Claude Code's session JSON
src/branch.js         # commits on current branch ahead of default
src/hackernews.js     # HN fetch + cache + rotation
src/refresh-worker.js # detached background cache refresher
```

### Test a change locally

Because of `npm link`, edits to `src/` and `bin/` take effect immediately — no reinstall needed. Pipe a sample payload to see what Claude Code will see:

```bash
echo '{"cost":{"total_duration_ms":125000,"total_cost_usd":0.42},"context_window":{"total_input_tokens":12000,"total_output_tokens":3000,"used_percentage":47}}' | statusline-pro
```

Or with no input (simulates cold start):

```bash
statusline-pro < /dev/null
```

There is no linter, formatter, or test framework. `npm test` just runs the CLI.

### Adding a segment

1. Create `src/mything.js` exporting `formatMyThing()` that returns a string (or `""` when it has nothing to show).
2. Import it in `src/index.js` and add it to the `segments` array in the order you want.
3. Wrap any network/filesystem/git call in try/catch so a failure returns `""` instead of throwing — `render()` must never throw.
4. Bound every I/O call with a timeout (network: `AbortController`, git: `execSync` `timeout` option). The status line renders on every prompt; slowness is user-visible.

### HN cache

Cached at `~/.config/yaccstatus/hn-cache.json` (TTL 30 min). Rotation state at `~/.config/yaccstatus/hn-state.json` — each story stays on screen for at least 15s before rotating to the next, regardless of how often Claude Code re-renders the status line. Delete either file to reset.

Stale cache is served instantly while a detached background process refreshes it — a cold render never blocks on the network for more than 3s, a warm render never blocks at all.

## License

MIT
