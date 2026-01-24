export const METRIC_META = [
  { key: "panic",     name: "Panic Meter",      icon: "😱" },
  { key: "splatter",  name: "Splatter Score",   icon: "🩸" },
  { key: "dread",     name: "Dread Level",      icon: "🕷️" },
  { key: "creature",  name: "Creature Feature", icon: "🐾" },
  { key: "fun",       name: "Fun Factor",       icon: "🎃" },
  { key: "plot",      name: "Plot Points",      icon: "📖" },
  { key: "rewatch",   name: "Rewatchability",   icon: "📼" },
] as const;

export type MetricKey = typeof METRIC_META[number]["key"];
