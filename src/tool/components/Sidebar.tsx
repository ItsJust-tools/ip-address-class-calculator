'use client';

import React from 'react';
import type { ToolState } from '../types';

interface SidebarProps {
  state: ToolState;
  onChange: (next: ToolState) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ state }) => {
  return (
    <div className="p-4 space-y-6 text-sm overflow-y-auto h-full" data-testid="ip-sidebar">
      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">IPv4 address classes</h3>
        <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
          <li>
            <span className="font-mono">A</span> — 0.0.0.0–127.255.255.255, default mask 255.0.0.0
            (/8)
          </li>
          <li>
            <span className="font-mono">B</span> — 128.0.0.0–191.255.255.255, default mask
            255.255.0.0 (/16)
          </li>
          <li>
            <span className="font-mono">C</span> — 192.0.0.0–223.255.255.255, default mask
            255.255.255.0 (/24)
          </li>
          <li>
            <span className="font-mono">D</span> — 224.0.0.0–239.255.255.255, multicast
          </li>
          <li>
            <span className="font-mono">E</span> — 240.0.0.0–255.255.255.255, experimental
          </li>
        </ul>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Special ranges</h3>
        <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
          <li>Private (RFC 1918): 10/8, 172.16/12, 192.168/16</li>
          <li>Loopback: 127.0.0.0/8</li>
          <li>Link-local (APIPA): 169.254.0.0/16</li>
          <li>Everything else in 0–223: public</li>
        </ul>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Saved results</h3>
        <p className="text-xs text-gray-600 dark:text-gray-300" data-testid="sidebar-history-count">
          {state.history.length} entr{state.history.length === 1 ? 'y' : 'ies'} in history
          {state.history.length > 0 ? ' (newest first)' : ''}
        </p>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Keyboard shortcuts</h3>
        <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
          <li>
            <kbd>S</kbd> — Single-address mode
          </li>
          <li>
            <kbd>B</kbd> — Batch mode
          </li>
          <li>
            <kbd>C</kbd> — Copy result
          </li>
        </ul>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Share</h3>
        <p className="text-xs text-gray-600 dark:text-gray-300">
          Use the toolbar share button to create a URL containing the current inputs; open it to
          restore this exact state. You can also export/import the state as a .itsjust.json file.
        </p>
      </div>
    </div>
  );
};
