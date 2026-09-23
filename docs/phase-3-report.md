# Phase 3 report: bubbles

## Delivered

- One bubble per place returned by `place_photo_counts`, at the place's point, for the selected decade.
- Bubbles are real `<button>` elements with accessible names such as "Hougang, 43,153 photos", and `aria-pressed` for the selected place.
- Radius is proportional to the square root of the count, relative to the largest count on screen, with a 10 px minimum (see the agreed change below).
- Planning areas are solid; venues are white with a dark outline.
- The selected bubble gets a double ring (white, then dark) and sits above all others. The keyboard focus ring is a separate blue outline outside it.
- Size changes animate over 300 ms when the decade changes. Bubbles for places that drop out shrink and fade; new ones grow in. With `prefers-reduced-motion`, changes are instant.
- Selecting a bubble (tap, click, or Enter or Space) sets `?place=<id>` with a new history entry, so the back button undoes it. The panel arrives in Phase 4.
- Counts are cached per decade for the session. After the first load, the other eight decades are fetched in the background, one at a time when the browser is idle, so every chip change is served from memory.
- Minimal loading and error states over the map: "Loading photos…" appears only if loading takes over 300 ms, and an error offers "Try again". Phase 5 finishes these.

## Agreed change from the spec: bubble size and labels

With all 55 places on a 375 px phone, bubbles at the spec's 10 to 40 px overlap so much that the biggest hotspots are buried and their labels cannot be read. Agreed design:

| Zoom | Largest radius |
|---|---|
| 10 (phone island overview) | 28 px |
| 11 (desktop island overview) | 34 px |
| 12 and closer | 40 px (the spec's full range) |

- Bubbles are always circles. A count label shows only on bubbles at least 28 px across, and only when it fits inside the circle, so label text always sits on the bubble fill (white on #27272a, 14.9:1). Smaller bubbles are plain dots.
- The full count is always in the bubble's accessible name, and will be in the list view and panel.
- Stacking order: selected on top; then labelled bubbles, largest on top, so the biggest counts stay readable; then dots, smallest on top, so more of each stays visible.

## Touch targets

Every bubble has an invisible hit area of at least 44 by 44 px, in a map layer below all visible bubbles. A tap on any visible bubble always selects that bubble; the extra area only catches taps on empty map next to a small bubble. (A first version put the extra area on top, which let a small neighbour steal taps aimed at Hougang.)

## Keyboard order

Bubbles follow reading order: north to south in bands about 3.3 km tall, west to east within each band. The order is kept when the decade changes. Focusing a bubble near the edge pans the map to show it.

## Checks run

- `npm run typecheck`, `npm test` (44 unit tests) and `npm run build` all pass.
- Browser checks in Chromium against the `wp70` project:

| Check | Result |
|---|---|
| Bubbles shown (All years) | 55 |
| Visible diameters at the phone overview | 20 to 56 px |
| Smallest touch target | 44 px |
| Requests at startup | 9 (All years plus 8 decades in the background) |
| Requests when switching to the 1960s | 0 (served from cache) |
| Tap on a bubble | Sets `?place=` |
| Tap on empty map 18 px from a small dot | Selects that dot |
| Tab order | Header, decade chips, Map / List, map, then bubbles in reading order |
| Enter on a focused bubble | Selects it |
| `prefers-reduced-motion` | Transition duration 0 s |
| Console errors | None |

## Network note

From this build environment, calls to Supabase took 0.5 to 1 s, because they cross from a US data centre to Singapore and through a proxy. The response is 1.6 KB gzipped. The 500 ms acceptance target will be measured from Singapore on the live preview in Phase 6.
