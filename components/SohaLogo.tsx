import React from 'react';

export const SohaLogo: React.FC<{ size?: number; className?: string }> = ({ size = 56, className = '' }) => (
  <div
    className={`flex items-center justify-center rounded-full bg-white ${className}`}
    style={{ width: size, height: size }}
  >
    <img src="/logo.png" width={size * 0.85} height={size * 0.85} className="object-contain" alt="سها" />
  </div>
);

export const SohaLogotype: React.FC<{ className?: string; isDark?: boolean; fontSize?: string }> = ({ className = '', isDark = false, fontSize }) => (
  <div
    className={`whitespace-nowrap text-[1.6rem] sm:text-[2.6rem] ${className}`}
    style={{
      fontFamily: 'var(--font-nastaliq), IranNastaliq, serif',
      color: '#14b8a6',
      ...(fontSize ? { fontSize } : {}),
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
    className={`soha-logo-sheen whitespace-nowrap text-[1.5rem] ${className}`}
    style={{
      fontFamily: 'var(--font-nastaliq), IranNastaliq, serif',
      lineHeight: 1.6,
      letterSpacing: '0.3px',
    }}
  >
    سرای هنر و اندیشه
  </div>
);
