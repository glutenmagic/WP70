# Decisions

Agreed answers to open questions in the live map spec.

| # | Topic | Decision |
|---|---|---|
| 1 | Map route | The map lives at `/map`. `/` redirects to `/map` and keeps the query string (Cloudflare Pages `_redirects`). |
| 2 | "Share it" link | `/submit?place=<id>&decade=<decade>`, held in one config constant. In embed mode it opens in the full browser window (`target="_top"`), not inside the iframe. |
| 3 | Header and footer | Slim header (about 48 px): "WP70 Photo Archive" text linking to the Webflow site, plus a "Share a photo" button. One-line footer with a main-site link and placeholder Privacy and Terms links, shown under list view and as a thin bar on desktop, left out of mobile map view. Both are hidden by `?embed=1`. No logo or brand colours until supplied. |
| 4 | Selected place with no photos in the new decade | The panel stays open with "No photos from <Place> in the <decade> yet. Have one? Share it." and a "Show all years" button. The place stays in the URL and focus does not move. The bubble is hidden for that decade. |
| 5 | Cloudflare Pages | The owner connects the repo through the Cloudflare dashboard (Pages, Connect to Git). Build settings, public environment variables and the DNS record are supplied in Phase 6. |

| 6 | Phone zoom | On screens too narrow for the whole island at zoom 11, the map shows OneMap's zoom 11 tiles at half size (zoom 10). No tiles outside OneMap's 11 to 19 range are requested. |
| 7 | Decade prefetch | After the first load, the other decades are fetched in the background and cached for the session. |
| 8 | Bubble size and labels | Largest radius 28 px at zoom 10, 34 px at zoom 11, 40 px from zoom 12. Counts show only inside circles of 28 px or more; smaller bubbles are dots. Full counts are always in the accessible name. |

## Phase 1 data choices

- The migration creates a minimal `photos` table. The submission spec extends it.
- All 55 URA planning areas are seeded as active.
- Fake photos may be seeded into the `wp70` project. Remove them with `npm run db:clean-fake` before launch.
