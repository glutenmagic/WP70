export const MIN_RADIUS = 10;
export const MAX_RADIUS = 40;

/**
 * Bubble radius in px: proportional to the square root of the count (so area
 * tracks the count), relative to the largest count on screen, clamped to
 * 10..40 px.
 */
export function bubbleRadius(count: number, maxCount: number, maxRadius = MAX_RADIUS): number {
  if (maxCount <= 0 || count <= 0) return MIN_RADIUS;
  const r = maxRadius * Math.sqrt(count / maxCount);
  return Math.round(Math.min(maxRadius, Math.max(MIN_RADIUS, r)) * 10) / 10;
}

/**
 * Largest bubble radius for a map zoom level. At the island overview there
 * is no room for 40 px bubbles (agreed deviation from the spec); the full
 * 10..40 px range applies from zoom 12.
 */
export function maxRadiusForZoom(zoom: number): number {
  if (zoom >= 12) return MAX_RADIUS;
  if (zoom >= 11) return 34;
  return 28;
}

/** Font size for a bubble's count label, in px. */
export function labelFontSize(diameter: number): number {
  return Math.min(16, Math.max(11, diameter * 0.3));
}

/** Bubbles smaller than this never show a count, so labels read consistently. */
export const MIN_LABELLED_DIAMETER = 28;

/** Whether a bubble of this diameter shows its count label. */
export function labelFits(label: string, diameter: number): boolean {
  if (diameter < MIN_LABELLED_DIAMETER) return false;
  // Bold system-font digits are about 0.62 em wide; keep 3 px either side.
  return label.length * labelFontSize(diameter) * 0.62 + 6 <= diameter;
}

/** Label inside a bubble: 999, 1.2k, 12k, 1.2m. */
export function formatCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 10_000) return `${trimZero((Math.floor(n / 100) / 10).toFixed(1))}k`;
  if (n < 1_000_000) return `${Math.floor(n / 1000)}k`;
  return `${trimZero((Math.floor(n / 100_000) / 10).toFixed(1))}m`;
}

const trimZero = (s: string) => s.replace(/\.0$/, '');

const numberFormat = new Intl.NumberFormat('en-GB');

/** Accessible name, e.g. "Hougang, 1,204 photos". */
export function bubbleLabel(name: string, count: number): string {
  return `${name}, ${numberFormat.format(count)} ${count === 1 ? 'photo' : 'photos'}`;
}

/**
 * Keyboard order for bubbles: north to south in bands about 3.3 km tall,
 * west to east within each band, like reading a page.
 */
export function readingOrder<T extends { lat: number; lng: number }>(places: T[]): T[] {
  const band = (lat: number) => Math.round(-lat / 0.03);
  return [...places].sort((a, b) => band(a.lat) - band(b.lat) || a.lng - b.lng);
}
