import { execSync } from "node:child_process";

function git(cmd) {
  return execSync(`${cmd} 2>/dev/null`, {
    encoding: "utf-8",
    timeout: 2000,
  }).trim();
}

function getBaseBranch() {
  // Prefer origin/HEAD — tracks the repo's actual default branch
  try {
    const ref = git("git symbolic-ref --short refs/remotes/origin/HEAD");
    if (ref) return ref;
  } catch {}
  // Fall back to common candidates in priority order
  for (const cand of ["origin/main", "origin/master", "main", "master"]) {
    try {
      git(`git rev-parse --verify ${cand}`);
      return cand;
    } catch {}
  }
  return null;
}

export function getBranchCommits() {
  try {
    const branch = git("git branch --show-current");
    if (!branch) return { count: 0 }; // detached HEAD or not a repo

    const base = getBaseBranch();
    if (!base) return { count: 0 };

    // If we ARE the default branch, there's nothing "alone on this branch"
    const baseLocal = base.replace(/^origin\//, "");
    if (branch === baseLocal) return { count: 0 };

    const out = git(`git rev-list --count ${base}..HEAD`);
    const count = parseInt(out, 10) || 0;
    return { count };
  } catch {
    return { count: 0 };
  }
}

export function formatBranch({ count }) {
  if (!count) return "";
  return `\u{1F33F} +${count}`;
}
