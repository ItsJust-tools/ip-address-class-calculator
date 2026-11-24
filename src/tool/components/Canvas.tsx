'use client';

import React from 'react';
import { batchResults, resultText, stepsFor, analysisSummary } from '../tool-definition';
import type { ToolState } from '../types';

interface CanvasProps {
  state: ToolState;
  onChange?: (state: ToolState) => void;
  onSaveHistory?: (text: string) => void;
}

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

const rangeBadgeClass = (kind: string): string => {
  switch (kind) {
    case 'private':
      return 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200';
    case 'loopback':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200';
    case 'link-local':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200';
    case 'public':
      return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200';
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
  }
};

export const Canvas: React.FC<CanvasProps> = ({ state, onChange, onSaveHistory }) => {
  const update = (patch: Partial<ToolState>) => onChange?.({ ...state, ...patch });
  const analysis = resultText(state);
  const steps = stepsFor(state);
  const batch = batchResults(state);

  return (
    <div className="p-4 space-y-6 overflow-y-auto h-full" data-testid="ip-canvas">
      <div
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label="Input mode"
        data-testid="mode-tabs"
      >
        {(
          [
            { value: 'single', label: 'Single address' },
            { value: 'batch', label: 'Batch' },
          ] as const
        ).map((mode) => (
          <button
            key={mode.value}
            type="button"
            role="tab"
            aria-selected={state.mode === mode.value}
            data-testid={`mode-tab-${mode.value}`}
            onClick={() => onChange?.({ ...state, mode: mode.value })}
            className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
              state.mode === mode.value
                ? 'border-sky-500 bg-sky-50 text-sky-800 dark:bg-sky-900/40 dark:text-sky-100'
                : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400'
            }`}
          >
            {mode.label}
          </button>
        ))}
      </div>

      {state.mode === 'single' ? (
        <div className="grid gap-4" data-testid="single-inputs">
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
            IPv4 address (optionally with /CIDR suffix)
            <input
              type="text"
              inputMode="text"
              value={state.address}
              onChange={(e) => update({ address: e.target.value })}
              data-testid="input-address"
              placeholder="e.g. 192.168.1.10 or 10.0.0.5/8"
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 font-mono text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
          </label>
        </div>
      ) : (
        <div className="grid gap-4" data-testid="batch-inputs">
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
            Addresses (one per line, optional /CIDR suffix)
            <textarea
              value={state.batch}
              onChange={(e) => update({ batch: e.target.value })}
              data-testid="input-batch"
              rows={6}
              placeholder={'192.168.1.1\n10.0.0.1/8\n8.8.8.8'}
              className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 font-mono text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
          </label>
        </div>
      )}

      {state.mode === 'single' ? (
        analysis ? (
          <>
            <div
              className="rounded-lg border border-gray-200 bg-white p-4 text-center dark:border-gray-800 dark:bg-gray-900"
              data-testid="result-card"
              role="status"
            >
              <span className="mb-1 block text-[10px] uppercase tracking-widest text-gray-500 dark:text-gray-400">
                Result
              </span>
              <span className="flex items-center justify-center gap-2">
                <span className="block font-mono text-2xl font-bold" data-testid="result-main">
                  Class {analysis.classLetter} — {analysis.address}/{analysis.prefix}
                </span>
              </span>
              <span
                className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${rangeBadgeClass(analysis.rangeKind)}`}
                data-testid="range-badge"
              >
                {analysis.rangeLabel}
              </span>
              <button
                type="button"
                data-testid="btn-save-history"
                onClick={() => onSaveHistory?.(analysisSummary(analysis))}
                className="mt-3 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Save to history
              </button>
            </div>

            <div
              className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
              data-testid="details-card"
            >
              <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-gray-500 dark:text-gray-400">Default mask</dt>
                  <dd className="font-mono" data-testid="detail-default-mask">
                    {analysis.defaultMask}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500 dark:text-gray-400">Effective mask</dt>
                  <dd className="font-mono" data-testid="detail-mask">
                    {analysis.mask} (/ {analysis.prefix})
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500 dark:text-gray-400">Network address</dt>
                  <dd className="font-mono" data-testid="detail-network">
                    {analysis.network}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500 dark:text-gray-400">Broadcast address</dt>
                  <dd className="font-mono" data-testid="detail-broadcast">
                    {analysis.broadcast ?? '— (no broadcast at /31 or /32)'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500 dark:text-gray-400">First host</dt>
                  <dd className="font-mono" data-testid="detail-first-host">
                    {analysis.firstHost}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500 dark:text-gray-400">Last host</dt>
                  <dd className="font-mono" data-testid="detail-last-host">
                    {analysis.lastHost}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500 dark:text-gray-400">Usable hosts</dt>
                  <dd className="font-mono" data-testid="detail-usable-hosts">
                    {analysis.usableHosts.toLocaleString()} of{' '}
                    {analysis.totalAddresses.toLocaleString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500 dark:text-gray-400">Range</dt>
                  <dd data-testid="detail-range">{analysis.rangeLabel}</dd>
                </div>
              </dl>
            </div>

            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/50">
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Binary
              </h3>
              <p
                className="font-mono text-xs text-gray-700 dark:text-gray-300"
                data-testid="binary-address"
              >
                Address: {analysis.binaryAddress}
              </p>
              <p
                className="font-mono text-xs text-gray-700 dark:text-gray-300"
                data-testid="binary-mask"
              >
                Mask: {analysis.binaryMask}
              </p>
            </div>

            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/50">
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Step-by-step
              </h3>
              <ol
                className="space-y-1 text-xs text-gray-700 dark:text-gray-300"
                data-testid="steps-list"
              >
                {steps.map((step, i) => (
                  <li key={i} className="font-mono">
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          </>
        ) : (
          <div
            className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-900/30 dark:text-red-200"
            data-testid="error-card"
            role="alert"
          >
            Invalid IPv4 address or CIDR suffix. Use the form 192.168.1.10 or 10.0.0.5/8; each octet
            must be 0–255 and the prefix 0–32.
          </div>
        )
      ) : (
        <div
          className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
          data-testid="batch-results"
        >
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Batch results
          </h3>
          {batch.length === 0 ? (
            <p className="text-xs text-gray-500 dark:text-gray-400" data-testid="batch-empty">
              Paste addresses above to classify them.
            </p>
          ) : (
            <ul className="space-y-1" data-testid="batch-list">
              {batch.map((r, i) => (
                <li
                  key={`${r.input}-${i}`}
                  className="flex items-center justify-between gap-2 rounded-md border border-gray-200 px-3 py-1.5 text-xs dark:border-gray-800"
                >
                  <span className="font-mono text-gray-700 dark:text-gray-300">{r.input}</span>
                  {r.ok && r.analysis ? (
                    <span className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 font-medium ${rangeBadgeClass(r.analysis.rangeKind)}`}
                        data-testid={`batch-class-${i}`}
                      >
                        Class {r.analysis.classLetter} · {r.analysis.rangeKind}
                      </span>
                      <CopyButton value={analysisSummary(r.analysis)} />
                    </span>
                  ) : (
                    <span
                      className="text-red-600 dark:text-red-400"
                      data-testid={`batch-error-${i}`}
                    >
                      {r.error}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div>
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
          History
        </h3>
        {state.history.length === 0 ? (
          <p className="text-xs text-gray-500 dark:text-gray-400" data-testid="history-empty">
            No saved analyses yet.
          </p>
        ) : (
          <ul className="space-y-1" data-testid="history-list">
            {state.history.map((entry, i) => (
              <li
                key={`${entry.createdAt}-${i}`}
                className="flex items-center justify-between gap-2 rounded-md border border-gray-200 px-3 py-1.5 text-xs dark:border-gray-800"
              >
                <span className="text-gray-700 dark:text-gray-300">{entry.text}</span>
                <CopyButton value={entry.text} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-center text-xs text-gray-500 dark:text-gray-400">
        All calculations run locally in your browser; nothing is uploaded.
      </p>
    </div>
  );
};
