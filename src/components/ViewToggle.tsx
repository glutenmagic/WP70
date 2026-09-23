import type { View } from '../lib/urlState.ts';
import { Segmented } from './Segmented.tsx';

const OPTIONS: { value: View; label: string }[] = [
  { value: 'map', label: 'Map' },
  { value: 'list', label: 'List' },
];

export function ViewToggle({ value, onChange }: { value: View; onChange: (view: View) => void }) {
  return (
    <Segmented className="view-toggle" name="view" legend="View as" options={OPTIONS} value={value} onChange={onChange} />
  );
}
