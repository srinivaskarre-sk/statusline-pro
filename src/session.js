function formatDuration(ms) {
  if (!ms || ms < 0) return "";
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  if (hours > 0) return `${hours}h${mins}m`;
  if (mins > 0) return `${mins}m${secs}s`;
  return `${secs}s`;
}

function formatTokens(n) {
  if (!n || n < 0) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function formatCost(usd) {
  if (!usd || usd < 0) return "";
  if (usd < 0.01) return "<$0.01";
  return `$${usd.toFixed(2)}`;
}

export function formatSession(input) {
  if (!input) return "";

  const parts = [];

  const duration = input.cost?.total_duration_ms;
  if (duration) parts.push(`\u23F1 ${formatDuration(duration)}`);

  const inTok = input.context_window?.total_input_tokens || 0;
  const outTok = input.context_window?.total_output_tokens || 0;
  const total = inTok + outTok;
  if (total > 0) {
    parts.push(`\u{1F525} ${formatTokens(total)} tok`);
  }

  const pct = input.context_window?.used_percentage;
  if (typeof pct === "number") {
    parts.push(`${pct}% ctx`);
  }

  const cost = input.cost?.total_cost_usd;
  if (cost) {
    const costStr = formatCost(cost);
    if (costStr) parts.push(costStr);
  }

  return parts.join(" ");
}
