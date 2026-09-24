import { describe, expect, it } from 'vitest';
import type { PlaceCount } from './api.ts';
import { filterByName, sortByCount } from './places.ts';

const place = (place_id: string, name: string, photo_count: number): PlaceCount => ({
  place_id,
  name,
  kind: 'planning_area',
  lat: 1.35,
  lng: 103.8,
  photo_count,
});

const places = [
  place('bedok', 'Bedok', 15_000),
  place('choa-chu-kang', 'Choa Chu Kang', 2_800),
  place('hougang', 'Hougang', 43_000),
  place('ang-mo-kio', 'Ang Mo Kio', 2_800),
];

describe('sortByCount', () => {
  it('orders by count, highest first, then by name', () => {
    expect(sortByCount(places).map((p) => p.place_id)).toEqual(['hougang', 'bedok', 'ang-mo-kio', 'choa-chu-kang']);
  });

  it('does not change the input', () => {
    sortByCount(places);
    expect(places[0].place_id).toBe('bedok');
  });
});

describe('filterByName', () => {
  it('returns everything for an empty query', () => {
    expect(filterByName(places, '  ')).toHaveLength(4);
  });

  it('matches part of a name, ignoring case', () => {
    expect(filterByName(places, 'GANG').map((p) => p.place_id)).toEqual(['hougang']);
  });

  it('ignores spaces and hyphens', () => {
    expect(filterByName(places, 'choachu').map((p) => p.place_id)).toEqual(['choa-chu-kang']);
    expect(filterByName(places, 'ang-mo').map((p) => p.place_id)).toEqual(['ang-mo-kio']);
  });

  it('returns nothing when no name matches', () => {
    expect(filterByName(places, 'zzz')).toEqual([]);
  });
});
