'use client';

import React from 'react';
import type { ToolState } from '../types';
import { analysisText, analyzeIp, parseIpInput, summaryText } from '../ip-utils';

interface CanvasProps {
  state: ToolState;
  onChange?: (state: ToolState) => void;
  onSaveHistory?: (text: string) => void;
}

const EXAMPLES: { label: string; ip: string }[] = [
  { label: '10.0.0.1 (A private)', ip: '10.0.0.1' },
  { label: '172.16.5.4 (B private)', ip: '172.16.5.4' },
  { label: '192.168.1.1 (C private)', ip: '192.168.1.1' },
  { label: '8.8.8.8 (A public)', ip: '8.8.8.8' },
  { label: '127.0.0.1 (loopback)', ip: '127.0.0.1' },
  { label: '169.254.1.1 (APIPA)', ip: '169.254.1.1' },
  { label: '224.0.0.1 (multicast)', ip: '224.0.0.1' },
  { label: '167772161 (integer)', ip: '167772161' },
];

function CopyButton({ value, testid }: { value: string; testid?: string }) {
  const [copied, setCopied] = React.useState(false);
  const handleCopy = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable; ignore
    }
  }, [value]);
  return (
    <button
      type="button"
      onClick={handleCopy}
      data-testid={testid}
      className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
      aria-label="Copy value"
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

const RESULT_ROWS: { key: string; label: string }[] = [
  { key: 'class', label: 'Class' },
  { key: 'mask', label: 'Default subnet mask' },
  { key: 'cidr', label: 'Default CIDR' },
  { key: 'network', label: 'Network address' },
  { key: 'broadcast', label: 'Broadcast address' },
  { key: 'hosts', label: 'Usable hosts (class network)' },
  { key: 'total', label: 'Total addresses' },
  { key: 'status', label: 'Address status' },
];

export const Canvas: React.FC<CanvasProps> = ({ state, onChange, onSaveHistory }) => {
  const input = state.ipInput;
  const parsed = parseIpInput(input);
  const analysis = analyzeIp(input);
  const update = (patch: Partial<ToolState>) => onChange?.({ ...state, ...patch });

  const rows = analysis
    ? [
        { key: 'class', label: 'Class', value: analysis.ipClass },
        { key: 'mask', label: 'Default subnet mask', value: analysis.defaultMask.join('.') },
        { key: 'cidr', label: 'Default CIDR', value: `/${analysis.defaultMaskCidr}` },
        { key: 'network', label: 'Network address', value: analysis.networkAddress.join('.') },
        {
          key: 'broadcast',
          label: 'Broadcast address',
          value: analysis.broadcastAddress.join('.'),
        },
        {
          key: 'hosts',
          label: 'Usable hosts (class network)',
          value: analysis.usableHosts.toLocaleString('en-US'),
        },
        {
          key: 'total',
          label: 'Total addresses',
          value: analysis.totalAddresses.toLocaleString('en-US'),
        },
        { key: 'status', label: 'Address status', value: analysis.statusLabel },
      ]
    : [];

  return (
    <div className="p-4" data-testid="ip-class-canvas">
      <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-gray-100">
        IPv4 Address Class Analyzer
      </h2>

      <div className="mb-4">
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
          IPv4 address (dotted or integer)
          <input
            type="text"
            inputMode="text"
            value={input}
            onChange={(e) => update({ ipInput: e.target.value })}
            data-testid="ip-input"
            className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            placeholder="e.g. 192.168.1.1"
            aria-invalid={!parsed.ok}
          />
        </label>
        {!parsed.ok ? (
          <p
            className="mt-1 text-xs text-red-600 dark:text-red-400"
            data-testid="ip-error"
            role="alert"
          >
            {parsed.error}
          </p>
        ) : null}
      </div>

      <div className="mb-4 flex flex-wrap gap-2" data-testid="example-chips">
        {EXAMPLES.map((ex) => (
          <button
            key={ex.ip}
            type="button"
            onClick={() => update({ ipInput: ex.ip })}
            className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            {ex.label}
          </button>
        ))}
      </div>

      {analysis ? (
        <div
          className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
          data-testid="ip-result"
        >
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">Analysis</h3>
            <CopyButton value={analysisText(analysis)} testid="btn-copy-summary" />
          </div>
          <dl className="space-y-1" data-testid="result-rows">
            {RESULT_ROWS.map(({ key, label }) => {
              const row = rows.find((r) => r.key === key);
              return (
                <div key={key} className="flex justify-between gap-4 text-xs">
                  <dt className="text-gray-600 dark:text-gray-400">{label}</dt>
                  <dd
                    className="font-medium text-gray-900 dark:text-gray-100"
                    data-testid={`result-${key}`}
                  >
                    {row?.value}
                  </dd>
                </div>
              );
            })}
          </dl>
          {onSaveHistory ? (
            <button
              type="button"
              onClick={() => onSaveHistory(summaryText({ ipInput: input }))}
              data-testid="btn-save-analysis"
              className="mt-3 rounded-md bg-violet-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-600"
            >
              Save to history
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};
