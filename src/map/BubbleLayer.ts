import L from 'leaflet';
import type { PlaceCount } from '../lib/api.ts';
import {
  bubbleLabel,
  bubbleRadius,
  formatCount,
  labelFits,
  labelFontSize,
  MAX_RADIUS,
  maxRadiusForZoom,
  readingOrder,
} from '../lib/bubbles.ts';

// One persistent marker per place. Each marker's icon is a zero-size anchor
// holding a real <button>, so bubbles are focusable, have accessible names,
// and can animate size changes with CSS when the decade changes.
//
// Touch targets: each place also gets an invisible hit area of at least
// 44 px in a pane *below* all visible bubbles. A tap on any visible bubble
// always selects that bubble; the extra area only catches taps on the empty
// map around a small bubble.

const LEAVE_MS = 300;
const HIT_PANE = 'bubbleHits';

interface Entry {
  marker: L.Marker;
  hit: L.Marker;
  button: HTMLButtonElement;
  hitArea: HTMLDivElement;
  label: HTMLSpanElement;
  place: PlaceCount;
  leaveTimer?: number;
}

export class BubbleLayer {
  private readonly entries = new Map<string, Entry>();
  private order = '';
  private last: { places: PlaceCount[]; selectedId: string | null } | null = null;
  private readonly onZoom = () => {
    if (this.last) this.update(this.last.places, this.last.selectedId, false);
  };

  constructor(
    private readonly map: L.Map,
    private readonly onSelect: (placeId: string) => void,
  ) {
    if (!map.getPane(HIT_PANE)) {
      // Just under Leaflet's marker pane (z-index 600).
      map.createPane(HIT_PANE).style.zIndex = '590';
    }
    map.on('zoomend', this.onZoom);
  }

  update(places: PlaceCount[], selectedId: string | null, animate: boolean): void {
    this.last = { places, selectedId };
    const maxCount = places.reduce((m, p) => Math.max(m, p.photo_count), 0);
    const maxRadius = maxRadiusForZoom(this.map.getZoom());
    const seen = new Set<string>();

    for (const place of places) {
      seen.add(place.place_id);
      let entry = this.entries.get(place.place_id);
      const isNew = !entry;
      if (!entry) entry = this.create(place);
      else if (entry.leaveTimer !== undefined) this.cancelLeave(entry);
      entry.place = place;

      const radius = bubbleRadius(place.photo_count, maxCount, maxRadius);
      const selected = place.place_id === selectedId;
      const { button, hitArea, label, marker, hit } = entry;
      button.dataset.kind = place.kind;
      button.classList.toggle('is-selected', selected);
      button.setAttribute('aria-pressed', String(selected));
      button.setAttribute('aria-label', bubbleLabel(place.name, place.photo_count));
      const text = formatCount(place.photo_count);
      const labelled = labelFits(text, radius * 2);
      label.textContent = text;
      // The count shows only when it fits inside the circle; the full count
      // is always in the accessible name.
      label.hidden = !labelled;
      button.style.setProperty('--font-size', `${labelFontSize(radius * 2)}px`);
      // Stacking: selected on top, then labelled bubbles, largest first, so
      // the biggest counts stay readable; then unlabelled dots, smallest
      // first, so more of each dot stays visible and tappable.
      const zOffset =
        (labelled ? 10_000 + Math.round(radius * 100) : Math.round((MAX_RADIUS - radius) * 100)) +
        (selected ? 100_000 : 0);
      marker.setZIndexOffset(zOffset);
      hit.setZIndexOffset(zOffset);

      const diameter = `${radius * 2}px`;
      hitArea.style.setProperty('--d', diameter);
      if (isNew && animate) {
        // Grow in from nothing on the next frame so the transition runs.
        button.style.setProperty('--d', '0px');
        requestAnimationFrame(() => requestAnimationFrame(() => button.style.setProperty('--d', diameter)));
      } else {
        button.style.setProperty('--d', diameter);
      }
    }

    for (const [id, entry] of this.entries) {
      if (!seen.has(id) && entry.leaveTimer === undefined) this.leave(id, entry, animate);
    }

    this.applyReadingOrder(places);
  }

  destroy(): void {
    this.map.off('zoomend', this.onZoom);
    for (const entry of this.entries.values()) {
      if (entry.leaveTimer !== undefined) window.clearTimeout(entry.leaveTimer);
      entry.marker.remove();
      entry.hit.remove();
    }
    this.entries.clear();
  }

  private create(place: PlaceCount): Entry {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'bubble';
    // Lets the panel return focus here when it closes.
    button.dataset.place = place.place_id;
    const label = document.createElement('span');
    label.className = 'bubble__count';
    label.setAttribute('aria-hidden', 'true');
    button.append(label);

    const anchor = document.createElement('div');
    anchor.append(button);

    const marker = L.marker([place.lat, place.lng], {
      icon: L.divIcon({ html: anchor, className: 'bubble-anchor', iconSize: [0, 0] }),
      interactive: false,
      keyboard: false,
    }).addTo(this.map);

    const hitArea = document.createElement('div');
    hitArea.className = 'bubble-hit';
    hitArea.setAttribute('aria-hidden', 'true');
    const hitAnchor = document.createElement('div');
    hitAnchor.append(hitArea);
    const hit = L.marker([place.lat, place.lng], {
      icon: L.divIcon({ html: hitAnchor, className: 'bubble-anchor', iconSize: [0, 0] }),
      interactive: false,
      keyboard: false,
      pane: HIT_PANE,
    }).addTo(this.map);

    for (const el of [button, hitArea]) {
      L.DomEvent.disableClickPropagation(el);
      el.addEventListener('click', () => this.onSelect(place.place_id));
    }
    button.addEventListener('focus', () => {
      const entry = this.entries.get(place.place_id);
      if (entry) this.map.panInside(entry.marker.getLatLng(), { padding: [MAX_RADIUS + 12, MAX_RADIUS + 12] });
    });

    const entry: Entry = { marker, hit, button, hitArea, label, place };
    this.entries.set(place.place_id, entry);
    return entry;
  }

  private leave(id: string, entry: Entry, animate: boolean): void {
    entry.button.tabIndex = -1;
    entry.button.setAttribute('aria-hidden', 'true');
    entry.button.classList.add('is-leaving');
    entry.button.style.setProperty('--d', '0px');
    entry.hit.remove();
    const remove = () => {
      entry.marker.remove();
      this.entries.delete(id);
    };
    if (animate) entry.leaveTimer = window.setTimeout(remove, LEAVE_MS);
    else remove();
  }

  private cancelLeave(entry: Entry): void {
    window.clearTimeout(entry.leaveTimer);
    entry.leaveTimer = undefined;
    entry.hit.addTo(this.map);
    entry.button.removeAttribute('tabindex');
    entry.button.removeAttribute('aria-hidden');
    entry.button.classList.remove('is-leaving');
  }

  /** Keeps DOM order (and so Tab order) in reading order: north to south, west to east. */
  private applyReadingOrder(places: PlaceCount[]): void {
    const ordered = readingOrder(places);
    const key = ordered.map((p) => p.place_id).join(',');
    if (key === this.order) return;
    this.order = key;
    const pane = this.map.getPane('markerPane');
    if (!pane) return;
    for (const place of ordered) {
      const el = this.entries.get(place.place_id)?.marker.getElement();
      if (el) pane.append(el);
    }
  }
}
