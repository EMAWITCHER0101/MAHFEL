import React, { useEffect, useState } from 'react';

interface ConfirmToastProps {
  open: boolean;
  message: string;
  icon?: string;
  confirmLabel?: string;
  bottom?: number;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmToast: React.FC<ConfirmToastProps> = ({ open, message, icon = 'fa-trash-can', confirmLabel = 'بله، حذف شود', bottom = 24, onConfirm, onCancel }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [open]);

  if (!open && !isVisible) return null;

  return (
    <div className="fixed inset-x-0 z-[9998] flex justify-center px-4 pointer-events-none" style={{ bottom }}>
      <div
        className={`pointer-events-auto w-full max-w-sm rounded-3xl p-5 shadow-2xl backdrop-blur-xl transition-all duration-300 ease-in-out ${
          isVisible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
        }`}
        style={{ background: 'rgba(20,20,28,0.92)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg" style={{ background: 'linear-gradient(135deg, #ef4444, #f97316)', boxShadow: '0 6px 18px rgba(239,68,68,0.35)' }}>
            <i className={`fas ${icon} text-white text-sm`}></i>
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <p className="text-white text-[13px] font-black leading-6">{message}</p>
            <p className="text-white/40 text-[10px] font-bold mt-1">این عمل قابل بازگشت نیست</p>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-4">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl text-[11px] font-black transition-all active:scale-95 text-white/70 hover:text-white"
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            انصراف
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl text-[11px] font-black text-white transition-all active:scale-95 shadow-lg"
            style={{ background: 'linear-gradient(135deg, #ef4444, #f97316)', boxShadow: '0 6px 16px rgba(239,68,68,0.35)' }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmToast;