import { describe, it, expect } from 'vitest';
import {
  analyzeIp,
  classifyIp,
  ipStatus,
  parseIpInput,
  summaryText,
  networkDetails,
} from '@/tool/ip-utils';

describe('parseIpInput', () => {
  it('parses a normal dotted address', () => {
    expect(parseIpInput('192.168.1.1')).toEqual({
      ok: true,
      octets: [192, 168, 1, 1],
      format: 'dotted',
    });
  });

  it('parses 0.0.0.0 and 255.255.255.255', () => {
    expect(parseIpInput('0.0.0.0')).toEqual({ ok: true, octets: [0, 0, 0, 0], format: 'dotted' });
    expect(parseIpInput('255.255.255.255')).toEqual({
      ok: true,
      octets: [255, 255, 255, 255],
      format: 'dotted',
    });
  });

  it('parses a simple integer address', () => {
    // 167772161 = 10.0.0.1
    expect(parseIpInput('167772161')).toEqual({
      ok: true,
      octets: [10, 0, 0, 1],
      format: 'integer',
    });
    // 3232235777 = 192.168.1.1
    expect(parseIpInput('3232235777')).toEqual({
      ok: true,
      octets: [192, 168, 1, 1],
      format: 'integer',
    });
    expect(parseIpInput('0')).toEqual({ ok: true, octets: [0, 0, 0, 0], format: 'integer' });
    expect(parseIpInput('4294967295')).toEqual({
      ok: true,
      octets: [255, 255, 255, 255],
      format: 'integer',
    });
  });

  it('rejects empty and whitespace input', () => {
    expect(parseIpInput('')).toEqual({ ok: false, error: 'Enter an IPv4 address.' });
    expect(parseIpInput('   ')).toEqual({ ok: false, error: 'Enter an IPv4 address.' });
    expect(parseIpInput('1.2.3 .4').ok).toBe(false);
  });

  it('rejects out-of-range octets', () => {
    const r = parseIpInput('256.1.1.1');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('out of range');
  });

  it('rejects non-numeric octets', () => {
    const r = parseIpInput('abc.def.ghi.jkl');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('digits only');
  });

  it('rejects too few and too many octets', () => {
    expect(parseIpInput('10.0.0').ok).toBe(false);
    expect(parseIpInput('10.0.0.0.1').ok).toBe(false);
  });

  it('rejects out-of-range integers', () => {
    expect(parseIpInput('4294967296').ok).toBe(false);
    expect(parseIpInput('99999999999').ok).toBe(false);
  });

  it('rejects leading zeros', () => {
    expect(parseIpInput('010.0.0.1').ok).toBe(false);
    expect(parseIpInput('0123').ok).toBe(false);
  });
});

describe('classifyIp (class boundaries)', () => {
  it.each<[string, string]>([
    ['0.0.0.0', 'A'],
    ['10.0.0.1', 'A'],
    ['126.255.255.255', 'A'],
    ['127.0.0.1', 'A'],
    ['128.0.0.1', 'B'],
    ['172.16.0.1', 'B'],
    ['191.255.255.255', 'B'],
    ['192.0.0.1', 'C'],
    ['223.255.255.255', 'C'],
    ['224.0.0.1', 'D'],
    ['239.255.255.255', 'D'],
    ['240.0.0.1', 'E'],
    ['255.255.255.255', 'E'],
  ])('classifies %s as class %s', (ip, cls) => {
    const r = parseIpInput(ip);
    expect(r.ok).toBe(true);
    if (r.ok) expect(classifyIp(r.octets)).toBe(cls);
  });
});

describe('ipStatus', () => {
  it('flags loopback', () => {
    expect(ipStatus([127, 0, 0, 1]).status).toBe('loopback');
  });
  it('flags private ranges', () => {
    expect(ipStatus([10, 1, 2, 3]).status).toBe('private');
    expect(ipStatus([172, 16, 0, 1]).status).toBe('private');
    expect(ipStatus([172, 31, 255, 255]).status).toBe('private');
    expect(ipStatus([172, 32, 0, 1]).status).not.toBe('private');
    expect(ipStatus([192, 168, 0, 1]).status).toBe('private');
  });
  it('flags APIPA', () => {
    expect(ipStatus([169, 254, 1, 1]).status).toBe('apipa');
  });
  it('flags multicast and experimental', () => {
    expect(ipStatus([224, 0, 0, 1]).status).toBe('multicast');
    expect(ipStatus([240, 0, 0, 1]).status).toBe('reserved');
    expect(ipStatus([255, 255, 255, 255]).status).toBe('reserved');
    expect(ipStatus([0, 0, 0, 0]).status).toBe('reserved');
  });
  it('flags plain public addresses', () => {
    expect(ipStatus([8, 8, 8, 8]).status).toBe('public');
    expect(ipStatus([192, 167, 5, 5]).status).toBe('public');
  });
});

describe('networkDetails / analyzeIp (classful defaults)', () => {
  it('computes class A defaults for 10.20.30.40', () => {
    const a = analyzeIp('10.20.30.40');
    expect(a).not.toBeNull();
    if (!a) return;
    expect(a.ipClass).toBe('A');
    expect(a.defaultMask.join('.')).toBe('255.0.0.0');
    expect(a.defaultMaskCidr).toBe(8);
    expect(a.networkAddress.join('.')).toBe('10.0.0.0');
    expect(a.broadcastAddress.join('.')).toBe('10.255.255.255');
    expect(a.usableHosts).toBe(16777214);
  });

  it('computes class B defaults for 172.16.5.9', () => {
    const a = analyzeIp('172.16.5.9');
    expect(a?.defaultMask.join('.')).toBe('255.255.0.0');
    expect(a?.networkAddress.join('.')).toBe('172.16.0.0');
    expect(a?.broadcastAddress.join('.')).toBe('172.16.255.255');
    expect(a?.usableHosts).toBe(65534);
  });

  it('computes class C defaults for 192.168.1.77', () => {
    const a = analyzeIp('192.168.1.77');
    expect(a?.defaultMask.join('.')).toBe('255.255.255.0');
    expect(a?.networkAddress.join('.')).toBe('192.168.1.0');
    expect(a?.broadcastAddress.join('.')).toBe('192.168.1.255');
    expect(a?.usableHosts).toBe(254);
  });

  it('handles /32 classes D and E', () => {
    const d = networkDetails([224, 1, 2, 3]);
    expect(d.usableHosts).toBe(1);
    const e = networkDetails([250, 1, 2, 3]);
    expect(e.usableHosts).toBe(1);
  });

  it('returns null for invalid input in analyzeIp', () => {
    expect(analyzeIp('not-an-ip')).toBeNull();
  });

  it('integer-format input yields identical analysis', () => {
    const dotted = analyzeIp('10.0.0.1');
    const integer = analyzeIp('167772161');
    expect(integer?.octets).toEqual(dotted?.octets);
  });
});

describe('summaryText', () => {
  it('summarizes a valid address', () => {
    expect(summaryText({ ipInput: '192.168.1.1' })).toBe('192.168.1.1 — Class C (/24)');
  });
  it('returns the error for invalid input', () => {
    expect(summaryText({ ipInput: '' })).toBe('Enter an IPv4 address.');
  });
});
