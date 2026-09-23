import type { Decade } from './lib/decades.ts';

// Supabase project `wp70`. Both values are public by design: the key is a
// publishable key, and the database only exposes the two map functions to it.
export const SUPABASE_URL: string = import.meta.env.VITE_SUPABASE_URL || 'https://fuwglxpmyytybaxdouyl.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY: string =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_W78waMWRnP8r7rvYrbC_6g_QJon8eUz';

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
