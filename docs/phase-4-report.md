# Phase 4 report: place panel and preview grid

## Delivered

- Selecting a place (bubble tap or click, or Enter or Space on a focused bubble) opens the place panel: a side panel 380 px wide on screens wider than 768 px, a bottom sheet taking half the map area below that.
- Panel contents:
  - place name
  - kind (Planning area or Venue)
  - the photo count for the current decade, e.g. "328 photos from the 1990s" or "2,316 photos, all years"
  - a 3-column grid of up to 12 approved thumbnails from `place_photo_preview`
  - a "View all photos" button linking to `/archive?place=<id>&decade=<decade>` (decade left out for All years)
- Thumbnails sit in fixed square boxes (`aspect-ratio: 1`, `object-fit: cover`), so nothing shifts as images arrive. They use `loading="lazy"` and `decoding="async"`, and show a year badge. Pulsing placeholders show while loading (static with reduced motion).
- Previews are cached per place and decade for the session.
- Close by the close button, the Escape key, or a tap or click on the map.
- Focus: opening from a bubble moves focus to the panel heading, and closing returns it to that bubble. A deep link restores the panel without moving focus.
- Decade change to a decade with no photos for the open place (decision 4): the panel stays open with "No photos from Bedok in the 1950s yet. Have one? Share it." and a "Show all years" button. The place stays in the URL; the bubble is hidden for that decade.
- `?place=<id>` restores the panel on load. An id that matches no place with approved photos is dropped from the URL.
- The back button closes the panel (opening and closing each add a history entry).
- In embed mode, "View all photos" and "Share it" open in the top-level window, not inside the iframe.

## Design decision: the panel sits beside the map, not over it

At the island overview the map cannot pan (the view is already larger than the Singapore panning limit), so a panel laid over the map would permanently hide the places beneath it: Changi and Tampines on desktop, the south coast on phones. Instead, the panel takes its own space and the map shrinks. Leaflet is told about the new size, and the selected place is kept in view.

On a 375 by 667 phone the map and sheet are 279 px tall each, and all 55 bubbles still fit fully in the smaller map.

## For you to decide later

- **Photo credits.** Each thumbnail's credit is read out by screen readers ("photo by …") but is not shown on screen, because a 110 px tile has no room for it. If credits must be visible wherever a photo appears, options are a credit line under each tile (the grid gets taller) or a credit shown when a photo is opened on the archive page.
- **Thumbnails do not link anywhere yet.** The spec only asks for "View all photos". They could link to each photo on the archive page once that exists.

## Checks run

- `npm run typecheck`, `npm test` (46 unit tests) and `npm run build` all pass.
- Browser checks in Chromium against `wp70`:

| Check | Result |
|---|---|
| Click Tuas (1990s) | Panel "Tuas / Planning area, 328 photos from the 1990s", focus on heading |
| Thumbnails | 12, all 110 by 110 px boxes, `loading="lazy"` |
| View all photos | `/archive?place=tuas&decade=1990` |
| Escape | Panel closes, focus returns to the Tuas bubble |
| Keyboard: Enter on Bedok, Tab, Enter | Opens; Tab reaches "Close Bedok"; closing returns focus to Bedok |
| Phone 375 px: map / sheet heights | 279 / 279 px; 55 of 55 bubbles fully visible; no sideways scroll |
| Phone: tap on the map | Panel closes |
| Deep link `?decade=1990&place=hougang` | Panel restored, Hougang selected, focus not moved |
| Empty decade (simulated by removing Bedok from the 1950s response) | Panel stays open with the message; Share link `/submit?place=bedok&decade=1950`; bubble hidden; "Show all years" restores photos and keeps focus in the panel |
| `?place=nowhere-town` | Dropped from the URL |
| Back button after opening | Panel closes |
| `?embed=1` | Panel links use `target="_top"` |
| Console errors | None |

The fake data has photos for every place in every decade, so the empty-decade case was tested by intercepting the counts response in the browser.
