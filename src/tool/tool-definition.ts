import { DEFAULT_STATE, MAX_HISTORY, type HistoryEntry, type ToolState } from './types';
import { analyzeIp } from './ip-utils';
import type { DeserializeResult } from '@itsjust/core';

/** Serialize tool state into a compact JSON string for share/import. */
export function serializeState(state: ToolState): string {
  return JSON.stringify({ ipInput: state.ipInput, history: state.history });
}

function validHistory(value: unknown): HistoryEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (entry): entry is HistoryEntry =>
        typeof entry === 'object' &&
        entry !== null &&
        typeof (entry as HistoryEntry).text === 'string' &&
        typeof (entry as HistoryEntry).createdAt === 'string'
    )
    .slice(0, MAX_HISTORY);
}

/** Validate and recover tool state from an arbitrary payload. */
export function deserializeState(data: unknown): DeserializeResult<ToolState> {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return {
      success: false,
      error: 'Invalid data format: expected IP class calculator state object',
    };
  }
  const v = data as Record<string, unknown>;
  const ipInput = typeof v.ipInput === 'string' ? v.ipInput : DEFAULT_STATE.ipInput;
  const state: ToolState = { ipInput, history: validHistory(v.history) };
  return { success: true, data: state };
}

/** Append a history entry to state, capped at MAX_HISTORY, newest first. */
export function withHistory(state: ToolState, text: string, now = new Date()): ToolState {
  const entry: HistoryEntry = { text, createdAt: now.toISOString() };
  return { ...state, history: [entry, ...state.history].slice(0, MAX_HISTORY) };
}

/** Save the current IP analysis into history (no-op when the IP is invalid). */
export function saveAnalysis(state: ToolState, now = new Date()): ToolState {
  const a = analyzeIp(state.ipInput);
  if (!a) return state;
  const text = `${a.octets.join('.')} → Class ${a.ipClass} (/${a.defaultMaskCidr}) — ${a.statusLabel}`;
  return withHistory(state, text, now);
}

/** True when a serialized string round-trips back to the same state. */
export function roundTrips(state: ToolState): boolean {
  try {
    const restored = deserializeState(JSON.parse(serializeState(state)));
    return restored.success && JSON.stringify(restored.data) === JSON.stringify(state);
  } catch {
    return false;
  }
}

import { toolConfig } from './tool.config';
import type { Tool } from '@itsjust/core';

export const ipAddressClassCalculatorTool: Tool<ToolState> = {
  id: toolConfig.id,
  name: toolConfig.name,
  version: toolConfig.version,
  config: toolConfig,
  initialState: { ...DEFAULT_STATE },
  serialize: serializeState,
  deserialize: deserializeState,
  exporters: [
    { format: 'png', loader: () => import('./exporters/png') },
    { format: 'jpeg', loader: () => import('./exporters/jpeg') },
    { format: 'webp', loader: () => import('./exporters/webp') },
    { format: 'pdf', loader: () => import('./exporters/pdf') },
  ],
};
