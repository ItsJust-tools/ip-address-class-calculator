import type { IpAnalysis, IpClass, IpStatus, ParseError, ParseResult } from './types';

/** Classful default masks by class. */
const DEFAULT_MASKS: Record<IpClass, [number, number, number, number]> = {
  A: [255, 0, 0, 0],
  B: [255, 255, 0, 0],
  C: [255, 255, 255, 0],
  D: [255, 255, 255, 255],
  E: [255, 255, 255, 255],
};

/** CIDR prefix lengths for the classful default masks. */
const DEFAULT_CIDR: Record<IpClass, number> = { A: 8, B: 16, C: 24, D: 32, E: 32 };

function formatError(raw: string): ParseError {
  const s = raw.trim();
  if (!s) return { ok: false, error: 'Enter an IPv4 address.' };
  if (/\s/.test(s)) return { ok: false, error: 'Remove spaces from the IP address.' };
  if (/^\d+$/.test(s)) {
    if (/^0\d/.test(s))
      return { ok: false, error: 'Invalid integer: leading zeros are not allowed.' };
    const value = Number(s);
    if (value > 4294967295) {
      return { ok: false, error: 'Integer is out of range: must be 0 to 4294967295.' };
    }
    return { ok: false, error: 'Invalid integer: must be 0 to 4294967295.' };
  }
  const parts = s.split('.');
  if (parts.length > 4)
    return { ok: false, error: 'Too many octets: an IPv4 address has exactly 4.' };
  if (parts.length < 4) return { ok: false, error: 'Enter all four octets in dotted notation.' };
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) {
      if (/^0\d/.test(part))
        return { ok: false, error: `Invalid octet "${part}": leading zeros are not allowed.` };
      return { ok: false, error: `Invalid octet "${String(part)}": use digits only.` };
    }
    const n = Number(part);
    if (n > 255) return { ok: false, error: `Octet "${part}" is out of range: must be 0 to 255.` };
  }
  return { ok: false, error: 'Invalid IPv4 address format.' };
}

/** Parse user input into four octets; supports dotted quad and simple integer. */
export function parseIpInput(raw: string): ParseResult {
  const s = raw.trim();
  if (!s) return formatError(s);
  if (/^\d+$/.test(s)) {
    if (/^0\d/.test(s)) return formatError(s);
    const value = Number(s);
    if (value > 4294967295) return formatError(s);
    const octets: [number, number, number, number] = [
      (value >>> 24) & 255,
      (value >>> 16) & 255,
      (value >>> 8) & 255,
      value & 255,
    ];
    return { ok: true, octets, format: 'integer' };
  }
  const parts = s.split('.');
  if (parts.length !== 4) return formatError(s);
  const octets: number[] = [];
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part) || (part.length > 1 && part[0] === '0')) {
      return formatError(s);
    }
    const n = Number(part);
    if (n > 255) return formatError(s);
    octets.push(n);
  }
  return { ok: true, octets: octets as [number, number, number, number], format: 'dotted' };
}

/** Address class from the first octet (classful rules). */
export function classifyIp(octets: [number, number, number, number]): IpClass {
  const first = octets[0];
  if (first <= 127) return 'A';
  if (first <= 191) return 'B';
  if (first <= 223) return 'C';
  if (first <= 239) return 'D';
  return 'E';
}

function isPrivate(octets: [number, number, number, number]): boolean {
  const [a, b] = octets;
  return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

/** Detect special/interesting status of the address. */
export function ipStatus(octets: [number, number, number, number]): {
  status: IpStatus;
  label: string;
} {
  const [a, b] = octets;
  if (a === 127) return { status: 'loopback', label: 'Loopback (RFC 1122)' };
  if (a === 169 && b === 254) return { status: 'apipa', label: 'APIPA / link-local (RFC 3927)' };
  if (isPrivate(octets)) return { status: 'private', label: 'Private (RFC 1918)' };
  if (a === 0 || a === 255) return { status: 'reserved', label: 'Reserved (RFC 1112 / RFC 919)' };
  const cls = classifyIp(octets);
  if (cls === 'D') return { status: 'multicast', label: 'Multicast (RFC 5771)' };
  if (cls === 'E') return { status: 'reserved', label: 'Reserved for experimental use (RFC 1112)' };
  return { status: 'public', label: 'Public' };
}

/** Compute the classful network and broadcast for the default class mask. */
export function networkDetails(octets: [number, number, number, number]): {
  networkAddress: [number, number, number, number];
  broadcastAddress: [number, number, number, number];
  defaultMask: [number, number, number, number];
  defaultMaskCidr: number;
  totalAddresses: number;
  usableHosts: number;
} {
  const cls = classifyIp(octets);
  const mask = DEFAULT_MASKS[cls];
  const network = [
    octets[0] & mask[0],
    octets[1] & mask[1],
    octets[2] & mask[2],
    octets[3] & mask[3],
  ] as [number, number, number, number];
  const broadcast = [
    (octets[0] & mask[0]) | (~mask[0] & 255),
    (octets[1] & mask[1]) | (~mask[1] & 255),
    (octets[2] & mask[2]) | (~mask[2] & 255),
    (octets[3] & mask[3]) | (~mask[3] & 255),
  ] as [number, number, number, number];
  const hostBits = DEFAULT_CIDR[cls] === 32 ? 0 : 32 - DEFAULT_CIDR[cls];
  const totalAddresses = 2 ** hostBits;
  const usableHosts = hostBits >= 2 ? totalAddresses - 2 : totalAddresses;
  return {
    networkAddress: network,
    broadcastAddress: broadcast,
    defaultMask: mask,
    defaultMaskCidr: DEFAULT_CIDR[cls],
    totalAddresses,
    usableHosts,
  };
}

/** Full analysis, or null when parsing failed. */
export function analyzeIp(raw: string): IpAnalysis | null {
  const parsed = parseIpInput(raw);
  if (!parsed.ok) return null;
  const octets = parsed.octets;
  const cls = classifyIp(octets);
  const det = networkDetails(octets);
  const st = ipStatus(octets);
  return {
    octets,
    format: parsed.format,
    ipClass: cls,
    defaultMask: det.defaultMask,
    defaultMaskCidr: det.defaultMaskCidr,
    networkAddress: det.networkAddress,
    broadcastAddress: det.broadcastAddress,
    totalAddresses: det.totalAddresses,
    usableHosts: det.usableHosts,
    status: st.status,
    statusLabel: st.label,
  };
}

const octetStr = (o: [number, number, number, number]) => o.join('.');

/** Human-readable multi-line summary of the analysis. */
export function analysisText(a: IpAnalysis): string {
  return [
    `IP: ${octetStr(a.octets)}`,
    `Class: ${a.ipClass}`,
    `Default mask: ${octetStr(a.defaultMask)} (/${a.defaultMaskCidr})`,
    `Network: ${octetStr(a.networkAddress)}`,
    `Broadcast: ${octetStr(a.broadcastAddress)}`,
    `Usable hosts: ${a.usableHosts.toLocaleString('en-US')}`,
    `Status: ${a.statusLabel}`,
  ].join('\n');
}

/** One-line status used by the toolbar / status bar. */
export function summaryText(state: { ipInput: string }): string {
  const parsed = parseIpInput(state.ipInput);
  if (!parsed.ok) return parsed.error;
  const cls = classifyIp(parsed.octets);
  return `${octetStr(parsed.octets)} — Class ${cls} (/${DEFAULT_CIDR[cls]})`;
}
