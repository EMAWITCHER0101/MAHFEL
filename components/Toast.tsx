
import React, { useEffect, useRef, useState } from 'react';

interface ToastProps {
  message: string;
  onClose: () => void;
  id?: number;
  duration?: number;
  image?: string;
  name?: string;
}

const Toast: React.FC<ToastProps> = ({ message, onClose, duration = 3000, image, name }) => {
  const [isVisible, setIsVisible] = useState(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (message) {
      setIsVisible(true);
      const closeTimer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => onCloseRef.current(), 300);
      }, duration);
      return () => clearTimeout(closeTimer);
    }
  }, [message, duration]);

  return (
    <div
      className={`fixed top-5 right-5 sm:right-5 z-[9999] bg-gray-900/90 backdrop-blur-md text-white px-4 py-2.5 rounded-2xl shadow-2xl transition-all duration-300 ease-in-out flex items-center gap-3 border border-white/10 max-w-[90vw] ${
        isVisible ? 'translate-y-0 opacity-100' : '-translate-y-10 opacity-0'
      }`}
      role="alert"
    >
      {image && (
        <img src={image} alt="" className="w-9 h-9 rounded-xl object-cover flex-shrink-0 ring-1 ring-white/10" />
      )}
      <div className="flex-1 min-w-0">
        {name && <p className="text-[11px] text-white/50 truncate leading-tight">{name}</p>}
        <div className="flex items-center gap-2">
          <i className="fas fa-check-circle text-primary text-xs flex-shrink-0"></i>
          <span className="text-xs font-bold truncate">{message}</span>
        </div>
      </div>
    </div>
  );
};

export default Toast;
