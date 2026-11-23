export function isState(value: unknown): boolean {
  return typeof value === 'object' && value !== null;
}
