import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Canvas } from '@/tool/components/Canvas';
import { Sidebar } from '@/tool/components/Sidebar';
import { Toolbar } from '@/tool/components/Toolbar';
import { DEFAULT_STATE, type ToolState } from '@/tool/types';
import { saveAnalysis } from '@/tool/tool-definition';

const stateWithHistory = (n: number): ToolState => {
  let s: ToolState = { ...DEFAULT_STATE };
  for (let i = 0; i < n; i++) s = saveAnalysis(s, new Date(2026, 0, 1, 0, 0, i));
  return s;
};

describe('Canvas interactions', () => {
  it('renders integer input with correct format', () => {
    render(<Canvas state={{ ...DEFAULT_STATE, ipInput: '167772161' }} onChange={() => {}} />);
    expect(screen.getByTestId('result-total')).toHaveTextContent('16,777,216');
    expect(screen.getByTestId('result-class')).toHaveTextContent('A');
  });

  it('propagates typed input changes', () => {
    const onChange = vi.fn();
    render(<Canvas state={{ ...DEFAULT_STATE }} onChange={onChange} />);
    fireEvent.change(screen.getByTestId('ip-input'), { target: { value: '10.0.0.1' } });
    expect(onChange).toHaveBeenCalledWith({ ...DEFAULT_STATE, ipInput: '10.0.0.1' });
  });

  it('saves analysis to history via the save button', () => {
    const onSave = vi.fn();
    render(<Canvas state={{ ...DEFAULT_STATE }} onChange={() => {}} onSaveHistory={onSave} />);
    fireEvent.click(screen.getByTestId('btn-save-analysis'));
    expect(onSave).toHaveBeenCalledWith('192.168.1.1 — Class C (/24)');
  });

  it('copies the summary to the clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { writable: true, value: { writeText } });
    render(<Canvas state={{ ...DEFAULT_STATE }} onChange={() => {}} />);
    const copyBtn = screen.getByTestId('btn-copy-summary');
    copyBtn.click();
    await new Promise((r) => setTimeout(r, 0));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('192.168.1.1'));
  });

  it('shows no result panel while the input is invalid', () => {
    render(<Canvas state={{ ...DEFAULT_STATE, ipInput: '' }} onChange={() => {}} />);
    expect(screen.queryByTestId('ip-result')).not.toBeInTheDocument();
    expect(screen.getByTestId('ip-error')).toBeInTheDocument();
  });

  it('renders all eight result rows for a valid input', () => {
    render(<Canvas state={{ ...DEFAULT_STATE }} onChange={() => {}} />);
    for (const key of [
      'class',
      'mask',
      'cidr',
      'network',
      'broadcast',
      'hosts',
      'total',
      'status',
    ]) {
      expect(screen.getByTestId(`result-${key}`)).toBeInTheDocument();
    }
  });
});

describe('Sidebar', () => {
  it('shows history entries and clears them', () => {
    const onChange = vi.fn();
    const s = stateWithHistory(2);
    render(<Sidebar state={s} onChange={onChange} />);
    expect(screen.getByTestId('sidebar-history-count')).toHaveTextContent('2');
    expect(screen.getByTestId('sidebar-history-list').children.length).toBe(2);
    fireEvent.click(screen.getByTestId('btn-clear-history'));
    expect(onChange).toHaveBeenCalledWith({ ...s, history: [] });
  });

  it('resets the IP input while preserving history', () => {
    const onChange = vi.fn();
    const s = stateWithHistory(1);
    render(<Sidebar state={s} onChange={onChange} />);
    fireEvent.click(screen.getByTestId('btn-reset-input'));
    expect(onChange).toHaveBeenCalledWith({ ...DEFAULT_STATE, history: s.history });
  });

  it('omits history UI for an empty history', () => {
    render(<Sidebar state={{ ...DEFAULT_STATE }} onChange={() => {}} />);
    expect(screen.queryByTestId('btn-clear-history')).not.toBeInTheDocument();
    expect(screen.queryByTestId('sidebar-history-list')).not.toBeInTheDocument();
  });

  it('explains classful addressing in the reference panel', () => {
    render(<Sidebar state={{ ...DEFAULT_STATE }} onChange={() => {}} />);
    expect(screen.getByText('Classful reference')).toBeInTheDocument();
    expect(screen.getByText(/RFC 1918/)).toBeInTheDocument();
  });
});

describe('Toolbar', () => {
  it('shows the current class summary', () => {
    render(<Toolbar state={{ ...DEFAULT_STATE }} onChange={() => {}} onClear={() => {}} />);
    expect(screen.getByTestId('toolbar-summary')).toHaveTextContent('Class C');
  });

  it('invokes onClear', () => {
    const onClear = vi.fn();
    render(<Toolbar state={{ ...DEFAULT_STATE }} onChange={() => {}} onClear={onClear} />);
    fireEvent.click(screen.getByTestId('btn-clear'));
    expect(onClear).toHaveBeenCalled();
  });

  it('hides the copy button when no handler is passed', () => {
    render(<Toolbar state={{ ...DEFAULT_STATE }} onChange={() => {}} onClear={() => {}} />);
    expect(screen.queryByTestId('btn-copy-result')).not.toBeInTheDocument();
  });

  it('shows clear-history control only when history exists', () => {
    const onChange = vi.fn();
    const s = stateWithHistory(1);
    const { rerender } = render(<Toolbar state={s} onChange={onChange} onClear={() => {}} />);
    expect(screen.getByTestId('btn-clear-history-toolbar')).toBeInTheDocument();
    rerender(<Toolbar state={{ ...DEFAULT_STATE }} onChange={onChange} onClear={() => {}} />);
    expect(screen.queryByTestId('btn-clear-history-toolbar')).not.toBeInTheDocument();
  });
});
