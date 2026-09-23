# Phase 2 report: map shell

## Delivered

- Vite + React + TypeScript app. The map lives at `/map`, and `/` redirects there keeping the query string (`public/_redirects` on Cloudflare Pages, and in the app for the dev server).
- OneMap Default basemap in Leaflet, with the required OneMap logo and attribution.
- The map is locked to Singapore, and the initial view shows the whole island at every screen size down to 375 px wide.
- Decade chips (All years, 1950s to 2020s) and a Map / List toggle, both built on native radio buttons.
- URL state: `?decade=1990`, `?place=hougang` and `?view=list`. These are shareable, restored on load, and invalid values are cleaned from the URL. Other parameters such as `embed=1` are kept.
- Slim header ("WP70 Photo Archive" and "Share a photo") and a one-line footer, both hidden with `?embed=1`. The footer is hidden in mobile map view.
- `src/styles/tokens.css` holds every colour, radius, font and size, all as neutral placeholders.
- Leaflet and its CSS are a separate chunk (44 KB JS and 6 KB CSS, gzipped), downloaded only when the map view is shown.

## OneMap details, checked against official sources on 23 September 2026

| Item | Value | Source |
|---|---|---|
| Tile URL | `https://www.onemap.gov.sg/maps/tiles/Default/{z}/{x}/{y}.png` with `detectRetina: true` | https://www.onemap.gov.sg/docs/maps/ |
| Zoom range | 11 to 19 | Official TileJSON and Leaflet example |
| Tile coverage | 1.16 to 1.56073 N, 103.502 to 104.11475 E | Official TileJSON |
| Attribution | OneMap logo (20 by 20 px), "OneMap © contributors \| Singapore Land Authority", both linked | `resources/code-attr.txt` on the docs page |

The attribution string in `src/map/onemap.ts` is copied verbatim and marked "DO NOT REMOVE".

## Spec conflict: zoom range and a 375 px screen

At OneMap's minimum zoom of 11, Singapore is about 700 px wide, so the whole island cannot fit a 375 px screen using only OneMap's zoom range.

What I built: the map may go one level below OneMap's range, to zoom 10, only when the screen is too narrow to show the island otherwise. At that level Leaflet shows OneMap's zoom 11 tiles at exactly half size (`minNativeZoom`), so no tile outside OneMap's range is ever requested. The browser check confirmed only zoom 11 tiles were requested on phone and desktop. On a 2x phone screen, half-size tiles are still one tile pixel per screen pixel, so they stay sharp. The map never zooms out further than the view that shows the whole island.

The alternative is to keep zoom 11 as a hard floor and accept that a phone initially shows only part of the island.

## Other decisions

- Whole zoom steps only. Quarter steps fitted slightly tighter but left visible seams between scaled tiles on desktop.
- The panning limit is Singapore's land extent (from the URA boundaries) plus about 3 to 5 km.
- Areas outside OneMap's tile coverage show OneMap's own sea colour (`--color-map-background`), so there are no grey bands.
- `?view=list` is in the URL as well as decade and place, so a list view link can be shared too.
- The List view shows a placeholder until Phase 5.
- `VITE_MAIN_SITE_URL` (optional) sets the Webflow link for the header title and the footer links. Until it is set, the title links to `/map` and the footer shows no links.

## Checks run

- `npm run typecheck`, `npm test` (21 URL-state unit tests) and `npm run build` all pass.
- Browser checks in Chromium on the production build:

| Check | Result |
|---|---|
| OneMap tile zoom levels requested (phone 1x, phone 2x, desktop) | 11 only, no failures |
| Sideways scrolling at 375 px | None (page width is 375) |
| Attribution present | Yes |
| `?decade=1990&place=hougang` | 1990s chip selected, place kept |
| Tab order | Title, Share, decade chips, Map / List, map, zoom buttons |
| Arrow keys on the chips | Change the decade and the URL |
| `?decade=1995&place=Bad!&embed=1` | Cleaned to `/map?embed=1`, header hidden |
| `/?decade=1960` | Redirected to `/map?decade=1960` |
| `/map?view=list` on first load | No Leaflet download |

## Dependencies added

- Runtime: `react`, `react-dom` and `leaflet` (1.9.4, the stable release).
- Dev only: `vite`, `@vitejs/plugin-react`, `vitest`, and types for React and Leaflet.
- No router and no `react-leaflet`: one route plus a redirect does not need a router, and a thin Leaflet wrapper is enough.
