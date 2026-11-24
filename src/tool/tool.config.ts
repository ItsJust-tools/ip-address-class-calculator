import type { ExportFormat, ToolTheme, FeatureFlags } from '@itsjust/core';

export const toolConfig: {
  id: string;
  name: string;
  category: string;
  description: string;
  version: string;
  exportFormats: ExportFormat[];
  features: FeatureFlags;
  theme: ToolTheme;
} = {
  id: 'ip-address-class-calculator',
  name: 'IP Address Class Calculator',
  category: 'Developer',
  description:
    'Analyze an IPv4 address to determine its class, network range, default mask, private/public status, and computed network details.',
  version: '1.0.0',
  exportFormats: ['png', 'jpeg', 'webp', 'json', 'pdf'],
  features: {
    export: true,
    autoSave: true,
    undoRedo: true,
    sidebar: true,
    statusBar: true,
    darkMode: true,
  },
  theme: {
    accent: '#6366f1',
    accentHover: '#4f46e5',
    accentSubtle: 'rgba(99, 102, 241, 0.12)',
    brand: 'IP Address Class Calculator',
    icon: '🌐',
  },
};

export default toolConfig;
