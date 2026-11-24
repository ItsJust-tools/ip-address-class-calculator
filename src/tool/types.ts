export interface HistoryEntry {
  /** Short human readable description of the analysis. */
  text: string;
  /** ISO timestamp when the entry was saved. */
  createdAt: string;
}

export interface ToolState {
  /** Current IPv4 input, dotted or simple integer. */
  ipInput: string;
  /** Saved analysis history, newest first. */
  history: HistoryEntry[];
}

export const DEFAULT_STATE: ToolState = {
  ipInput: '192.168.1.1',
  history: [],
};

export const MAX_HISTORY = 20;

/** IPv4 address classes with their ranges and defaults. */
export type IpClass = 'A' | 'B' | 'C' | 'D' | 'E';

export type IpStatus = 'loopback' | 'private' | 'apipa' | 'reserved' | 'multicast' | 'public';

/** Parse an IPv4 input (dotted quad or simple integer) into octets. */
export interface ParseOk {
  ok: true;
  octets: [number, number, number, number];
  format: 'dotted' | 'integer';
}

export interface ParseError {
  ok: false;
  error: string;
}

export type ParseResult = ParseOk | ParseError;

/** Analyzed summary of a single IPv4 address. */
export interface IpAnalysis {
  octets: [number, number, number, number];
  format: 'dotted' | 'integer';
  ipClass: IpClass;
  defaultMask: [number, number, number, number];
  defaultMaskCidr: number;
  networkAddress: [number, number, number, number];
  broadcastAddress: [number, number, number, number];
  totalAddresses: number;
  usableHosts: number;
  status: IpStatus;
  statusLabel: string;
}
