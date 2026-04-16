import { execSync } from "node:child_process";

export function getStreak() {
  try {
    // Get unique commit dates for the last 30 days
    const log = execSync(
      'git log --format="%ad" --date=short --since="30 days ago" 2>/dev/null',
      { encoding: "utf-8", timeout: 2000 }
    ).trim();

    if (!log) return { days: 0, todayCommits: 0 };

    const dates = [...new Set(log.split("\n"))];
    const today = new Date().toISOString().slice(0, 10);
    const todayCommits = log.split("\n").filter((d) => d === today).length;

    // Count consecutive days ending today or yesterday
    let streak = 0;
    const check = new Date();
    for (let i = 0; i < 30; i++) {
      const dateStr = check.toISOString().slice(0, 10);
      if (dates.includes(dateStr)) {
        streak++;
      } else if (i > 0) {
        break; // allow today to be missing (still coding)
      }
      check.setDate(check.getDate() - 1);
    }

    return { days: streak, todayCommits };
  } catch {
    return { days: 0, todayCommits: 0 };
  }
}

export function formatStreak({ days, todayCommits }) {
  const parts = [];
  if (days > 0) parts.push(`\u{1F525}${days}d`);
  if (todayCommits > 0) parts.push(`${todayCommits} today`);
  return parts.join(" | ") || "";
}
