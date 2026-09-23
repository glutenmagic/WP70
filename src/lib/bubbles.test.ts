import { describe, expect, it } from 'vitest';
import { bubbleLabel, bubbleRadius, formatCount, labelFits, maxRadiusForZoom, readingOrder } from './bubbles.ts';

describe('bubbleRadius', () => {
  it('gives the largest count the maximum radius', () => {
    expect(bubbleRadius(43_000, 43_000)).toBe(40);
  });

  it('scales with the square root of the count', () => {
    expect(bubbleRadius(25, 100)).toBe(20);
  });

  it('clamps small counts to 10 px', () => {
    expect(bubbleRadius(1, 43_000)).toBe(10);
  });

  it('handles empty input safely', () => {
    expect(bubbleRadius(0, 0)).toBe(10);
  });
});

describe('formatCount', () => {
  it.each([
    [0, '0'],
    [7, '7'],
    [999, '999'],
    [1000, '1k'],
    [1204, '1.2k'],
    [1299, '1.2k'],
    [9999, '9.9k'],
    [10_000, '10k'],
    [43_153, '43k'],
    [999_999, '999k'],
    [1_250_000, '1.2m'],
  ])('%i -> %s', (n, label) => {
    expect(formatCount(n)).toBe(label);
  });
});

describe('bubbleLabel', () => {
  it('uses grouped numbers and plural', () => {
    expect(bubbleLabel('Hougang', 1204)).toBe('Hougang, 1,204 photos');
  });

  it('uses singular for one photo', () => {
    expect(bubbleLabel('Tengah', 1)).toBe('Tengah, 1 photo');
  });
});

describe('readingOrder', () => {
  it('orders north to south, then west to east', () => {
    const places = [
      { id: 'south-west', lat: 1.28, lng: 103.7 },
      { id: 'north-east', lat: 1.44, lng: 103.9 },
      { id: 'north-west', lat: 1.44, lng: 103.7 },
      { id: 'south-east', lat: 1.28, lng: 103.9 },
    ];
    expect(readingOrder(places).map((p) => p.id)).toEqual(['north-west', 'north-east', 'south-west', 'south-east']);
  });
});

describe('maxRadiusForZoom', () => {
  it('uses the full 40 px from zoom 12', () => {
    expect(maxRadiusForZoom(12)).toBe(40);
    expect(maxRadiusForZoom(16)).toBe(40);
  });

  it('shrinks at the island overview', () => {
    expect(maxRadiusForZoom(11)).toBe(34);
    expect(maxRadiusForZoom(10)).toBe(28);
  });
});

describe('labelFits', () => {
  it('never labels bubbles under 28 px', () => {
    expect(labelFits('1k', 20)).toBe(false);
  });

  it('labels a 43k hotspot', () => {
    expect(labelFits('43k', 56)).toBe(true);
  });

  it('hides a label too wide for its circle', () => {
    expect(labelFits('9.9k', 28)).toBe(false);
  });
});
