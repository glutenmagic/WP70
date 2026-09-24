# Manual test checklist: live map

Run before each release, on the live preview URL. Tick each item, note the device, browser and date, and record any failure with a screenshot.

Useful links (replace the host):

- Map: `/map`
- Deep link: `/map?decade=1990&place=hougang`
- List: `/map?view=list`
- Embed: `/map?embed=1`

## 1. Keyboard only (desktop: Chrome, Safari or Firefox; mouse unplugged or untouched)

- [ ] First Tab shows "Skip to list of places" at the top left. Enter switches to the list and puts the cursor in "Search places".
- [ ] Without the skip link, Tab order is: site title, Share a photo, decade chips, Map / List, map, bubbles, zoom buttons, attribution links.
- [ ] Every focused element has a clearly visible focus ring, including bubbles over the sea and the zoom buttons.
- [ ] Left and Right arrows move between decade chips and change the map straight away. The URL updates (`?decade=1990`).
- [ ] Left and Right arrows switch Map and List.
- [ ] Tabbing through bubbles goes roughly north to south, west to east. The map pans to show a focused bubble near an edge.
- [ ] Enter or Space on a bubble opens the panel, and focus moves to the place name.
- [ ] Tab from the panel heading reaches the close button, then the thumbnails area and "View all photos".
- [ ] Escape closes the panel and focus returns to the same bubble.
- [ ] In the list: typing filters places; Tab reaches the rows; Enter opens the panel; Escape returns focus to the row.
- [ ] With a place open, pick a decade with no photos for it: the message and "Show all years" appear, and "Show all years" works by keyboard.
- [ ] The browser Back button closes an open panel.

## 2. VoiceOver on iOS (iPhone, Safari)

Turn on: Settings, Accessibility, VoiceOver. Swipe right to move forward, double tap to activate.

- [ ] The first item read is "Skip to list of places, link". Double tap opens the list and VoiceOver lands on "Search places, search field".
- [ ] Decade chips are read as radio buttons with their state, e.g. "1990s, radio button, 5 of 9, selected".
- [ ] After choosing a decade, VoiceOver announces e.g. "55 places with photos from the 1990s".
- [ ] List rows read as e.g. "Hougang, Planning area, 43,387 photos, button". Double tap opens the panel.
- [ ] On the map, swiping reaches bubbles read as e.g. "Hougang, 43,387 photos, toggle button".
- [ ] In the panel, the heading is read first, then kind and count, then "Close Hougang, button".
- [ ] Thumbnails are read with their caption, year and credit.
- [ ] Empty decade: "No photos from the 1950s yet. Have one? Share it." is read, and "Share it" is a link.
- [ ] With the network off (Airplane mode) and a decade not yet loaded: an alert is read, "Sorry, the photo map didn't load…", with a "Try again" button. No technical error text.
- [ ] Rotor, Headings: "WP70 Photo Archive: photos by place and decade" (level 1), then "Places" or the place name (level 2).

## 3. Phone at 375 px wide (iPhone SE or a browser's device mode at 375 by 667)

- [ ] No sideways scrolling anywhere, on map, list or panel.
- [ ] The whole island is visible when the map first loads.
- [ ] The decade chip row scrolls sideways and fades at the right edge; Map / List stays pinned on the right.
- [ ] Every button, chip, row and bubble is easy to tap; small bubbles respond to a tap slightly outside the dot.
- [ ] Tapping a bubble opens the bottom sheet over the lower half; the whole island still fits above it.
- [ ] The sheet scrolls on its own to reach "View all photos"; the map does not move while scrolling the sheet.
- [ ] Tapping the map above the sheet closes it.
- [ ] Thumbnails keep square boxes while loading; nothing jumps.
- [ ] Pinch to zoom on the map works; zooming shows the counts on more bubbles.
- [ ] Rotate to landscape and back: map, sheet and chips still fit.
- [ ] The footer is hidden in map view and shown under the list.

## 4. Display settings

- [ ] Reduce Motion on (iOS: Accessibility, Motion): bubbles change size instantly, and loading placeholders do not pulse.
- [ ] Text size at 200% (browser zoom on desktop): no text is cut off or overlapping in the header, chips, list or panel.

## 5. Embed (inside the Webflow page)

- [ ] `?embed=1` hides the header and footer.
- [ ] "View all photos" and "Share it" open in the full browser window, not inside the iframe.
- [ ] Links from the Webflow illustrated map (`?decade=…&place=…`) open the right decade and place.

## Automated checks already run in development

- axe-core (WCAG 2.0 and 2.1, A and AA) on desktop map, desktop map with panel, desktop list with panel, and phone list: no violations.
- Contrast of every token colour pair checked numerically; see `docs/phase-5-report.md`.
