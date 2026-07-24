import React, { useEffect, useState } from 'react';

interface DebugNotificationProps {
  title: string;
  options: NotificationOptions;
  onClose: () => void;
  duration?: number;
}

const DebugNotification: React.FC<DebugNotificationProps> = ({ title, options, onClose, duration = 5000 }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Animate in
    const inTimer = setTimeout(() => setIsVisible(true), 10);

    // Set timer to animate out
    const outTimer = setTimeout(() => {
      setIsVisible(false);
      // Call onClose after animation finishes
      setTimeout(onClose, 400); // Corresponds to transition duration
    }, duration);

    return () => {
      clearTimeout(inTimer);
      clearTimeout(outTimer);
    };
  }, [duration, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 400);
  };

  return (
    <div
      className={`fixed top-5 right-5 z-[9999] bg-gray-800/90 backdrop-blur-sm text-white p-3 rounded-xl shadow-2xl transition-all duration-300 ease-in-out flex items-start gap-3 w-80 max-w-[90vw] border border-white/20 ${
        isVisible ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0'
      }`}
      role="status"
      aria-live="polite"
    >
      {options.icon && <img src={String(options.icon)} alt="icon" className="w-12 h-12 rounded-lg flex-shrink-0 object-cover" />}
      <div className="flex-grow min-w-0">
        <p className="text-sm font-bold text-white">{title}</p>
        {options.body && <p className="text-xs text-white/80 mt-1 line-clamp-2">{options.body}</p>}
      </div>
      <button onClick={handleClose} className="w-6 h-6 rounded-full flex-shrink-0 text-white/50 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors">
        &times;
      </button>
    </div>
  );
};

export default DebugNotification;
