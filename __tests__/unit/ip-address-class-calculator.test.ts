import { describe, it, expect } from 'vitest';
import {
  classify,
  detectRange,
  defaultMaskFor,
  parseIPv4,
  parseInput,
  analyze,
  analyzeBatch,
  prefixToMaskInt,
  maskIntToString,
  maskIntToPrefix,
  intToIp,
  toBinaryOctets,
  resultText,
  batchResults,
  stepsFor,
  summaryText,
  analysisSummary,
  DEFAULT_STATE,
  MAX_HISTORY,
  type ToolState,
} from '@/tool/types';
import {
  serializeState,
  deserializeState,
  withHistory,
  roundTrips,
  ipAddressClassCalculatorTool,
} from '@/tool/tool-definition';

const state = (patch: Partial<ToolState> = {}): ToolState => ({ ...DEFAULT_STATE, ...patch });

describe('classification (required tests)', () => {
  it('classifies 10.0.0.1 as A', () => {
    const analysis = parseInput('10.0.0.1');
    expect('error' in analysis).toBe(false);
    if ('error' in analysis) return;
    expect(analysis.classLetter).toBe('A');
    expect(analysis.defaultMask).toBe('255.0.0.0');
  });

  it('classifies 172.16.0.5 as B', () => {
    const analysis = parseInput('172.16.0.5');
    if (!('classLetter' in analysis)) throw new Error('parse failed');
    expect(analysis.classLetter).toBe('B');
    expect(analysis.defaultMask).toBe('255.255.0.0');
  });

  it('classifies 192.168.1.1 as C', () => {
    const analysis = parseInput('192.168.1.1');
    if (!('classLetter' in analysis)) throw new Error('parse failed');
    expect(analysis.classLetter).toBe('C');
    expect(analysis.defaultMask).toBe('255.255.255.0');
  });

  it('classifies 224.0.0.1 as D', () => {
    const analysis = parseInput('224.0.0.1');
    if (!('classLetter' in analysis)) throw new Error('parse failed');
    expect(analysis.classLetter).toBe('D');
    expect(analysis.classifiable).toBe(false);
  });

  it('classifies 240.0.0.1 as E', () => {
    const analysis = parseInput('240.0.0.1');
    if (!('classLetter' in analysis)) throw new Error('parse failed');
    expect(analysis.classLetter).toBe('E');
    expect(analysis.classifiable).toBe(false);
  });

  it('explains the classification', () => {
    expect(classify(10).explanation).toContain('class A');
    expect(classify(128).explanation).toContain('class B');
    expect(classify(192).explanation).toContain('class C');
    expect(classify(239).explanation).toContain('multicast');
    expect(classify(250).explanation).toContain('experimental');
  });
});

describe('network math for 192.168.1.77/26 (required test)', () => {
  const analysis = parseInput('192.168.1.77/26');
  if (!('network' in analysis)) throw new Error('parse failed');

  it('uses the user-supplied prefix', () => {
    expect(analysis.prefix).toBe(26);
    expect(analysis.explicitPrefix).toBe(true);
    expect(analysis.mask).toBe('255.255.255.192');
  });

  it('computes correct network and broadcast', () => {
    expect(analysis.network).toBe('192.168.1.64');
    expect(analysis.broadcast).toBe('192.168.1.127');
  });

  it('computes the host range and counts', () => {
    expect(analysis.firstHost).toBe('192.168.1.65');
    expect(analysis.lastHost).toBe('192.168.1.126');
    expect(analysis.usableHosts).toBe(62);
    expect(analysis.totalAddresses).toBe(64);
  });
});

describe('range detection (required tests)', () => {
  it('marks 8.8.8.8 public', () => {
    const analysis = parseInput('8.8.8.8');
    if (!('rangeKind' in analysis)) throw new Error('parse failed');
    expect(analysis.rangeKind).toBe('public');
  });

  it('marks 172.32.1.1 public (outside RFC 1918 172.16/12)', () => {
    const analysis = parseInput('172.32.1.1');
    if (!('rangeKind' in analysis)) throw new Error('parse failed');
    expect(analysis.rangeKind).toBe('public');
  });

  it('marks 172.31.255.255 private (inside RFC 1918 172.16/12)', () => {
    const analysis = parseInput('172.31.255.255');
    if (!('rangeKind' in analysis)) throw new Error('parse failed');
    expect(analysis.rangeKind).toBe('private');
  });

  it('marks RFC 1918, loopback, link-local ranges', () => {
    expect(detectRange([10, 1, 2, 3]).kind).toBe('private');
    expect(detectRange([192, 168, 5, 5]).kind).toBe('private');
    expect(detectRange([127, 0, 0, 1]).kind).toBe('loopback');
    expect(detectRange([169, 254, 10, 20]).kind).toBe('link-local');
  });
});

describe('input validation (required tests)', () => {
  it('rejects invalid octets like 256.1.1.1', () => {
    const result = parseInput('256.1.1.1');
    expect('error' in result).toBe(true);
    if ('error' in result) expect(result.error).toContain('Invalid IPv4');
  });

  it('rejects malformed input', () => {
    expect('error' in parseInput('')).toBe(true);
    expect('error' in parseInput('abc')).toBe(true);
    expect('error' in parseInput('1.2.3')).toBe(true);
    expect('error' in parseInput('1.2.3.4.5')).toBe(true);
    expect('error' in parseInput('1..2.3')).toBe(true);
    expect('error' in parseInput('10.0.0.5/33')).toBe(true);
    expect('error' in parseInput('10.0.0.5/-1')).toBe(true);
    expect('error' in parseInput('10.0.0.5/8.5')).toBe(true);
    expect(parseIPv4('-1.0.0.1')).toBeNull();
    expect(parseIPv4('1.2.3')).toBeNull();
    expect(parseIPv4('256.0.0.1')).toBeNull();
  });
});

describe('CIDR edge cases (required tests)', () => {
  it('handles /0 producing a valid mask string', () => {
    const analysis = parseInput('1.2.3.4/0');
    if (!('mask' in analysis)) throw new Error('parse failed');
    expect(analysis.mask).toBe('0.0.0.0');
    expect(analysis.network).toBe('0.0.0.0');
    expect(analysis.broadcast).toBe('255.255.255.255');
    expect(analysis.totalAddresses).toBe(4294967296);
  });

  it('handles /32 producing a valid mask string', () => {
    const analysis = parseInput('8.8.4.4/32');
    if (!('mask' in analysis)) throw new Error('parse failed');
    expect(analysis.mask).toBe('255.255.255.255');
    expect(analysis.network).toBe('8.8.4.4');
    expect(analysis.broadcast).toBeNull();
    expect(analysis.firstHost).toBe('8.8.4.4');
    expect(analysis.lastHost).toBe('8.8.4.4');
    expect(analysis.usableHosts).toBe(1);
    expect(analysis.totalAddresses).toBe(1);
  });

  it('handles /31 (RFC 3021 point-to-point)', () => {
    const analysis = parseInput('10.0.0.4/31');
    if (!('mask' in analysis)) throw new Error('parse failed');
    expect(analysis.mask).toBe('255.255.255.254');
    expect(analysis.network).toBe('10.0.0.4');
    expect(analysis.broadcast).toBeNull();
    expect(analysis.firstHost).toBe('10.0.0.4');
    expect(analysis.lastHost).toBe('10.0.0.5');
    expect(analysis.usableHosts).toBe(2);
  });

  it('treats every host bit correctly for /25', () => {
    const analysis = parseInput('192.168.1.200/25');
    if (!('network' in analysis)) throw new Error('parse failed');
    expect(analysis.network).toBe('192.168.1.128');
    expect(analysis.broadcast).toBe('192.168.1.255');
  });
});

describe('mask helpers', () => {
  it('converts prefix to mask int and back', () => {
    expect(prefixToMaskInt(0)).toBe(0);
    expect(prefixToMaskInt(8)).toBe(0xff000000);
    expect(prefixToMaskInt(24)).toBe(0xffffff00);
    expect(prefixToMaskInt(32)).toBe(0xffffffff);
    expect(maskIntToPrefix(prefixToMaskInt(22))).toBe(22);
    expect(maskIntToPrefix(0xffffffff)).toBe(32);
    // non-contiguous mask is rejected
    expect(maskIntToPrefix(0xff00ff00)).toBeNull();
  });

  it('formats mask strings', () => {
    expect(maskIntToString(0xffffff00)).toBe('255.255.255.0');
    expect(maskIntToString(0xffffc000)).toBe('255.255.192.0');
  });

  it('converts integers to dotted quads', () => {
    expect(intToIp(0xc0a8010a)).toBe('192.168.1.10');
    expect(intToIp(0)).toBe('0.0.0.0');
  });

  it('formats binary octet groups', () => {
    expect(toBinaryOctets([192, 168, 1, 10])).toBe('11000000 10101000 00000001 00001010');
    expect(toBinaryOctets([255, 255, 255, 0])).toBe('11111111 11111111 11111111 00000000');
  });

  it('provides default masks per class', () => {
    expect(defaultMaskFor('A')).toBe('255.0.0.0');
    expect(defaultMaskFor('B')).toBe('255.255.0.0');
    expect(defaultMaskFor('C')).toBe('255.255.255.0');
    expect(defaultMaskFor('D')).toBe('240.0.0.0');
    expect(defaultMaskFor('E')).toBe('240.0.0.0');
  });
});

describe('binary view of address and mask', () => {
  it('shows binary representation for address and mask', () => {
    const analysis = parseInput('192.168.1.10/24');
    if (!('binaryAddress' in analysis)) throw new Error('parse failed');
    expect(analysis.binaryAddress).toBe('11000000 10101000 00000001 00001010');
    expect(analysis.binaryMask).toBe('11111111 11111111 11111111 00000000');
    expect(analysis.binaryMask.startsWith('11111111')).toBe(true);
  });
});

describe('batch mode', () => {
  it('classifies multiple addresses at once', () => {
    const results = analyzeBatch('10.0.0.1\n172.16.0.5\n192.168.1.1\n224.0.0.1\n240.0.0.1');
    expect(results).toHaveLength(5);
    expect(results.map((r) => (r.ok ? r.analysis?.classLetter : null))).toEqual([
      'A',
      'B',
      'C',
      'D',
      'E',
    ]);
  });

  it('flags invalid lines without aborting the batch', () => {
    const results = analyzeBatch('8.8.8.8\n256.1.1.1\nbad line');
    expect(results).toHaveLength(3);
    expect(results[0]?.ok).toBe(true);
    expect(results[1]?.ok).toBe(false);
    expect(results[1]?.error).toContain('Invalid IPv4');
    expect(results[2]?.ok).toBe(false);
  });

  it('supports CIDR suffixes per line', () => {
    const results = analyzeBatch('10.0.0.77/26');
    if (!results[0]?.analysis) throw new Error('parse failed');
    expect(results[0].analysis.network).toBe('10.0.0.64');
  });

  it('ignores empty lines', () => {
    const results = analyzeBatch('\n8.8.8.8\n\n');
    expect(results).toHaveLength(1);
  });

  it('batchResults returns rows only in batch mode', () => {
    expect(batchResults(state({ mode: 'batch', batch: '8.8.8.8' }))).toHaveLength(1);
    expect(batchResults(state({ mode: 'single' }))).toEqual([]);
  });
});

describe('result text, steps and summary', () => {
  it('resultText yields an analysis for valid input', () => {
    const analysis = resultText(state({ address: '192.168.1.10/24' }));
    expect(analysis?.classLetter).toBe('C');
    expect(resultText(state({ address: 'nope' }))).toBeNull();
  });

  it('stepsFor explains classification and math', () => {
    const steps = stepsFor(state({ address: '192.168.1.77/26' }));
    expect(steps.some((s) => s.includes('Class C'))).toBe(true);
    expect(steps.some((s) => s.includes('255.255.255.192'))).toBe(true);
    expect(steps.some((s) => s.includes('192.168.1.64'))).toBe(true);
    expect(steps.some((s) => s.includes('11000000'))).toBe(true);
  });

  it('stepsFor reports parse errors', () => {
    const steps = stepsFor(state({ address: '999.1.1.1' }));
    expect(steps[0]).toContain('valid IPv4');
  });

  it('summaryText includes key facts', () => {
    const s = summaryText(state({ address: '8.8.8.8' }));
    expect(s).toContain('class D'.replace('D', 'A'));
    expect(s).toContain('Public');
    expect(s).toContain('network 8.0.0.0');
  });

  it('analysisSummary joins facts', () => {
    const analysis = parseInput('10.0.0.1/8');
    if (!('network' in analysis)) throw new Error('parse failed');
    const s = analysisSummary(analysis);
    expect(s).toContain('10.0.0.0/8');
    expect(s).toContain('Private');
  });
});

describe('serialize / deserialize', () => {
  it('round-trips the state', () => {
    const s = state({ address: '8.8.8.8/32', batch: '10.0.0.1' });
    expect(roundTrips(s)).toBe(true);
  });

  it('repairs invalid payloads to defaults', () => {
    const restored = deserializeState({ nope: 42 });
    expect(restored.success).toBe(true);
    if (restored.success) {
      expect(restored.data.mode).toBe(DEFAULT_STATE.mode);
      expect(restored.data.address).toBe(DEFAULT_STATE.address);
    }
  });

  it('rejects non-object payloads', () => {
    expect(deserializeState('nope').success).toBe(false);
    expect(deserializeState(null).success).toBe(false);
    expect(deserializeState([1, 2]).success).toBe(false);
  });

  it('caps history at MAX_HISTORY, newest first', () => {
    let s = state();
    for (let i = 0; i < MAX_HISTORY + 5; i++) {
      s = withHistory(s, `entry ${i}`, new Date(2026, 0, 1, 0, 0, i));
    }
    expect(s.history).toHaveLength(MAX_HISTORY);
    expect(s.history[0]?.text).toBe(`entry ${MAX_HISTORY + 4}`);
  });

  it('serializes compactly', () => {
    const json = serializeState(state());
    expect(json).toContain('"mode":"single"');
    expect(JSON.parse(json)).toEqual({
      mode: DEFAULT_STATE.mode,
      address: DEFAULT_STATE.address,
      batch: DEFAULT_STATE.batch,
      history: [],
    });
  });
});

describe('tool definition contract', () => {
  it('exposes the framework contract', () => {
    const tool = ipAddressClassCalculatorTool;
    expect(tool.id).toBe('ip-address-class-calculator');
    expect(tool.name).toBe('IP Address Class Calculator');
    expect(tool.version).toBe('1.0.0');
    expect(tool.serialize(tool.initialState)).toBeTruthy();
    expect(tool.deserialize(JSON.parse(tool.serialize(tool.initialState))).success).toBe(true);
    expect(tool.exporters).toHaveLength(4);
  });
});
