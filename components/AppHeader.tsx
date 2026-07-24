
import React from 'react';
import { User } from '../types';
import { getInitials, getRandomTailwindColor } from '../utils/helpers';
import { SohaIcon, SohaLogotype } from './SohaLogo';

interface AppHeaderProps {
  onOpenAdmin: () => void;
  onOpenProfile: () => void;
  onOpenSearch: () => void;
  onOpenSidebar: () => void;
  onToggleTheme: () => void;
  isVisible: boolean;
  liveStream: { isLive: boolean; url: string };
  theme: 'light' | 'dark';
  isAuthenticated: boolean;
  user: User | null;
}

const AppHeader: React.FC<AppHeaderProps> = ({ onOpenAdmin, onOpenProfile, onOpenSearch, onOpenSidebar, onToggleTheme, isVisible, liveStream, theme, isAuthenticated, user }) => {
  const isDark = theme === 'dark';
  const isAdmin = user?.role === 'admin';

  const headerVisibilityClass = isVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0';

  return (
    <header
      className={`p-[15px] border-b sticky top-0 z-50 transition-all duration-300 ${headerVisibilityClass}`}
      style={{
        background: isDark ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderColor: 'var(--border)',
        boxShadow: isDark ? '0 4px 30px rgba(0,0,0,0.3)' : '0 4px 30px rgba(0,0,0,0.08)',
      }}
    >
      <div className="flex justify-between items-center px-2 sm:px-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="transition-transform duration-300 hover:scale-105">
              <SohaIcon size={36} />
            </div>
            <SohaLogotype className="hidden sm:block" isDark={isDark} />
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {liveStream.isLive && (
            <a href={liveStream.url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 text-[10px] font-black px-3 py-2 rounded-xl transition-all duration-300 active:scale-95 hidden sm:flex"
              style={{
                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(220, 38, 38, 0.1))',
                color: '#ef4444',
                border: '1px solid rgba(239, 68, 68, 0.2)',
              }}
            >
              <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" /><span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" /></span>
              <span>پخش زنده</span>
            </a>
          )}
          <button onClick={onOpenSearch} className="p-2.5 rounded-xl transition-all duration-300 active:scale-90" style={{ color: 'var(--text-2)' }} title="جستجو"><i className="fas fa-search text-[14px]" /></button>
          <button onClick={onToggleTheme} className="p-2.5 rounded-xl transition-all duration-300 lg:hidden active:scale-90" style={{ color: 'var(--text-2)' }} title="تغییر تم"><i className={`fas ${isDark ? 'fa-sun' : 'fa-moon'} text-[14px]`} /></button>
          {isAdmin && (
            <button onClick={onOpenAdmin} className="p-2.5 rounded-xl transition-all duration-300 lg:hidden active:scale-90" style={{ color: 'var(--text-2)' }} title="مدیریت سیستم"><i className="fas fa-cog text-[14px]" /></button>
          )}
          <button className="rounded-xl transition-all duration-300 active:scale-90" onClick={onOpenProfile} data-guide="profile">
            {isAuthenticated && user ? (
              user.avatar ? (
                <img src={user.avatar} className="w-8 h-8 rounded-xl border-2 object-cover" style={{ borderColor: 'var(--primary)' }} alt="profile" />
              ) : (
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-[10px] font-black border-2 border-white/20 shadow-md"
                  style={{ background: `linear-gradient(135deg, hsl(${(user.name.charCodeAt(0) * 37) % 360}, 60%, 50%), hsl(${(user.name.charCodeAt(0) * 73) % 360}, 60%, 40%))` }}>
                  {getInitials(user.name)}
                </div>
              )
            ) : (
              <div className="w-8 h-8 rounded-xl flex items-center justify-center border" style={{ background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text-3)' }}>
                <i className="fas fa-user text-sm" />
              </div>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
