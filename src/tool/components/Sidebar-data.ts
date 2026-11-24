/** Default classful masks shared across components. */
export const DEFAULT_MASKS: Record<'A' | 'B' | 'C' | 'D' | 'E', [number, number, number, number]> =
  {
    A: [255, 0, 0, 0],
    B: [255, 255, 0, 0],
    C: [255, 255, 255, 0],
    D: [255, 255, 255, 255],
    E: [255, 255, 255, 255],
  };
