import { DECADES, decadeLabel, type Decade } from '../lib/decades.ts';
import { Segmented } from './Segmented.tsx';

const OPTIONS = [null, ...DECADES].map((decade) => ({ value: decade, label: decadeLabel(decade) }));

export function DecadeFilter({
  value,
  onChange,
  loading = false,
}: {
  value: Decade | null;
  onChange: (decade: Decade | null) => void;
  /** First load: chips show a skeleton shimmer but stay usable. */
  loading?: boolean;
}) {
  return (
    <Segmented
      className={`decade-filter${loading ? ' is-loading' : ''}`}
      name="decade"
      legend="Show photos from"
      options={OPTIONS}
      value={value}
      onChange={onChange}
    />
  );
}
