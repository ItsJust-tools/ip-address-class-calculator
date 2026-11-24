import type { ToolConfig } from '@itsjust/core';

const toolConfig = {
  id: 'ip-address-class-calculator',
  name: 'IP Address Class Calculator',
  description:
    'Enter an IPv4 address and instantly see its class (A/B/C/D/E), default subnet mask, network and broadcast address, and private/public status.',
  version: '1.0.0',
  exportFormats: ['png', 'jpeg', 'webp', 'pdf'],
  features: {
    export: true,
    autoSave: true,
    undoRedo: false,
    sidebar: true,
    statusBar: true,
    darkMode: true,
  },
  theme: {
    accent: '#0ea5e9',
    accentHover: '#0284c7',
    accentSubtle: 'rgba(14, 165, 233, 0.12)',
    brand: 'IP Address Class Calculator',
    icon: '🌐',
  },
  shortcuts: [
    {
      title: 'IP Address Class Calculator',
      shortcuts: [
        { keys: 'S', label: 'Single mode', description: 'switch to single-address mode' },
        { keys: 'B', label: 'Batch mode', description: 'switch to batch mode' },
        {
          keys: 'C',
          label: 'Copy result',
          description: 'copy the current result to the clipboard',
        },
      ],
    },
  ],
} satisfies ToolConfig;

export default toolConfig;
