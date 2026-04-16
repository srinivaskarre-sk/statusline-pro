import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const CONFIG_DIR = join(homedir(), ".config", "yaccstatus");
const CACHE_FILE = join(CONFIG_DIR, "hn-cache.json");
const STATE_FILE = join(CONFIG_DIR, "hn-state.json");

const CACHE_TTL = 30 * 60 * 1000; // 30 minutes
const STORY_COUNT = 30;
const FETCH_TIMEOUT_MS = 3000;
const MAX_AGE_HOURS = 24; // Only show stories posted in the last 24h
const MIN_SCORE = 50; // Filter out low-signal stories
const STORY_MIN_DISPLAY_MS = 15 * 1000; // Keep each story on screen long enough to read

function ensureDir() {
  if (!existsSync(CONFIG_DIR)) mkdirSync(CONFIG_DIR, { recursive: true });
}

function readJson(path, fallback) {
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return fallback;
  }
}

async function fetchWithTimeout(url, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function refreshCache() {
  // beststories = top-voted recent stories (better "today's tech news" signal than topstories)
  const ids = await fetchWithTimeout(
    "https://hacker-news.firebaseio.com/v0/beststories.json",
    FETCH_TIMEOUT_MS,
  );
  const topIds = ids.slice(0, STORY_COUNT * 2); // fetch extra since we'll filter

  const stories = await Promise.all(
    topIds.map((id) =>
      fetchWithTimeout(
        `https://hacker-news.firebaseio.com/v0/item/${id}.json`,
        FETCH_TIMEOUT_MS,
      ).catch(() => null),
    ),
  );

  const cutoff = Date.now() / 1000 - MAX_AGE_HOURS * 3600;

  const filtered = stories
    .filter(
      (s) =>
        s &&
        s.title &&
        s.type === "story" &&
        (s.score || 0) >= MIN_SCORE &&
        (s.time || 0) >= cutoff,
    )
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, STORY_COUNT)
    .map((s) => ({
      id: s.id,
      title: s.title,
      url: s.url || `https://news.ycombinator.com/item?id=${s.id}`,
      score: s.score || 0,
      time: s.time,
    }));

  ensureDir();
  writeFileSync(
    CACHE_FILE,
    JSON.stringify({ fetchedAt: Date.now(), stories: filtered }),
  );
  return filtered;
}

function triggerBackgroundRefresh() {
  // Spawn a detached process to refresh the cache without blocking this render
  const scriptPath = fileURLToPath(new URL("./refresh-worker.js", import.meta.url));
  const child = spawn(process.execPath, [scriptPath], {
    detached: true,
    stdio: "ignore",
  });
  child.unref();
}

function getNextStory(stories) {
  ensureDir();
  const state = readJson(STATE_FILE, { index: 0, showedAt: 0 });
  const now = Date.now();
  let { index = 0, showedAt = 0 } = state;
  const elapsed = now - showedAt;

  let changed = false;
  if (showedAt === 0 || elapsed < 0) {
    // First render (or clock skew): stamp current index, don't advance.
    showedAt = now;
    changed = true;
  } else if (elapsed >= STORY_MIN_DISPLAY_MS) {
    // Current story has had its airtime — rotate to the next.
    index = (index + 1) % stories.length;
    showedAt = now;
    changed = true;
  }

  if (changed) {
    writeFileSync(STATE_FILE, JSON.stringify({ index, showedAt }));
  }
  return stories[index % stories.length];
}

function extractDomain(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return host;
  } catch {
    return "";
  }
}

function clickableLink(url, text) {
  // OSC8 hyperlink: works in iTerm2, WezTerm, Kitty, modern Terminal.app
  // Degrades gracefully (just shows the text) in terminals that don't support it
  return `\u001b]8;;${url}\u001b\\${text}\u001b]8;;\u001b\\`;
}

function truncate(str, max) {
  if (str.length <= max) return str;
  return str.slice(0, max - 1) + "\u2026";
}

export async function getHNStatus() {
  const cache = readJson(CACHE_FILE, null);
  const now = Date.now();
  const isStale = !cache || now - cache.fetchedAt > CACHE_TTL;

  let stories = cache?.stories;

  if (!stories || stories.length === 0) {
    // No cache at all - must fetch synchronously
    try {
      stories = await refreshCache();
    } catch {
      return "";
    }
  } else if (isStale) {
    // Have stale cache - serve it but kick off a background refresh
    triggerBackgroundRefresh();
  }

  const story = getNextStory(stories);
  if (!story) return "";

  const domain = extractDomain(story.url);
  const title = truncate(story.title, 65);
  const scorePart = story.score ? `[${story.score}\u2191] ` : "";
  const label = `\u{1F4F0} ${scorePart}${title}${domain ? ` (${domain})` : ""}`;
  return clickableLink(story.url, label);
}
