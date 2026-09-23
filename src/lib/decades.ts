export const DECADES = [1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020] as const;

export type Decade = (typeof DECADES)[number];

export function isDecade(value: number): value is Decade {
  return (DECADES as readonly number[]).includes(value);
}

/** Year range for the counts query. `null` (All years) means no bounds. */
export function decadeRange(decade: Decade | null): { from: number | null; to: number | null } {
  return decade === null ? { from: null, to: null } : { from: decade, to: decade + 9 };
}

export function decadeLabel(decade: Decade | null): string {
  return decade === null ? 'All years' : `${decade}s`;
}
