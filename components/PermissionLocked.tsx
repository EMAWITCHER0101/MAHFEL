import { useEffect, useState } from 'react';

interface PermissionLockedProps {
  permissionLabel: string;
  children: React.ReactNode;
  isLocked: boolean;
  onUnlock?: () => void;
}

export default function PermissionLocked({ permissionLabel, children, isLocked, onUnlock }: PermissionLockedProps) {
  const [showOverlay, setShowOverlay] = useState(isLocked);

  useEffect(() => {
    if (isLocked) {
      setShowOverlay(true);
    } else if (showOverlay) {
      const timer = setTimeout(() => setShowOverlay(false), 600);
      return () => clearTimeout(timer);
    }
  }, [isLocked]);

  if (!showOverlay) {
    return <>{children}</>;
  }

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* Original content - blurred and dimmed */}
      <div className={`${isLocked ? 'blur-[2px] brightness-50 select-none pointer-events-none' : 'blur-0 brightness-100 select-auto pointer-events-auto transition-all duration-500'}`}>
        {children}
      </div>

      {/* Lock overlay */}
      <div className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-500 ease-out ${
        isLocked
          ? 'opacity-100'
          : 'opacity-0 pointer-events-none'
      }`}>
        {/* Animated background */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900/90 via-gray-800/90 to-gray-900/90 backdrop-blur-sm" />

        {/* Floating particles */}
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1.5 h-1.5 rounded-full bg-white/10 animate-float"
            style={{
              left: `${15 + i * 15}%`,
              animationDelay: `${i * 0.5}s`,
              animationDuration: `${2 + i * 0.3}s`,
            }}
          />
        ))}

        {/* Lock icon with glow */}
        <div className="relative z-10 mb-4">
          <div className="absolute inset-0 w-20 h-20 rounded-full bg-red-500/20 blur-xl animate-pulse" />
          <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-2xl animate-lockBounce">
            <i className="fas fa-lock text-white text-2xl" />
          </div>
        </div>

        {/* Message */}
        <div className="relative z-10 text-center px-6">
          <p className="text-white font-black text-sm mb-1.5 animate-fadeInUp">
            دسترسی غیرفعال
          </p>
          <p className="text-white/60 text-[11px] leading-relaxed animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
            {permissionLabel}
          </p>
          <p className="text-white/40 text-[9px] mt-2 animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
            توسط مدیر سیستم غیرفعال شده است
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes lockBounce {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.3; }
          50% { transform: translateY(-20px) rotate(180deg); opacity: 0.1; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-lockBounce {
          animation: lockBounce 2s ease-in-out infinite;
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        .animate-fadeInUp {
          animation: fadeInUp 0.5s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </div>
  );
}
