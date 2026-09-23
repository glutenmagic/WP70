import { DECADES, decadeLabel, type Decade } from '../lib/decades.ts';
import { Segmented } from './Segmented.tsx';

const OPTIONS = [null, ...DECADES].map((decade) => ({ value: decade, label: decadeLabel(decade) }));

export function DecadeFilter({ value, onChange }: { value: Decade | null; onChange: (decade: Decade | null) => void }) {
  return (
    <Segmented
      className="decade-filter"
      name="decade"
      legend="Show photos from"
      options={OPTIONS}
      value={value}
      onChange={onChange}
    />
  );
}
