import { describe, expect, it } from 'vitest';
import { parseState, serializeState } from './urlState.ts';

describe('parseState', () => {
  it('defaults to All years, no place, map view', () => {
    expect(parseState('')).toEqual({ decade: null, place: null, view: 'map' });
  });

  it('reads a valid decade, place and view', () => {
    expect(parseState('?decade=1990&place=hougang&view=list')).toEqual({
      decade: 1990,
      place: 'hougang',
      view: 'list',
    });
  });

  it.each(['1995', '1940', '2030', 'abc', '1990.0', '01990', ''])('ignores invalid decade %j', (value) => {
    expect(parseState(`?decade=${value}`).decade).toBeNull();
  });

  it.each(['Hougang', 'hougang!', '-hougang', 'a--b', '<script>', 'x'.repeat(65)])('ignores invalid place %j', (value) => {
    expect(parseState(`?place=${encodeURIComponent(value)}`).place).toBeNull();
  });

  it('accepts multi-word slugs', () => {
    expect(parseState('?place=serangoon-stadium').place).toBe('serangoon-stadium');
  });

  it('treats unknown views as map', () => {
    expect(parseState('?view=grid').view).toBe('map');
  });
});

describe('serializeState', () => {
  it('omits defaults', () => {
    expect(serializeState({ decade: null, place: null, view: 'map' })).toBe('');
  });

  it('writes non-default values', () => {
    expect(serializeState({ decade: 1990, place: 'hougang', view: 'list' })).toBe(
      '?decade=1990&place=hougang&view=list',
    );
  });

  it('keeps unrelated parameters such as embed', () => {
    expect(serializeState({ decade: 2010, place: null, view: 'map' }, '?embed=1&decade=1990&place=bedok')).toBe(
      '?embed=1&decade=2010',
    );
  });

  it('round-trips', () => {
    const state = { decade: 1960 as const, place: 'toa-payoh', view: 'map' as const };
    expect(parseState(serializeState(state))).toEqual(state);
  });
});
