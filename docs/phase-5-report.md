# Phase 5 report: list view, accessibility pass, empty and error states

## Delivered

### List view (`?view=list`)

- Every place with photos in the selected decade, sorted by count (highest first), then name.
- Each row is a button showing name, kind and count, e.g. "Hougang, Planning area, 43,387 photos". It opens the same panel as the map. The open place's row is marked (`aria-pressed`, left bar).
- "Search places" filters by name as you type, ignoring case, spaces and hyphens ("choachu" finds Choa Chu Kang). A live summary reads "55 places with photos from the 1990s" or "1 of 55 places match". No match: "No places match "zzz"".
- Closing the panel returns focus to the row.
- Leaflet is not downloaded if the list is opened first.

### "Default for screen readers"

A web page cannot reliably detect a screen reader, so instead:

- The first focusable element on the page is "Skip to list of places" (visible only when focused). It switches to the list and puts focus in the search field.
- The map region, bubbles and panel are fully usable with a screen reader in their own right.

### States

| State | Map | List |
|---|---|---|
| First load | Decade chips show a pulsing skeleton (still usable); a thin loading bar runs along the top of the map after 300 ms | "Loading places…" |
| Switching decade (not yet cached) | The loading bar; bubbles stay until the new counts arrive, then animate | "Loading places…" is not shown, because rows only change when data arrives |
| Whole decade empty | Card over the map: "No photos from the 1950s yet. Have one? Share it." plus "Show all years" | Same card |
| Load failure | Card: "Sorry, the photo map didn't load. Please check your connection and try again." plus "Try again". Never the raw error | Same, for "the list of places" |

### Accessibility pass

- One visually hidden `h1` ("WP70 Photo Archive: photos by place and decade") for all modes, including embed; `h2` for "Places" and for the open place.
- A polite live region announces results after each decade change, e.g. "55 places with photos from the 1970s." It is silent on first load and never announces a decade with another decade's numbers (a bug found in testing and fixed; see below).
- The page title follows state, e.g. "Hougang, 1990s: WP70 Photo Archive map".
- Focus rings: over the map, a white halo sits inside the blue ring so it stays visible on sea, land and photos.
- Control borders darkened so chips and the search box meet 3:1.
- Touch targets: chips, buttons and list rows are at least 44 px tall (rows are 56 px); bubbles have 44 px hit areas.
- Reduced motion: bubble transitions, the loading bar and skeleton pulses stop.

### Contrast, checked numerically

| Pair | Ratio | Needed |
|---|---|---|
| Body text on white | 17.7 | 4.5 |
| Muted text on white / on hover grey | 7.7 / 7.0 | 4.5 |
| White on dark buttons, chips and planning area bubbles | 14.9 | 4.5 |
| Venue bubble label | 17.7 | 4.5 |
| Thumbnail year badge, worst case over a white photo | 9.3 | 4.5 |
| Focus ring against its white halo | 6.7 | 3 |
| Chip and search box borders (was 2.6, now) | 4.8 | 3 |
| Planning area bubble against OneMap sea / land | 5.9 / 13.8 | 3 |

### Manual test checklist

`docs/manual-test-checklist.md` covers keyboard-only use, VoiceOver on iOS, a 375 px phone, display settings and embed mode. I cannot run VoiceOver on iOS from here, so that section needs doing on a real iPhone.

## Bugs found and fixed in this phase

- **Wrong announcement.** Switching decade briefly announced the new decade's name with the old decade's count. Announcements now use the decade the data belongs to.
- **Low-contrast focus ring over the sea** (2.7:1) and **control borders** (2.6:1). Fixed as above.

## Checks run

- `npm run typecheck`, `npm test` (52 unit tests) and `npm run build` all pass.
- axe-core 4 (WCAG 2.0 and 2.1, A and AA): no violations on desktop map, desktop map with panel open, desktop list with panel open, and phone list.
- Browser checks in Chromium against `wp70`:

| Check | Result |
|---|---|
| First Tab | "Skip to list of places" |
| Skip link, Enter | `?view=list`, focus in "Search places" |
| List | 55 rows, sorted by count |
| Search "choa" | 1 of 55; Tab reaches the row; Enter opens Choa Chu Kang with focus on its heading; Escape returns focus to the row |
| Search "zzz" | "No places match "zzz"." |
| Phone list at 375 px | No sideways scroll |
| Announcement on first load / after 1970s | Silent / "55 places with photos from the 1970s." |
| Empty decade (simulated) | Map card and list card with Share link `/submit?decade=1950`; no bubbles |
| Load failure (simulated HTTP 503 with a technical body) | Friendly message, no raw text; Try again loads 55 bubbles |
| Slow first load (simulated 2.5 s) | Chip skeleton and map loading bar shown; chips usable; skeleton gone after load |
| Console errors | None |
