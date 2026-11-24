export type BatchMode = 'single' | 'batch';

export type IpVersion = 4;

export interface BatchResult {
  /** The raw input line that produced this result. */
  input: string;
  /** True when the line parsed successfully. */
  ok: boolean;
  /** Error message when ok is false. */
  error?: string;
  /** Full analysis when ok is true. */
  analysis?: IpAnalysis;
}

export interface HistoryEntry {
  /** Short human readable description of the calculation. */
  text: string;
  /** ISO timestamp when the entry was saved. */
  createdAt: string;
}

export interface ToolState {
  /** Active input mode. */
  mode: BatchMode;
  /** The single-address input, possibly with a /CIDR suffix. */
  address: string;
  /** Multi-line batch input. */
  batch: string;
  /** Saved analysis summaries, newest first. */
  history: HistoryEntry[];
}

export const DEFAULT_STATE: ToolState = {
  mode: 'single',
  address: '192.168.1.10/24',
  batch: '',
  history: [],
};

export const MAX_HISTORY = 20;

export interface IpAnalysis {
  /** Original address without the CIDR suffix. */
  address: string;
  /** Numeric CIDR prefix length 0-32 (default 24 per class for plain input). */
  prefix: number;
  /** True when the user supplied an explicit CIDR suffix. */
  explicitPrefix: boolean;
  /** Address class letter: A, B, C, D, or E. */
  classLetter: 'A' | 'B' | 'C' | 'D' | 'E';
  /** Whether the class has the concept of network / host bits. */
  classifiable: boolean;
  /** Human-readable explanation of the classification. */
  explanation: string;
  /** Default (classful) subnet mask in dotted notation. */
  defaultMask: string;
  /** Effective subnet mask for the prefix in dotted notation. */
  mask: string;
  /** Numeric mask as a 32-bit unsigned integer. */
  maskInt: number;
  /** Network address in dotted notation. */
  network: string;
  /** Broadcast address in dotted notation (null for /31 and /32). */
  broadcast: string | null;
  /** First usable host address, or the network address itself at /32. */
  firstHost: string;
  /** Last usable host address, or the address itself at /32. */
  lastHost: string;
  /** Number of usable host addresses in the network. */
  usableHosts: number;
  /** Total addresses in the network (2^(32-prefix)). */
  totalAddresses: number;
  /** Address class based on the first octet with default mask. */
  rangeKind: RangeKind;
  /** Human-readable range description. */
  rangeLabel: string;
  /** Dotted quads of the address. */
  octets: [number, number, number, number];
  /** Binary representation of the address (four groups of 8). */
  binaryAddress: string;
  /** Binary representation of the effective mask (four groups of 8). */
  binaryMask: string;
}

export type RangeKind = 'private' | 'loopback' | 'link-local' | 'broadcast' | 'reserved' | 'public';

/** Parse a dotted quad into octets; null when invalid. Rejects 256.1.1.1 and malformed input. */
export function parseIPv4(input: string): [number, number, number, number] | null {
  const trimmed = input.trim();
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(trimmed)) return null;
  const parts = trimmed.split('.').map((p) => Number(p));
  if (parts.length !== 4) return null;
  for (const part of parts) {
    if (!Number.isInteger(part) || part < 0 || part > 255) return null;
  }
  return [parts[0]!, parts[1]!, parts[2]!, parts[3]!];
}

/** Mask integer for a prefix length 0..32. */
export function prefixToMaskInt(prefix: number): number {
  if (prefix <= 0) return 0;
  if (prefix >= 32) return 0xffffffff;
  return (0xffffffff << (32 - prefix)) >>> 0;
}

/** Dotted-quad string for a 32-bit mask integer. */
export function maskIntToString(maskInt: number): string {
  const n = maskInt >>> 0;
  return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
}

/** Count of 1-bits in a 32-bit integer. */
export function maskIntToPrefix(maskInt: number): number | null {
  const m = maskInt >>> 0;
  // mask must be contiguous: bit pattern 1*0*
  let seenZero = false;
  let prefix = 0;
  for (let i = 31; i >= 0; i--) {
    const bit = (m >>> i) & 1;
    if (bit === 1) {
      if (seenZero) return null;
      prefix++;
    } else {
      seenZero = true;
    }
  }
  return prefix;
}

/** Format four octets as a dotted-quad string. */
export function intToIp(n: number): string {
  const v = n >>> 0;
  return [(v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255].join('.');
}

/** Format octets as binary groups, e.g. "11000000 10101000 00000001 00001010". */
export function toBinaryOctets(octets: [number, number, number, number]): string {
  return octets.map((o) => o.toString(2).padStart(8, '0')).join(' ');
}

/** Default classful mask for a class letter. */
export function defaultMaskFor(classLetter: 'A' | 'B' | 'C' | 'D' | 'E'): string {
  switch (classLetter) {
    case 'A':
      return '255.0.0.0';
    case 'B':
      return '255.255.0.0';
    case 'C':
      return '255.255.255.0';
    default:
      return '240.0.0.0';
  }
}

/** Classify the first octet into an IPv4 address class. */
export function classify(firstOctet: number): {
  classLetter: 'A' | 'B' | 'C' | 'D' | 'E';
  explanation: string;
  classifiable: boolean;
} {
  if (firstOctet < 128) {
    return {
      classLetter: 'A',
      explanation: `First octet ${firstOctet} is in 0–127, so this is a class A address (first bit 0).`,
      classifiable: true,
    };
  }
  if (firstOctet < 192) {
    return {
      classLetter: 'B',
      explanation: `First octet ${firstOctet} is in 128–191, so this is a class B address (first bits 10).`,
      classifiable: true,
    };
  }
  if (firstOctet < 224) {
    return {
      classLetter: 'C',
      explanation: `First octet ${firstOctet} is in 192–223, so this is a class C address (first bits 110).`,
      classifiable: true,
    };
  }
  if (firstOctet < 240) {
    return {
      classLetter: 'D',
      explanation: `First octet ${firstOctet} is in 224–239, so this is a class D address used for multicast (first bits 1110).`,
      classifiable: false,
    };
  }
  return {
    classLetter: 'E',
    explanation: `First octet ${firstOctet} is in 240–255, so this is a class E address reserved for experimental use (first bits 1111).`,
    classifiable: false,
  };
}

/** Detect special-range membership for the address. */
export function detectRange(octets: [number, number, number, number]): {
  kind: RangeKind;
  label: string;
} {
  const [a, b] = octets;
  if (a === 10) return { kind: 'private', label: 'Private (RFC 1918: 10.0.0.0/8)' };
  if (a === 172 && b >= 16 && b <= 31)
    return { kind: 'private', label: 'Private (RFC 1918: 172.16.0.0/12)' };
  if (a === 192 && b === 168)
    return { kind: 'private', label: 'Private (RFC 1918: 192.168.0.0/16)' };
  if (a === 127) return { kind: 'loopback', label: 'Loopback (127.0.0.0/8)' };
  if (a === 169 && b === 254)
    return { kind: 'link-local', label: 'Link-local / APIPA (169.254.0.0/16)' };
  if (a === 255 && b === 255 && octets[2] === 255 && octets[3] === 255)
    return { kind: 'broadcast', label: 'Broadcast (255.255.255.255)' };
  if (a === 0) return { kind: 'reserved', label: 'Reserved (this network, 0.0.0.0/8)' };
  if (a === 100 && b >= 64 && b <= 127)
    return { kind: 'reserved', label: 'CGNAT shared address space (100.64.0.0/10)' };
  if (a >= 224) return { kind: 'reserved', label: 'Multicast / reserved range' };
  return { kind: 'public', label: 'Public' };
}

/**
 * Parse an input string that may carry a /CIDR suffix.
 * Plain addresses get the default classful prefix; /0 and /32 are handled explicitly.
 */
export function parseInput(input: string): IpAnalysis | { error: string } {
  const trimmed = input.trim();
  if (!trimmed) return { error: 'Enter an IPv4 address.' };
  const match = trimmed.match(/^(.*?)(?:\/(\d{1,2}))?$/);
  const addressPart = (match?.[1] ?? '').trim();
  const prefixPart = match?.[2];

  const octets = parseIPv4(addressPart);
  if (!octets) {
    return { error: `Invalid IPv4 address: ${addressPart || '(empty)'}` };
  }

  let prefix: number;
  let explicitPrefix = false;
  if (prefixPart !== undefined) {
    explicitPrefix = true;
    const p = Number(prefixPart);
    if (!Number.isInteger(p) || p < 0 || p > 32) {
      return { error: `Invalid CIDR suffix: /${prefixPart} (must be 0–32)` };
    }
    prefix = p;
  } else {
    const cls = classify(octets[0]);
    prefix =
      cls.classLetter === 'A' ? 8 : cls.classLetter === 'B' ? 16 : cls.classLetter === 'C' ? 24 : 4;
  }

  return analyze(octets, prefix, explicitPrefix);
}

/** Build the full analysis for octets + prefix. */
export function analyze(
  octets: [number, number, number, number],
  prefix: number,
  explicitPrefix: boolean
): IpAnalysis {
  const addrInt = ((octets[0] << 24) | (octets[1] << 16) | (octets[2] << 8) | octets[3]) >>> 0;
  const maskInt = prefixToMaskInt(prefix);
  const base = prefix === 0 ? 0 : (addrInt & maskInt) >>> 0;
  const hostBits = 32 - prefix;
  const totalAddresses = prefix >= 32 ? 1 : Math.pow(2, hostBits);
  const usableHosts =
    prefix === 32 ? 1 : prefix === 31 ? 2 : totalAddresses > 2 ? totalAddresses - 2 : 0;
  const broadcastInt = prefix >= 31 ? null : base + Math.pow(2, hostBits) - 1;
  const lastHostInt = prefix === 32 ? addrInt : prefix === 31 ? base + 1 : broadcastInt! - 1;
  const firstHostInt = prefix === 32 || prefix === 31 ? base : base + 1;

  const cls = classify(octets[0]);
  const range = detectRange(octets);
  const effectivePrefix = prefix;
  const mask = maskIntToString(maskInt);
  const defaultMask = defaultMaskFor(cls.classLetter);

  return {
    address: intToIp(addrInt),
    prefix: effectivePrefix,
    explicitPrefix,
    classLetter: cls.classLetter,
    classifiable: cls.classifiable,
    explanation: cls.explanation,
    defaultMask,
    mask,
    maskInt,
    network: intToIp(base),
    broadcast: broadcastInt === null ? null : intToIp(broadcastInt),
    firstHost: intToIp(firstHostInt),
    lastHost: intToIp(lastHostInt),
    usableHosts,
    totalAddresses,
    rangeKind: range.kind,
    rangeLabel: range.label,
    octets,
    binaryAddress: toBinaryOctets(octets),
    binaryMask: toBinaryOctets([
      (maskInt >>> 24) & 255,
      (maskInt >>> 16) & 255,
      (maskInt >>> 8) & 255,
      maskInt & 255,
    ]),
  };
}

/** Run a full analysis over multi-line batch input. */
export function analyzeBatch(batch: string): BatchResult[] {
  return batch
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const result = parseInput(line);
      if ('error' in result) {
        return { input: line, ok: false, error: result.error } as BatchResult;
      }
      return { input: line, ok: true, analysis: result } as BatchResult;
    });
}

/** Human readable summary for one analysis. */
export function analysisSummary(a: IpAnalysis): string {
  const range = a.rangeLabel;
  return [
    `${a.address}/${a.prefix} — class ${a.classLetter}`,
    `mask ${a.mask} (default ${a.defaultMask})`,
    `network ${a.network}`,
    a.broadcast ? `broadcast ${a.broadcast}` : 'no broadcast (/31 or /32)',
    `hosts ${a.firstHost} – ${a.lastHost} (${a.usableHosts} usable)`,
    range,
  ].join(' | ');
}

/** Human readable result for the active mode, or null when inputs are invalid. */
export function resultText(state: ToolState): IpAnalysis | null {
  if (state.mode === 'single') {
    const analysis = parseInput(state.address);
    return 'error' in analysis ? null : analysis;
  }
  return null;
}

/** Full result rows for the batch mode. */
export function batchResults(state: ToolState): BatchResult[] {
  return state.mode === 'batch' ? analyzeBatch(state.batch) : [];
}

/** One explanation line per fact for the active analysis. */
export function stepsFor(state: ToolState): string[] {
  const analysis = resultText(state);
  if (!analysis) {
    if (state.mode === 'batch') {
      const results = analyzeBatch(state.batch);
      const okCount = results.filter((r) => r.ok).length;
      return [
        `${results.length} address${results.length === 1 ? '' : 'es'} parsed, ${okCount} valid, ${results.length - okCount} invalid.`,
      ];
    }
    return ['Enter a valid IPv4 address (e.g. 192.168.1.10 or 10.0.0.5/8) to see the breakdown.'];
  }
  const a = analysis;
  const lines = [
    `Class ${a.classLetter}: ${a.explanation}`,
    `Default subnet mask for class ${a.classLetter}: ${a.defaultMask}`,
    a.explicitPrefix
      ? `Using user-supplied prefix /${a.prefix}: effective mask ${a.mask}`
      : `Using default prefix /${a.prefix} for class ${a.classLetter}: mask ${a.mask}`,
    `Network address: address AND mask = ${a.network}`,
  ];
  if (a.broadcast) {
    lines.push(`Broadcast address: network OR ~mask = ${a.broadcast}`);
    lines.push(
      `Usable host range: ${a.firstHost} – ${a.lastHost} (${a.usableHosts} of ${a.totalAddresses} addresses)`
    );
  } else if (a.prefix === 32) {
    lines.push('A /32 is a single host route: the address is its own network.');
  } else {
    lines.push('A /31 has exactly 2 addresses (point-to-point link, RFC 3021).');
  }
  lines.push(`Range: ${a.rangeLabel}`);
  lines.push(`Binary address: ${a.binaryAddress}`);
  lines.push(`Binary mask: ${a.binaryMask}`);
  return lines;
}

/** Compact summary used by the status bar and copy actions. */
export function summaryText(state: ToolState): string {
  if (state.mode === 'batch') {
    const results = batchResults(state);
    const okCount = results.filter((r) => r.ok).length;
    return `Batch: ${okCount}/${results.length} valid`;
  }
  const analysis = resultText(state);
  return analysis ? analysisSummary(analysis) : 'Enter a valid IPv4 address';
}

/** Build a history entry text for the current state. */
export function historyText(state: ToolState): string {
  return summaryText(state);
}

export function isState(value: unknown): value is ToolState {
  if (typeof value === 'object' || value === null) return false;
  return true;
}
