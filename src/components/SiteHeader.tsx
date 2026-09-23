import { MAIN_SITE_URL, submitUrl } from '../config.ts';
import type { Decade } from '../lib/decades.ts';

export function SiteHeader({ place, decade }: { place: string | null; decade: Decade | null }) {
  return (
    <header className="site-header">
      <a className="site-header__title" href={MAIN_SITE_URL ?? '/map'}>
        WP70 Photo Archive
      </a>
      <a className="button" href={submitUrl({ place, decade })}>
        Share a photo
      </a>
    </header>
  );
}
