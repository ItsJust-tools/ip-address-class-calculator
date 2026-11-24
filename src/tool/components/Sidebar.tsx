'use client';

import React from 'react';
import type { ToolState } from '../types';
import { DEFAULT_STATE } from '../types';
import { DEFAULT_MASKS } from './Sidebar-data';

interface SidebarProps {
  state: ToolState;
  onChange: (next: ToolState) => void;
}

const CLASS_ROWS = [
  { cls: 'A', range: '1.0.0.0 – 126.255.255.255', mask: DEFAULT_MASKS.A.join('.'), cidr: '/8' },
  { cls: 'B', range: '128.0.0.0 – 191.255.255.255', mask: DEFAULT_MASKS.B.join('.'), cidr: '/16' },
  { cls: 'C', range: '192.0.0.0 – 223.255.255.255', mask: DEFAULT_MASKS.C.join('.'), cidr: '/24' },
  { cls: 'D', range: '224.0.0.0 – 239.255.255.255', mask: 'n/a', cidr: 'multicast' },
  { cls: 'E', range: '240.0.0.0 – 255.255.255.255', mask: 'n/a', cidr: 'experimental' },
];

export const Sidebar: React.FC<SidebarProps> = ({ state, onChange }) => {
  return (
    <div className="p-4 space-y-6 text-sm overflow-y-auto h-full" data-testid="ip-class-sidebar">
      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Saved analyses</h3>
        <p className="text-xs text-gray-600 dark:text-gray-300" data-testid="sidebar-history-count">
          {state.history.length} saved analys{state.history.length === 1 ? 'is' : 'es'}
          {state.history.length > 0 ? ' (newest first)' : ''}
        </p>
        {state.history.length > 0 && onChange ? (
          <>
            <ul
              className="mt-2 space-y-1 text-xs text-gray-600 dark:text-gray-300"
              data-testid="sidebar-history-list"
            >
              {state.history.slice(0, 5).map((e, i) => (
                <li key={`${e.createdAt}-${i}`} className="truncate">
                  {e.text}
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => onChange({ ...state, history: [] })}
              data-testid="btn-clear-history"
              className="mt-2 rounded-md bg-gray-100 px-3 py-1 text-xs text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
            >
              Clear history
            </button>
          </>
        ) : null}
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Classful reference</h3>
        <table className="w-full text-xs text-gray-600 dark:text-gray-300">
          <thead>
            <tr className="text-left">
              <th className="py-1">Class</th>
              <th className="py-1">Range</th>
              <th className="py-1">Default mask</th>
            </tr>
          </thead>
          <tbody>
            {CLASS_ROWS.map((row) => (
              <tr key={row.cls}>
                <td className="py-1 font-medium">{row.cls}</td>
                <td className="py-1">{row.range}</td>
                <td className="py-1">
                  {row.mask} <span className="text-gray-400">({row.cidr})</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Special addresses</h3>
        <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
          <li>0.0.0.0/8 — &quot;this network&quot; (RFC 791)</li>
          <li>10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16 — private (RFC 1918)</li>
          <li>127.0.0.0/8 — loopback (RFC 1122)</li>
          <li>169.254.0.0/16 — APIPA link-local (RFC 3927)</li>
          <li>224.0.0.0/4 — multicast (RFC 5771)</li>
          <li>240.0.0.0/4 — reserved experimental (RFC 1112)</li>
        </ul>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Classful addressing</h3>
        <p className="text-xs text-gray-600 dark:text-gray-300">
          Classful addressing (RFC 791) splits the 32-bit IPv4 space into fixed-size networks per
          class. Classless routing (CIDR, RFC 1519) replaced it, but the default class masks are
          still widely taught and useful for quick estimation.
        </p>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Reset</h3>
        <button
          type="button"
          onClick={() => onChange({ ...DEFAULT_STATE, history: state.history })}
          data-testid="btn-reset-input"
          className="rounded-md bg-gray-100 px-3 py-1 text-xs text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
        >
          Reset IP input
        </button>
      </div>
    </div>
  );
};
