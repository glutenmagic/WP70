import { describe, expect, it } from 'vitest';
import { archiveUrl } from './PlacePanel.tsx';

describe('archiveUrl', () => {
  it('includes place and decade', () => {
    expect(archiveUrl('hougang', 1990)).toBe('/archive?place=hougang&decade=1990');
  });

  it('omits decade for All years', () => {
    expect(archiveUrl('serangoon-stadium', null)).toBe('/archive?place=serangoon-stadium');
  });
});
