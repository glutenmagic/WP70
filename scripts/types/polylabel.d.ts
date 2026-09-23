// polylabel ships without type declarations.
declare module 'polylabel' {
  /** Returns [x, y] plus a `distance` property: the pole of inaccessibility of `polygon`. */
  export default function polylabel(polygon: number[][][], precision?: number, debug?: boolean): number[] & { distance: number };
}
