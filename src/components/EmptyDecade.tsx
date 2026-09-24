import { submitUrl } from '../config.ts';
import { decadeLabel, type Decade } from '../lib/decades.ts';

/** Shown when no place has approved photos in the selected decade. */
export function EmptyDecade({
  decade,
  embedded,
  onShowAllYears,
}: {
  decade: Decade | null;
  embedded: boolean;
  onShowAllYears: () => void;
}) {
  return (
    <div className="state-card">
      <p>
        {decade === null ? 'No photos yet.' : `No photos from the ${decadeLabel(decade)} yet.`} Have one?{' '}
        <a href={submitUrl({ decade })} target={embedded ? '_top' : undefined}>
          Share it
        </a>
        .
      </p>
      {decade !== null && (
        <button type="button" className="button button--secondary" onClick={onShowAllYears}>
          Show all years
        </button>
      )}
    </div>
  );
}

/** Friendly load failure with a retry. Never shows raw error text. */
export function LoadError({ what, onRetry }: { what: string; onRetry: () => void }) {
  return (
    <div className="state-card" role="alert">
      <p>Sorry, {what} didn’t load. Please check your connection and try again.</p>
      <button type="button" className="button" onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}
