import { DEFAULT_STATE, type ToolState } from './types';

export const EXAMPLE_IPS = [
  '10.0.0.1',
  '172.16.5.4',
  '192.168.1.1',
  '8.8.8.8',
  '127.0.0.1',
  '169.254.1.1',
  '224.0.0.5',
  '240.0.0.1',
];

export function isState(value: unknown): value is ToolState {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Partial<ToolState>;
  return typeof v.ipInput === 'string' && Array.isArray(v.history ?? DEFAULT_STATE.history);
}
