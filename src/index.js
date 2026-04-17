import { formatBranch, getBranchCommits } from "./branch.js";
import { formatMood } from "./mood.js";
import { getHNStatus } from "./hackernews.js";
import { formatSession } from "./session.js";

// Strip ANSI escape sequences (including OSC8 hyperlinks) to measure visible length.
function visibleLength(str) {
  // Remove OSC sequences: ESC ] ... ESC \\ or ESC ] ... BEL
  // Remove CSI sequences: ESC [ ... m
  return str
    .replace(/\x1b\][^\x1b]*(\x1b\\|\x07)/g, "")
    .replace(/\x1b\[[0-9;]*[a-zA-Z]/g, "")
    .length;
}

export async function render(input) {
  const cols = process.stdout.columns || 220;

  // Thresholds
  // < 80  : show only mood + session (bare minimum)
  // 80-119: mood + session + branch (no HN)
  // 120+  : full output; HN title budget scales with remaining width

  const SEP = "  \u{2502}  "; // "  │  "
  const SEP_VIS = 5;           // visible width of separator

  const mood = formatMood();
  const session = formatSession(input);
  const branch = formatBranch(getBranchCommits());

  // Build the always-present core segments
  const core = [mood, session, branch].filter(Boolean);
  const coreStr = core.join(SEP);
  const coreLen = visibleLength(coreStr);

  let hn = "";
  if (cols >= 120) {
    // Budget: whatever is left after core + one separator
    const budget = cols - coreLen - SEP_VIS - 2; // -2 for breathing room
    const maxTitle = Math.max(20, Math.min(65, budget - 20)); // ~20 chars for score/domain/icon
    hn = await getHNStatus(maxTitle).catch(() => "");
  }

  const segments = [...core, hn].filter(Boolean);
  return segments.join(SEP);
}
