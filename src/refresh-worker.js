// Detached worker that refreshes the HN cache in the background
import { refreshCache } from "./hackernews.js";

refreshCache().catch(() => {
  // Silent failure - next render will try again if still stale
  process.exit(1);
});
