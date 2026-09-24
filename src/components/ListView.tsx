import { useId, useMemo, useState } from 'react';
import type { PlaceCount } from '../lib/api.ts';
import { decadeLabel, type Decade } from '../lib/decades.ts';
import { filterByName, sortByCount } from '../lib/places.ts';

const numberFormat = new Intl.NumberFormat('en-GB');

/** The skip link moves focus here. */
export const LIST_SEARCH_ID = 'place-search';

interface Props {
  places: PlaceCount[];
  decade: Decade | null;
  selectedId: string | null;
  onSelect: (placeId: string) => void;
}

/**
 * Text alternative to the map: every place with photos in the decade, most
 * photos first, with a name search. Rows open the same panel as the bubbles.
 */
export function ListView({ places, decade, selectedId, onSelect }: Props) {
  const [query, setQuery] = useState('');
  const searchId = LIST_SEARCH_ID;
  const resultsId = useId();
  const sorted = useMemo(() => sortByCount(places), [places]);
  const shown = useMemo(() => filterByName(sorted, query), [sorted, query]);

  return (
    <>
      <div className="list-view__search">
        <label htmlFor={searchId}>Search places</label>
        <input
          id={searchId}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
          spellCheck={false}
          aria-describedby={resultsId}
        />
        <p id={resultsId} className="list-view__summary" aria-live="polite">
          {query.trim()
            ? `${shown.length} of ${places.length} places match`
            : `${places.length} ${places.length === 1 ? 'place' : 'places'} with photos from ${decade === null ? 'all years' : `the ${decadeLabel(decade)}`}`}
        </p>
      </div>
      {shown.length ? (
        <ul className="place-list">
          {shown.map((place) => (
            <li key={place.place_id}>
              <button
                type="button"
                className="place-row"
                data-place={place.place_id}
                aria-pressed={place.place_id === selectedId}
                onClick={() => onSelect(place.place_id)}
              >
                <span className="place-row__name">{place.name}</span>
                <span className="place-row__kind">{place.kind === 'venue' ? 'Venue' : 'Planning area'}</span>
                <span className="place-row__count">
                  {numberFormat.format(place.photo_count)} {place.photo_count === 1 ? 'photo' : 'photos'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="list-view__none">No places match “{query.trim()}”.</p>
      )}
    </>
  );
}
