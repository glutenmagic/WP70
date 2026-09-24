import { useEffect, useRef } from 'react';
import { submitUrl } from '../config.ts';
import { PREVIEW_LIMIT, type PlaceCount } from '../lib/api.ts';
import { decadeLabel, type Decade } from '../lib/decades.ts';
import type { PreviewState } from '../lib/usePreview.ts';

interface Props {
  place: PlaceCount;
  count: number;
  decade: Decade | null;
  preview: PreviewState & { retry: () => void };
  embedded: boolean;
  /** Move focus to the panel heading when it opens (true when opened by the user). */
  focusOnOpen: boolean;
  onClose: () => void;
  onShowAllYears: () => void;
}

const numberFormat = new Intl.NumberFormat('en-GB');

export function archiveUrl(placeId: string, decade: Decade | null): string {
  const params = new URLSearchParams({ place: placeId });
  if (decade !== null) params.set('decade', String(decade));
  return `/archive?${params}`;
}

function countLine(count: number, decade: Decade | null): string {
  const photos = `${numberFormat.format(count)} ${count === 1 ? 'photo' : 'photos'}`;
  return decade === null ? `${photos}, all years` : `${photos} from the ${decadeLabel(decade)}`;
}

export function PlacePanel({ place, count, decade, preview, embedded, focusOnOpen, onClose, onShowAllYears }: Props) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const linkTarget = embedded ? '_top' : undefined;

  useEffect(() => {
    if (focusOnOpen) headingRef.current?.focus();
  }, [place.place_id, focusOnOpen]);

  return (
    <section className="place-panel" aria-labelledby="place-panel-title">
      <header className="place-panel__header">
        <div>
          <h2 id="place-panel-title" className="place-panel__title" ref={headingRef} tabIndex={-1}>
            {place.name}
          </h2>
          <p className="place-panel__meta">
            {place.kind === 'venue' ? 'Venue' : 'Planning area'}
            {count > 0 && (
              <>
                <span aria-hidden="true"> · </span>
                <span className="visually-hidden">, </span>
                {countLine(count, decade)}
              </>
            )}
          </p>
        </div>
        <button type="button" className="icon-button" onClick={onClose} aria-label={`Close ${place.name}`}>
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </header>

      <div className="place-panel__body">
        {count === 0 ? (
          <div className="place-panel__empty">
            <p>
              No photos from {place.name} in the {decadeLabel(decade)} yet. Have one?{' '}
              <a href={submitUrl({ place: place.place_id, decade })} target={linkTarget}>
                Share it
              </a>
              .
            </p>
            <button type="button" className="button button--secondary" onClick={onShowAllYears}>
              Show all years
            </button>
          </div>
        ) : (
          <>
            <PreviewGrid preview={preview} expected={Math.min(count, PREVIEW_LIMIT)} placeName={place.name} />
            <a className="button place-panel__all" href={archiveUrl(place.place_id, decade)} target={linkTarget}>
              View all photos
            </a>
          </>
        )}
      </div>
    </section>
  );
}

function PreviewGrid({
  preview,
  expected,
  placeName,
}: {
  preview: PreviewState & { retry: () => void };
  expected: number;
  placeName: string;
}) {
  if (preview.status === 'error') {
    return (
      <div className="place-panel__error" role="alert">
        <p>Sorry, the photos didn’t load.</p>
        <button type="button" className="button button--secondary" onClick={preview.retry}>
          Try again
        </button>
      </div>
    );
  }

  if (preview.status !== 'ready') {
    return (
      <ul className="thumb-grid" aria-busy="true" aria-label={`Loading photos of ${placeName}`}>
        {Array.from({ length: expected }, (_, i) => (
          <li key={i} className="thumb thumb--placeholder" />
        ))}
      </ul>
    );
  }

  return (
    <ul className="thumb-grid" aria-label={`Photos of ${placeName}`}>
      {preview.photos.map((photo) => (
        <li key={photo.id} className="thumb">
          <figure>
            <img
              src={photo.thumb_url}
              alt={photo.caption || `Photo of ${placeName}`}
              loading="lazy"
              decoding="async"
              width="160"
              height="160"
            />
            <figcaption>
              <span className="thumb__year">{photo.year ?? 'Year unknown'}</span>
              {photo.credit_name && <span className="visually-hidden">, photo by {photo.credit_name}</span>}
            </figcaption>
          </figure>
        </li>
      ))}
    </ul>
  );
}
