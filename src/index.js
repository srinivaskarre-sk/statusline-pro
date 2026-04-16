import { formatBranch, getBranchCommits } from "./branch.js";
import { formatMood } from "./mood.js";
import { getHNStatus } from "./hackernews.js";
import { formatSession } from "./session.js";

export async function render(input) {
  // Fetch HN status (uses cache, so usually instant)
  const hn = await getHNStatus().catch(() => "");

  const segments = [
    formatMood(),
    formatSession(input),
    formatBranch(getBranchCommits()),
    hn,
  ].filter(Boolean);

  return segments.join("  \u{2502}  ");
}
