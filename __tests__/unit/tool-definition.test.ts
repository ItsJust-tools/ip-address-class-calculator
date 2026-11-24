import { describe, it, expect } from 'vitest';
import {
  deserializeState,
  ipAddressClassCalculatorTool,
  roundTrips,
  saveAnalysis,
  serializeState,
  withHistory,
} from '@/tool/tool-definition';
import { DEFAULT_STATE, MAX_HISTORY, type ToolState } from '@/tool/types';

const baseState: ToolState = { ipInput: '10.0.0.1', history: [] };

describe('serializeState / deserializeState', () => {
  it('round-trips a valid state', () => {
    expect(roundTrips(baseState)).toBe(true);
    expect(roundTrips({ ...DEFAULT_STATE, ipInput: '8.8.8.8' })).toBe(true);
  });

  it('serializes the ip input and history', () => {
    const s = serializeState({ ...baseState, ipInput: '8.8.8.8' });
    expect(JSON.parse(s)).toEqual({
      ipInput: '8.8.8.8',
      history: [],
    });
  });

  it('rejects non-object payloads', () => {
    expect(deserializeState('nope')).toEqual({
      success: false,
      error: 'Invalid data format: expected IP class calculator state object',
    });
    expect(deserializeState(null).success).toBe(false);
    expect(deserializeState([1, 2]).success).toBe(false);
  });

  it('repairs invalid payloads into defaults', () => {
    const r = deserializeState({ nope: true });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.ipInput).toBe(DEFAULT_STATE.ipInput);
      expect(r.data.history).toEqual([]);
    }
  });

  it('filters corrupt history entries', () => {
    const r = deserializeState({
      ipInput: '1.1.1.1',
      history: [
        { text: 'ok entry', createdAt: '2026-11-24T10:00:00.000Z' },
        { text: 42, createdAt: 'x' },
        null,
        'bad',
      ],
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.history).toHaveLength(1);
      expect(r.data.history[0]?.text).toBe('ok entry');
    }
  });

  it('caps history at MAX_HISTORY during deserialization', () => {
    const history = Array.from({ length: MAX_HISTORY + 5 }, (_, i) => ({
      text: `e${i}`,
      createdAt: '2026-11-24T10:00:00.000Z',
    }));
    const r = deserializeState({ ipInput: '1.1.1.1', history });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.history).toHaveLength(MAX_HISTORY);
  });
});

describe('withHistory / saveAnalysis', () => {
  it('appends newest first and caps entries', () => {
    let s = baseState;
    for (let i = 0; i < MAX_HISTORY + 3; i++) {
      s = withHistory(s, `e${i}`, new Date(2026, 0, 1, 0, 0, i));
    }
    expect(s.history).toHaveLength(MAX_HISTORY);
    expect(s.history[0]?.text).toBe(`e${MAX_HISTORY + 2}`);
  });

  it('saveAnalysis records a valid analysis', () => {
    const s = saveAnalysis(baseState, new Date('2026-11-24T10:00:00Z'));
    expect(s.history).toHaveLength(1);
    expect(s.history[0]?.text).toContain('Class A');
    expect(s.history[0]?.text).toContain('Private');
  });

  it('saveAnalysis is a no-op for invalid input', () => {
    const s = saveAnalysis({ ipInput: 'bogus', history: [] });
    expect(s.history).toHaveLength(0);
  });
});

describe('tool definition metadata', () => {
  it('exposes canonical config values', () => {
    expect(ipAddressClassCalculatorTool.id).toBe('ip-address-class-calculator');
    expect(ipAddressClassCalculatorTool.name).toBe('IP Address Class Calculator');
    expect(ipAddressClassCalculatorTool.initialState).toEqual(DEFAULT_STATE);
  });

  it('declares image exporters', async () => {
    const exporters = ipAddressClassCalculatorTool.exporters ?? [];
    expect(exporters).toHaveLength(4);
    const png = await exporters[0]!.loader();
    const resolved = 'default' in png ? png.default : (png as { exporter: unknown }).exporter;
    expect((resolved as { format: string }).format).toBe('png');
  });
});
