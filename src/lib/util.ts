const THUMB_COLORS = [
  '#0A6C4E',
  '#1E5AA8',
  '#B4531A',
  '#7A3EA1',
  '#0F7B8A',
  '#A83251',
  '#4A6B1E',
  '#8A6D0F',
];

/** Deterministic colour for a garage thumbnail based on its id. */
export function thumbColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return THUMB_COLORS[hash % THUMB_COLORS.length];
}

/** Up to two initials from a garage name. */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}
