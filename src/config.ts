import type { Decade } from './lib/decades.ts';

/** The Webflow marketing site. Unset until the domain is confirmed. */
export const MAIN_SITE_URL: string | null = import.meta.env.VITE_MAIN_SITE_URL || null;

/** Submission page (separate spec). Change here if its route changes. */
export const SUBMIT_PATH = '/submit';

export function submitUrl(context: { place?: string | null; decade?: Decade | null } = {}): string {
  const params = new URLSearchParams();
  if (context.place) params.set('place', context.place);
  if (context.decade) params.set('decade', String(context.decade));
  const query = params.toString();
  return query ? `${SUBMIT_PATH}?${query}` : SUBMIT_PATH;
}

/** ?embed=1: running inside the Webflow iframe. */
export function isEmbedded(search = window.location.search): boolean {
  return new URLSearchParams(search).get('embed') === '1';
}
