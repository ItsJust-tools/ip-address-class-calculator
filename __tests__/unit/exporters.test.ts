import { describe, it, expect, beforeEach, vi } from 'vitest';
import { formatExportError, throwIfAborted, renderToImage } from '@/tool/exporters/utils';
import pdfExporter from '@/tool/exporters/pdf';
import type { ExportOptions } from '@itsjust/core';

// html-to-image's toBlob is mocked so renderToImage completes in jsdom.
vi.mock('html-to-image', () => ({
  toBlob: vi.fn(async () => new Blob(['fake-png'], { type: 'image/png' })),
}));

describe('exporter helpers', () => {
  describe('formatExportError', () => {
    it('keeps plain error messages', () => {
      expect(formatExportError(new Error('boom'), 'png')).toBe('boom');
    });

    it('adds CORS advice for tainted canvases', () => {
      const msg = formatExportError(new Error('canvas is tainted by cross-origin data'), 'png');
      expect(msg).toContain('CORS');
    });

    it('falls back to a generic message for non-Errors', () => {
      expect(formatExportError(undefined, 'jpeg')).toBe('jpeg export failed');
    });
  });

  describe('throwIfAborted', () => {
    it('passes when the signal is not aborted', () => {
      expect(() => throwIfAborted(new AbortController().signal)).not.toThrow();
      expect(() => throwIfAborted(undefined)).not.toThrow();
    });

    it('throws an AbortError when aborted', () => {
      const ctl = new AbortController();
      ctl.abort();
      expect(() => throwIfAborted(ctl.signal)).toThrow();
      try {
        throwIfAborted(ctl.signal);
      } catch (e) {
        expect((e as DOMException).name).toBe('AbortError');
      }
    });
  });

  describe('canvas exporters (renderToImage guards)', () => {
    it('rejects options with a sensitive element before rendering', async () => {
      const host = document.createElement('div');
      const pw = document.createElement('input');
      pw.type = 'password';
      host.appendChild(pw);
      document.body.appendChild(host);
      await expect(
        renderToImage(host, { allowSensitiveData: false } as unknown as ExportOptions)
      ).rejects.toThrow('sensitive');
      host.remove();
    });

    it('rejects an already-aborted signal', async () => {
      const host = document.createElement('div');
      document.body.appendChild(host);
      const ctl = new AbortController();
      ctl.abort();
      await expect(
        renderToImage(host, { signal: ctl.signal } as unknown as ExportOptions)
      ).rejects.toThrow();
      host.remove();
    });
  });

  describe('pdf exporter', () => {
    it('exports a pdf blob from a canvas', async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 50;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.fillRect(0, 0, 10, 10);
      const result = await pdfExporter.export(canvas, {
        filename: 'doc.pdf',
      } as unknown as ExportOptions);
      expect(result.success).toBe(true);
      expect(result.format).toBe('pdf');
      expect(result.filename).toContain('.pdf');
    });
  });
});
