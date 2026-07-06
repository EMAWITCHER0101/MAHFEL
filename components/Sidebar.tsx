
import React from 'react';
import type { Page, UserRole, User } from '../types';
import { SohaIcon, SohaFullLogotype } from './SohaLogo';
import { getInitials, getRandomTailwindColor } from '../utils/helpers';

interface SidebarProps {
  activeTab: Page;
  onTabChange: (tab: Page) => void;
  isOpen: boolean;
  onClose: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onOpenSearch: () => void;
  onOpenAdmin: () => void;
  onOpenProfile: () => void;
  user: User | null;
  isAuthenticated: boolean;
  collapsed?: boolean;
  onToggleCollapsed?: (v: boolean) => void;
}

const NAV_ITEMS: { page: Page; icon: string; label: string }[] = [
  { page: 'mahfel', icon: 'fas fa-comments', label: 'محفل' },
  { page: 'sowt', icon: 'fas fa-podcast', label: 'صوت' },
  { page: 'library', icon: 'fas fa-book-open', label: 'کتابخانه' },
  { page: 'videos', icon: 'fas fa-video', label: 'ویدیو' },
  { page: 'nashr', icon: 'fas fa-book-reader', label: 'نشر' },
  { page: 'ai', icon: 'fas fa-robot', label: 'هوش مصنوعی' },
];

const Sidebar: React.FC<SidebarProps> = ({
  activeTab, onTabChange, isOpen, onClose, theme, onToggleTheme,
  onOpenSearch, onOpenAdmin, onOpenProfile, user, isAuthenticated,
  collapsed = false, onToggleCollapsed,
}) => {
  const isDark = theme === 'dark';

  const handleCollapse = (val: boolean) => {
    if (onToggleCollapsed) onToggleCollapsed(val);
  };

  return (
    <>
      {/* Overlay for mobile/tablet */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/40 z-[600] lg:hidden animate-fadeIn" onClick={onClose} />
      )}

      {/* Sidebar - desktop only */}
      <aside className={`
        hidden lg:block lg:h-screen
        transition-all duration-300 ease-in-out flex-shrink-0
        ${collapsed ? 'w-0 lg:w-0 overflow-hidden' : 'w-52'}
        ${isDark ? 'bg-gray-900 border-l border-gray-800' : 'bg-white border-l border-gray-100'}
        shadow-lg
      `}>
        <div className="flex flex-col h-full min-w-52">

          {/* Logo */}
          <div className="px-3 py-4 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => onTabChange('mahfel')}>
              <SohaIcon size={36} />
              <SohaFullLogotype isDark={isDark} />
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2 py-2.5 space-y-0.5">
            {NAV_ITEMS.map(item => {
              const isActive = activeTab === item.page;
              return (
                <button
                  key={item.page}
                  onClick={() => onTabChange(item.page)}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : isDark
                        ? 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                        : 'text-text-secondary hover:bg-gray-50 hover:text-text-primary'
                  }`}
                >
                  <i className={`${item.icon} text-sm ${isActive ? 'text-primary' : ''}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Theme + Profile */}
          <div className="px-2 pb-2.5 space-y-0.5 border-t border-gray-100 dark:border-gray-800 pt-2.5">
            <button
              onClick={onToggleTheme}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-bold transition-all ${
                isDark ? 'text-gray-400 hover:bg-gray-800 hover:text-gray-200' : 'text-text-secondary hover:bg-gray-50 hover:text-text-primary'
              }`}
            >
              <i className={`fas ${isDark ? 'fa-sun' : 'fa-moon'} text-sm`} />
              <span>{isDark ? 'حالت روشن' : 'حالت تیره'}</span>
            </button>
          </div>
        </div>
      </aside>

    </>
  );
};

export default Sidebar;
