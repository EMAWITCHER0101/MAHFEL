
import React, { useState, useRef } from 'react';
import type { Page, UserRole } from '../types';
import { toPersianDigits } from '../utils/helpers';

interface BottomTabsProps {
  activeTab: Page;
  onTabChange: (tab: Page) => void;
  onLongPressCentral?: () => void;
  newMahfelMessages: number;
  theme?: 'light' | 'dark';
  userRole?: UserRole;
  hidden?: boolean;
  onToggle?: (hidden: boolean) => void;
  chatInput?: boolean;
  chatInputText?: string;
  onChatInputChange?: (text: string) => void;
  onChatSend?: () => void;
  onChatClose?: () => void;
  chatSending?: boolean;
  inputRef?: React.RefObject<HTMLTextAreaElement | null>;
}

const TABS_LEFT: { page: Page; icon: string; label: string }[] = [
  { page: 'sowt', icon: 'fas fa-podcast', label: 'صوت' },
  { page: 'library', icon: 'fas fa-book-open', label: 'کتابخانه' },
  { page: 'ai', icon: 'fas fa-robot', label: 'AI' },
];

const TABS_RIGHT: { page: Page; icon: string; label: string }[] = [
  { page: 'videos', icon: 'fas fa-video', label: 'ویدیو' },
  { page: 'nashr', icon: 'fas fa-book-reader', label: 'نشر' },
];

const TabItem: React.FC<{
  tab: { page: Page; icon: string; label: string };
  isActive: boolean;
  onClick: (tab: Page) => void;
  isDark: boolean;
}> = ({ tab, isActive, onClick, isDark }) => {
  return (
    <div className="flex-1 flex justify-center items-center" onClick={() => onClick(tab.page)} data-guide={tab.page}>
      <div className="relative flex flex-col items-center justify-center gap-1 cursor-pointer group w-16 h-14">
        {/* Active indicator dot */}
        {isActive && (
          <div className="absolute -top-1 w-1 h-1 rounded-full animate-fadeIn"
            style={{ background: 'var(--primary)' }} />
        )}
        <div className={`text-lg transition-all duration-300 ${isActive ? '-mt-0.5 scale-110' : 'group-hover:scale-105'}`}
          style={{ color: isActive ? 'var(--primary)' : isDark ? '#9ca3af' : '#6b7280' }}>
          <i className={tab.icon} />
        </div>
        <div className={`text-[10px] transition-all duration-300 ${isActive ? 'font-bold' : 'font-medium'}`}
          style={{ color: isActive ? 'var(--primary)' : isDark ? '#9ca3af' : '#6b7280' }}>
          {tab.label}
        </div>
        {/* Glow under active */}
        {isActive && (
          <div className="absolute -bottom-1 w-8 h-1 rounded-full opacity-40 animate-fadeIn"
            style={{ background: 'var(--primary)', filter: 'blur(4px)' }} />
        )}
      </div>
    </div>
  );
};

const CentralButton: React.FC<{
  onClick: () => void;
  onLongPress?: () => void;
  isActive: boolean;
  notificationCount: number;
  isDark: boolean;
  page: Page;
  userRole?: UserRole;
}> = ({ onClick, onLongPress, isActive, notificationCount, isDark, page, userRole }) => {
  const [isPressing, setIsPressing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [hasDoneLongPress, setHasDoneLongPress] = useState(() => {
    return localStorage.getItem('soha_has_long_pressed_write') === 'true';
  });

  const timerRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);

  const canWrite = userRole === 'admin' || userRole === 'author';
  const showHint = isActive && canWrite && !hasDoneLongPress;

  const startPress = (e: React.PointerEvent) => {
    if (page !== 'mahfel' || !canWrite) return;
    setIsPressing(true);
    setProgress(0);
    timerRef.current = window.setTimeout(() => {
      if (onLongPress) onLongPress();
      if (!hasDoneLongPress) {
        localStorage.setItem('soha_has_long_pressed_write', 'true');
        setHasDoneLongPress(true);
      }
      stopPress();
    }, 800);
    intervalRef.current = window.setInterval(() => {
      setProgress(prev => Math.min(prev + (100 / 16), 100));
    }, 50);
  };

  const stopPress = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsPressing(false);
    setProgress(0);
  };

  return (
    <div className="flex-shrink-0 relative">
      {/* Progress Circle during hold */}
      {isPressing && canWrite && (
        <svg className="absolute -top-[34px] left-1/2 -translate-x-1/2 w-[72px] h-[72px] rotate-[-90deg] pointer-events-none z-10" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="46" fill="none" stroke="white" strokeWidth="4"
            strokeDasharray="289" strokeDashoffset={289 - (289 * progress / 100)}
            className="transition-all duration-75" />
        </svg>
      )}

      {/* Pulsing Hint */}
      {showHint && !isPressing && (
        <span className="absolute -top-7 left-1/2 -translate-x-1/2 flex h-14 w-14 pointer-events-none">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-20"
            style={{ background: 'var(--primary)' }} />
        </span>
      )}

      {/* Text Hint */}
      {showHint && (
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black/70 text-white text-[8px] font-black px-2 py-1 rounded-full pointer-events-none transition-all animate-bounce">
          نگه دارید: نوشتن
        </div>
      )}

      <button
        onPointerDown={startPress}
        onPointerUp={stopPress}
        onPointerLeave={stopPress}
        onClick={(e) => { if (progress < 50) onClick(); }}
        data-guide="write-post"
        aria-label="محفل"
        className={`w-14 h-14 rounded-full -mt-7 flex items-center justify-center shadow-lg transition-all duration-300 ease-in-out relative z-20 ${
          isPressing && canWrite ? 'scale-110 shadow-2xl' : 'hover:scale-105'
        }`}
        style={{
          background: isActive
            ? 'linear-gradient(135deg, var(--primary), var(--secondary))'
            : isDark
              ? 'linear-gradient(135deg, #334155, #475569)'
              : 'linear-gradient(135deg, #475569, #334155)',
          boxShadow: isActive
            ? '0 4px 20px rgba(var(--primary), 0.4), 0 0 30px rgba(var(--primary), 0.2)'
            : '0 4px 15px rgba(0,0,0,0.2)',
        }}
      >
        <i className={`fas fa-comments text-xl text-white transition-transform ${isPressing && canWrite ? 'scale-110' : ''}`} />
        {notificationCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2"
            style={{ borderColor: isDark ? '#111827' : '#ffffff' }}>
            {toPersianDigits(notificationCount)}
          </span>
        )}
        {/* Glow ring when active */}
        {isActive && (
          <div className="absolute inset-0 rounded-full animate-pulse"
            style={{ boxShadow: '0 0 20px rgba(var(--primary), 0.3)' }} />
        )}
      </button>
    </div>
  );
};

const BottomTabs: React.FC<BottomTabsProps> = ({ activeTab, onTabChange, onLongPressCentral, newMahfelMessages, theme = 'light', userRole, hidden, onToggle, chatInput, chatInputText, onChatInputChange, onChatSend, onChatClose, chatSending, inputRef }) => {
  const isDark = theme === 'dark';
  const touchStartY = useRef(0);

  const setHidden = (val: boolean) => {
    if (onToggle) onToggle(val);
  };

  return (
    <>
      {/* Show button when hidden */}
      {hidden && (
        <button onClick={() => setHidden(false)}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[501] lg:hidden w-10 h-10 rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-all"
          style={{
            background: isDark ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)',
            border: '1px solid var(--border)',
            boxShadow: isDark ? '0 4px 15px rgba(0,0,0,0.4)' : '0 4px 15px rgba(0,0,0,0.1)',
            color: 'var(--primary)',
          }}>
          <i className="fas fa-chevron-up text-sm"></i>
        </button>
      )}

      {/* Bottom tabs bar */}
      <div className={`
        fixed bottom-0 left-0 right-0 backdrop-blur-xl border-t z-[500] lg:hidden
        transition-all duration-300 ease-in-out
        ${hidden ? 'translate-y-[120%]' : 'translate-y-0'}
        ${chatInput ? 'h-auto pb-2' : 'h-16'}
      `}
        style={{
          background: isDark ? 'rgba(17, 24, 39, 0.95)' : 'rgba(255, 255, 255, 0.95)',
          borderColor: 'var(--border)',
          boxShadow: isDark
            ? '0 -4px 30px rgba(0,0,0,0.4)'
            : '0 -4px 30px rgba(0,0,0,0.08)',
        }}
        onTouchStart={(e) => { touchStartY.current = e.touches[0].clientY; }}
        onTouchEnd={(e) => { if (e.changedTouches[0].clientY - touchStartY.current > 40) setHidden(true); }}
      >
        {/* Drag handle for dismiss */}
        {!chatInput && (
          <div className="absolute left-1/2 -translate-x-1/2 z-10" style={{ top: '-6px' }} onClick={() => setHidden(true)}>
            <div className="w-10 h-[5px] rounded-full cursor-pointer active:scale-75 transition-all duration-200" style={{ background: 'var(--primary)', opacity: 0.35 }} />
          </div>
        )}

        {/* Close icon at top-left */}
        {!chatInput && (
          <button onClick={() => setHidden(true)}
            className="absolute top-0 left-0.5 w-7 h-7 flex items-center justify-center rounded-lg active:scale-75 transition-all z-10 hover:opacity-60"
            style={{ color: 'var(--text-3)' }}>
            <i className="fas fa-chevron-down text-[10px]"></i>
          </button>
        )}

        {chatInput && (
          <div className="px-2 pt-2 pb-1 border-b" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-2">
              <button onClick={onChatClose} className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ color: 'var(--text-3)' }}>
                <i className="fas fa-times text-xs"></i>
              </button>
              <textarea ref={inputRef as any} value={chatInputText || ''} onChange={(e) => onChatInputChange?.(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onChatSend?.(); } }} placeholder="پیام..." rows={1} autoFocus className="chat-input-area flex-1 rounded-xl px-3 py-2 text-sm outline-none resize-none transition-all font-medium" style={{ background: 'var(--surface-2)', color: 'var(--text)', border: '1px solid var(--border)', maxHeight: '80px', direction: 'rtl' }} />
              <button onClick={onChatSend} disabled={(!chatInputText?.trim()) || chatSending} className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 disabled:opacity-40 transition-all active:scale-90" style={{ background: 'linear-gradient(135deg, var(--primary), #0d9488)', color: 'white' }}>
                <i className={`fas ${chatSending ? 'fa-spinner fa-spin' : 'fa-paper-plane'} text-xs`}></i>
              </button>
            </div>
          </div>
        )}
        <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
          <TabItem tab={TABS_LEFT[0]} isActive={activeTab === TABS_LEFT[0].page} onClick={onTabChange} isDark={isDark} />
          <TabItem tab={TABS_LEFT[1]} isActive={activeTab === TABS_LEFT[1].page} onClick={onTabChange} isDark={isDark} />

          <CentralButton
            onClick={() => onTabChange('mahfel')}
            onLongPress={onLongPressCentral}
            isActive={activeTab === 'mahfel'}
            notificationCount={newMahfelMessages}
            isDark={isDark}
            page={activeTab}
            userRole={userRole}
          />

          <TabItem tab={TABS_RIGHT[0]} isActive={activeTab === TABS_RIGHT[0].page} onClick={onTabChange} isDark={isDark} />
          <TabItem tab={TABS_RIGHT[1]} isActive={activeTab === TABS_RIGHT[1].page} onClick={onTabChange} isDark={isDark} />
        </div>
      </div>


    </>
  );
};

export default BottomTabs;
