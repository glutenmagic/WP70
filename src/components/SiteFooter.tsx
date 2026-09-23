import { MAIN_SITE_URL } from '../config.ts';

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <span>WP70 Photo Archive</span>
      {MAIN_SITE_URL && (
        <ul>
          <li>
            <a href={MAIN_SITE_URL}>Main site</a>
          </li>
          <li>
            <a href={`${MAIN_SITE_URL.replace(/\/$/, '')}/privacy`}>Privacy</a>
          </li>
          <li>
            <a href={`${MAIN_SITE_URL.replace(/\/$/, '')}/terms`}>Terms</a>
          </li>
        </ul>
      )}
    </footer>
  );
}
