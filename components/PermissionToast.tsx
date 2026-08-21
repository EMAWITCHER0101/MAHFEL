import { useEffect, useState } from 'react';

interface PermissionToastProps {
  message: string;
  type: 'enabled' | 'disabled';
  onClose: () => void;
  duration?: number;
}

export default function PermissionToast({ message, type, onClose, duration = 4000 }: PermissionToastProps) {
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => {
      setClosing(true);
      setTimeout(onClose, 500);
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const isEnabled = type === 'enabled';

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none" onClick={() => { setClosing(true); setTimeout(onClose, 500); }}>
      <div
        className={`relative pointer-events-auto transition-all duration-500 ease-out ${
          visible && !closing ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-75 translate-y-8'
        }`}
      >
        {/* Backdrop glow */}
        <div className={`absolute inset-0 rounded-3xl blur-2xl opacity-30 ${
          isEnabled ? 'bg-green-400' : 'bg-red-400'
        }`} />

        {/* Main card */}
        <div className={`relative bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border overflow-hidden max-w-sm w-[90vw] ${
          isEnabled ? 'border-green-200' : 'border-red-200'
        }`}>
          {/* Top accent line */}
          <div className={`h-1 w-full ${
            isEnabled
              ? 'bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400'
              : 'bg-gradient-to-r from-red-400 via-rose-400 to-pink-400'
          }`} />

          <div className="p-5 flex items-center gap-4">
            {/* Icon with pulse animation */}
            <div className={`relative flex-shrink-0`}>
              <div className={`absolute inset-0 rounded-full animate-ping opacity-20 ${
                isEnabled ? 'bg-green-400' : 'bg-red-400'
              }`} />
              <div className={`relative w-14 h-14 rounded-full flex items-center justify-center shadow-lg ${
                isEnabled
                  ? 'bg-gradient-to-br from-green-400 to-emerald-500'
                  : 'bg-gradient-to-br from-red-400 to-rose-500'
              }`}>
                <i className={`fas ${isEnabled ? 'fa-unlock text-white' : 'fa-lock text-white'} text-xl`} />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <p className={`text-sm font-black mb-0.5 ${
                isEnabled ? 'text-green-700' : 'text-red-700'
              }`}>
                {isEnabled ? 'دسترسی فعال شد' : 'دسترسی غیرفعال شد'}
              </p>
              <p className="text-[11px] text-gray-500 leading-relaxed">
                {message}
              </p>
            </div>

            {/* Close X */}
            <button onClick={() => { setClosing(true); setTimeout(onClose, 500); }}
              className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-all">
              <i className="fas fa-times text-[10px]"></i>
            </button>
          </div>

          {/* Progress bar */}
          <div className="h-0.5 bg-gray-100">
            <div
              className={`h-full rounded-full transition-all ease-linear ${
                isEnabled ? 'bg-green-400' : 'bg-red-400'
              }`}
              style={{
                width: closing ? '0%' : '100%',
                transitionDuration: closing ? '500ms' : `${duration}ms`,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
