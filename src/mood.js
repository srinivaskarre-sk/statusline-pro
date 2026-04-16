const MOODS = [
  { start: 5, end: 8, icon: "\u{1F305}", label: "Early bird" },
  { start: 8, end: 11, icon: "\u2615", label: "Peak focus" },
  { start: 11, end: 13, icon: "\u{1F31E}", label: "Midday" },
  { start: 13, end: 15, icon: "\u{1F9E0}", label: "Deep work" },
  { start: 15, end: 18, icon: "\u26A1", label: "Afternoon push" },
  { start: 18, end: 21, icon: "\u{1F319}", label: "Evening mode" },
  { start: 21, end: 24, icon: "\u{1F30C}", label: "Night owl" },
  { start: 0, end: 5, icon: "\u{1F634}", label: "Go to sleep!" },
];

export function formatMood() {
  const hour = new Date().getHours();
  const mood = MOODS.find((m) => hour >= m.start && hour < m.end);
  return mood ? `${mood.icon}${mood.label}` : "";
}
