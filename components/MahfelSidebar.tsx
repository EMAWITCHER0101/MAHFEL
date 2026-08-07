
import React from 'react';
import type { Page } from '../types';
import { SohaFullLogotype } from './SohaLogo';

interface MahfelSidebarProps {
  activeTab: Page;
  onTabChange: (tab: Page) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
  onOpenProfile?: () => void;
}

const NAV_ITEMS: { page: Page; icon: string; label: string }[] = [
  { page: 'mahfel', icon: 'fas fa-comments', label: 'محفل' },
  { page: 'sowt', icon: 'fas fa-podcast', label: 'صوت' },
  { page: 'library', icon: 'fas fa-book-open', label: 'کتابخانه' },
  { page: 'videos', icon: 'fas fa-video', label: 'ویدیو' },
  { page: 'nashr', icon: 'fas fa-book-reader', label: 'نشر' },
  { page: 'ai', icon: 'fas fa-robot', label: 'هوش مصنوعی' },
];

const MahfelSidebar: React.FC<MahfelSidebarProps> = ({
  activeTab, onTabChange, open, onOpenChange, theme = 'light',
  onToggleTheme, onOpenProfile,
}) => {
  const isDark = theme === 'dark';

  const handleNav = (tab: Page) => {
    onTabChange(tab);
    onOpenChange(false);
  };

  return (
    <>
      {/* Overlay */}
      {open && (
        <div className="fixed inset-0 bg-black/40 z-[500] animate-fadeIn" onClick={() => onOpenChange(false)} />
      )}

      {/* Drawer - right side */}
      <div className={`
        fixed top-0 right-0 h-full w-52 z-[501]
        transition-all duration-300 ease-in-out
        ${open ? 'translate-x-0' : 'translate-x-full'}
        ${isDark ? 'bg-gray-900' : 'bg-white'}
        shadow-2xl
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="relative flex items-center justify-center px-3 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
            <SohaFullLogotype isDark={isDark} />
            <button onClick={() => onOpenChange(false)}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg flex items-center justify-center active:scale-90 transition-all"
              style={{ color: 'var(--text-3)' }}>
              <i className="fas fa-times text-xs"></i>
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-3 space-y-0.5">
            {NAV_ITEMS.map(item => {
              const isActive = activeTab === item.page;
              return (
                <button key={item.page}
                  onClick={() => handleNav(item.page)}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-bold transition-all ${
                    isActive
                      ? 'text-white'
                      : isDark ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  style={isActive ? { background: 'linear-gradient(135deg, var(--primary), #0d9488)' } : {}}
                >
                  <i className={`${item.icon} text-base`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Bottom actions */}
          <div className="px-3 pb-3 space-y-0.5 border-t" style={{ borderColor: 'var(--border)', paddingTop: '8px' }}>
            {onToggleTheme && (
              <button onClick={onToggleTheme}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold transition-all ${
                  isDark ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-100'
                }`}>
                <i className={`fas ${isDark ? 'fa-sun' : 'fa-moon'} text-base`} />
                <span>{isDark ? 'روشن' : 'تیره'}</span>
              </button>
            )}
            {onOpenProfile && (
              <button onClick={onOpenProfile}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold transition-all ${
                  isDark ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-100'
                }`}>
                <i className="fas fa-user text-base" />
                <span>پروفایل</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default MahfelSidebar;
