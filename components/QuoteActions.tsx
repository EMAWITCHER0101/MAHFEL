import React, { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export interface ActionMenuItem {
  icon?: string;
  label?: string;
  color?: string;
  divider?: boolean;
  onClick?: () => void;
}

export function useActionMenu() {
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const openAt = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault?.();
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setPos({ top: Math.round(rect.bottom + 4), right: Math.round(document.documentElement.clientWidth - rect.right) });
  }, []);
  const close = useCallback(() => setPos(null), []);
  useEffect(() => {
    if (!pos) return;
    const onDown = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest?.('[data-action-menu]')) setPos(null);
    };
    const onScroll = () => setPos(null);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setPos(null); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('scroll', onScroll, true);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('scroll', onScroll, true);
      document.removeEventListener('keydown', onKey);
    };
  }, [pos]);
  return { pos, openAt, close };
}

export const ActionMenu: React.FC<{ pos: { top: number; right: number }; onClose: () => void; items: ActionMenuItem[] }> = ({ pos, onClose, items }) => {
  return createPortal(
    <div data-action-menu className="fixed z-[9999] animate-fadeIn" style={{ top: pos.top, right: pos.right, maxHeight: '70vh', overflowY: 'auto' }}>
      <div className="rounded-xl shadow-lg py-0.5" style={{ background: 'var(--surface)', border: '1px solid var(--border)', minWidth: '150px' }}>
        <div className="flex items-center justify-between px-2.5 py-1 border-b" style={{ borderColor: 'var(--border)' }}>
          <span className="text-[9px] font-bold" style={{ color: 'var(--text-3)' }}>عملیات</span>
          <button onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="w-4 h-4 rounded-full flex items-center justify-center transition-all active:scale-90 hover:opacity-70"
            style={{ color: 'var(--text-3)' }}>
            <i className="fas fa-times text-[7px]"></i>
          </button>
        </div>
        {items.map((it, i) => it.divider ? (
          <div key={i} className="h-px mx-2.5" style={{ background: 'var(--border)' }}></div>
        ) : (
          <button key={i} onClick={(e) => { e.stopPropagation(); onClose(); it.onClick?.(); }}
            className="w-full text-right px-2.5 py-2 text-[11px] font-medium flex items-center gap-2 transition-colors hover:bg-white/5"
            style={{ color: it.color || 'var(--text)' }}>
            <i className={`${it.icon} text-[9px]`} style={{ color: it.color || 'var(--text-3)' }}></i> {it.label}
          </button>
        ))}
      </div>
    </div>,
    document.body
  );
};

export const QuoteBlock: React.FC<{ text: string; author?: string }> = ({ text, author }) => (
  <div className="p-1.5 rounded-lg mb-1.5 cursor-pointer" style={{ background: 'color-mix(in srgb, var(--primary) 10%, transparent)', borderRight: '3px solid var(--primary)' }}>
    {author && <p className="text-[9px] font-bold mb-0.5" style={{ color: 'var(--primary)' }}>{author}</p>}
    <p className="text-[10px] leading-relaxed line-clamp-2 break-words" style={{ color: 'var(--text-3)' }}>{text}</p>
  </div>
);

export const QuoteChip: React.FC<{ text: string; onCancel: () => void }> = ({ text, onCancel }) => (
  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl mb-1.5" style={{ background: 'color-mix(in srgb, var(--primary) 8%, var(--surface))', border: '1px solid color-mix(in srgb, var(--primary) 20%, transparent)' }}>
    <i className="fas fa-quote-right text-[8px]" style={{ color: 'var(--primary)' }}></i>
    <span className="flex-1 min-w-0 text-[10px] truncate" style={{ color: 'var(--text-2)' }}>{text}</span>
    <button onClick={onCancel} className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 transition-all hover:opacity-70" style={{ color: 'var(--text-3)' }}>
      <i className="fas fa-times text-[7px]"></i>
    </button>
  </div>
);

export const QuoteBar: React.FC<{ show: boolean; onClick: () => void }> = ({ show, onClick }) => {
  if (!show) return null;
  return (
    <div className="mb-1.5 animate-fadeIn">
      <button onClick={onClick}
        className="rounded-lg px-2.5 py-1 text-[10px] font-bold flex items-center gap-1.5 transition-all active:scale-95 hover:opacity-80"
        style={{ background: 'color-mix(in srgb, var(--primary) 12%, transparent)', border: '1px solid color-mix(in srgb, var(--primary) 40%, transparent)', color: 'var(--primary)' }}>
        <i className="fas fa-quote-right text-[9px]"></i>
        نقل‌قول و پاسخ
      </button>
    </div>
  );
};

export function useSelectionQuote(onPick: (cid: string, text: string, rect: DOMRect) => void) {
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;
  useEffect(() => {
    const handler = () => {
      setTimeout(() => {
        const sel = window.getSelection();
        const text = sel?.toString().trim();
        if (!sel || !text || !sel.anchorNode || sel.isCollapsed) return;
        const el = sel.anchorNode.parentElement?.closest?.('[data-comment-text]');
        if (!el) return;
        const cid = el.getAttribute('data-cid');
        if (!cid) return;
        let rect: DOMRect | null = null;
        try {
          if (sel.rangeCount > 0) rect = sel.getRangeAt(0).getBoundingClientRect();
        } catch {}
        if (rect && rect.width > 0) onPickRef.current(cid, text, rect);
      }, 10);
    };
    document.addEventListener('selectionchange', handler);
    return () => document.removeEventListener('selectionchange', handler);
  }, []);
}