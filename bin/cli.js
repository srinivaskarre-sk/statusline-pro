#!/usr/bin/env node

import { render } from "../src/index.js";

async function readStdin() {
  // If stdin is a TTY (running interactively), no input is piped
  if (process.stdin.isTTY) return null;

  return new Promise((resolve) => {
    let data = "";
    let settled = false;

    // Hard timeout so we never hang the status line
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(data || null);
      }
    }, 500);

    process.stdin.setEncoding("utf-8");
    process.stdin.on("data", (chunk) => (data += chunk));
    process.stdin.on("end", () => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        resolve(data || null);
      }
    });
    process.stdin.on("error", () => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        resolve(null);
      }
    });
  });
}

const raw = await readStdin();
let input = null;
if (raw) {
  try {
    input = JSON.parse(raw);
  } catch {
    // Ignore malformed input - just render without session data
  }
}

const output = await render(input);
process.stdout.write(output);
