import React, { useEffect, useRef, useState } from 'react';

interface NotificationBannerProps {
  title: string;
  body: string;
  link?: string;
  onClose: () => void;
  onClick?: (link?: string) => void;
}

const NotificationBanner: React.FC<NotificationBannerProps> = ({ title, body, link, onClose, onClick }) => {
  const [isVisible, setIsVisible] = useState(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const dismiss = () => {
    setIsVisible(false);
    setTimeout(() => onCloseRef.current(), 300);
  };

  useEffect(() => {
    if (title) {
      setIsVisible(true);
      const timer = setTimeout(dismiss, 10000);
      return () => clearTimeout(timer);
    }
  }, [title, body]);

  return (
    <div
      className={`fixed bottom-20 left-1/2 -translate-x-1/2 z-[9998] w-[92vw] max-w-md transition-all duration-300 ease-in-out ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0 pointer-events-none'
      }`}
      style={{ direction: 'rtl' }}
    >
      <div className="bg-gray-900/95 backdrop-blur-md border border-primary/30 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-start gap-3 p-4">
          <div className="w-10 h-10 flex-shrink-0 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center">
            <i className="fas fa-bell text-primary text-sm"></i>
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <p className="text-sm font-black text-white mb-1">{title}</p>
            <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-line">{body}</p>
          </div>
          <button
            onClick={dismiss}
            className="flex-shrink-0 w-7 h-7 rounded-full hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center transition-all"
            aria-label="بستن"
          >
            <i className="fas fa-times text-xs"></i>
          </button>
        </div>
        <div
          className="h-0.5 bg-primary/40 progress-notif"
          onClick={(e) => e.stopPropagation()}
        ></div>
        <button
          onClick={() => {
            onClick?.(link);
            dismiss();
          }}
          className="w-full block text-center py-2 text-xs font-bold text-primary hover:bg-white/5 transition-all"
        >
          مشاهده
        </button>
        <style>{`
          .progress-notif { animation: notifbar 10s linear forwards; transform-origin: right; }
          @keyframes notifbar { from { transform: scaleX(1); } to { transform: scaleX(0); } }
        `}</style>
      </div>
    </div>
  );
};

export default NotificationBanner;
