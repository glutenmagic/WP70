import { useEffect, useRef } from 'react';

interface Option<T> {
  value: T;
  label: string;
}

interface Props<T> {
  name: string;
  legend: string;
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

/**
 * A row of chips backed by native radio buttons, so arrow keys, Tab and
 * screen readers behave as users expect with no extra ARIA.
 */
export function Segmented<T extends string | number | null>({ name, legend, options, value, onChange, className }: Props<T>) {
  const listRef = useRef<HTMLDivElement>(null);

  // Keep the selected chip visible when the row scrolls horizontally.
  // Scrolls the row itself: scrollIntoView would also move the browser's
  // sequential focus starting point, so the next Tab would skip ahead.
  useEffect(() => {
    const list = listRef.current;
    const chip = list?.querySelector<HTMLInputElement>('input:checked')?.parentElement;
    if (!list || !chip) return;
    const left = chip.offsetLeft - list.offsetLeft;
    const right = left + chip.offsetWidth;
    if (left < list.scrollLeft) list.scrollLeft = left;
    else if (right > list.scrollLeft + list.clientWidth) list.scrollLeft = right - list.clientWidth;
  }, [value]);

  return (
    <fieldset className={`segmented ${className ?? ''}`}>
      <legend className="visually-hidden">{legend}</legend>
      <div className="segmented__options" ref={listRef}>
        {options.map((option) => (
          <label className="segmented__option" key={String(option.value)}>
            <input
              type="radio"
              name={name}
              value={String(option.value)}
              checked={option.value === value}
              onChange={() => onChange(option.value)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
