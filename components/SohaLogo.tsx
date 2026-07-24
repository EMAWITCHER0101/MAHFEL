import React from 'react';

export const SohaLogo: React.FC<{ size?: number; className?: string }> = ({ size = 56, className = '' }) => (
  <div
    className={`flex items-center justify-center rounded-full bg-white ${className}`}
    style={{ width: size, height: size }}
  >
    <img src="/logo.png" width={size * 0.85} height={size * 0.85} className="object-contain" alt="سها" />
  </div>
);

export const SohaLogotype: React.FC<{ className?: string; isDark?: boolean }> = ({ className = '', isDark = false }) => (
  <div
    className={`whitespace-nowrap ${className}`}
    style={{
      fontFamily: 'IranNastaliq, serif',
      color: '#14b8a6',
      fontSize: '2rem',
      lineHeight: 1.6,
      letterSpacing: '0.5px',
      textShadow: '0 2px 8px rgba(20, 184, 166, 0.2)',
    }}
  >
    سرای هنر و اندیشه
  </div>
);

export const SohaIcon: React.FC<{ size?: number; className?: string }> = ({ size = 28, className = '' }) => (
  <div
    className={`flex items-center justify-center rounded-full bg-white ${className}`}
    style={{ width: size, height: size }}
  >
    <img src="/logo.png" width={size * 0.85} height={size * 0.85} className="object-contain" alt="سها" />
  </div>
);

export const SohaFullLogotype: React.FC<{ className?: string; isDark?: boolean }> = ({ className = '', isDark = false }) => (
  <div
    className={`whitespace-nowrap ${className}`}
    style={{
      fontFamily: 'Vazirmatn, sans-serif',
      fontWeight: 900,
      fontSize: '1.8rem',
      lineHeight: 1.4,
      letterSpacing: '-0.5px',
      background: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 50%, #0f766e 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
      textShadow: 'none',
      filter: 'drop-shadow(0 2px 4px rgba(20, 184, 166, 0.3))',
    }}
  >
    سها سیما
  </div>
);
