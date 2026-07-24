import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { UserRole } from '../types';

export interface GuideStep {
  selector: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

interface OnboardingGuideProps {
  steps: GuideStep[];
  onComplete: () => void;
  role: UserRole;
}

const OnboardingGuide: React.FC<OnboardingGuideProps> = ({ steps, onComplete, role }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [cardStyle, setCardStyle] = useState<React.CSSProperties>({});
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;
  const progress = ((currentStep + 1) / steps.length) * 100;

  const calculatePosition = useCallback(() => {
    if (!step) return;
    const el = document.querySelector(step.selector);
    if (!el) {
      setTargetRect(null);
      return;
    }
    el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    setTimeout(() => {
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);
      const padding = 12;
      const pos = step.position || 'bottom';
      let top = 0, left = 0;
      switch (pos) {
        case 'top':
          top = rect.top - padding;
          left = rect.left + rect.width / 2;
          setCardStyle({ bottom: `calc(100vh - ${top}px + 12px)`, left: '50%', transform: 'translateX(-50%)' });
          break;
        case 'bottom':
          top = rect.bottom + padding;
          left = rect.left + rect.width / 2;
          setCardStyle({ top: `${top}px`, left: '50%', transform: 'translateX(-50%)' });
          break;
        case 'left':
          top = rect.top + rect.height / 2;
          left = rect.left - padding;
          setCardStyle({ top: `${top}px`, right: `calc(100vw - ${left}px + 12px)`, transform: 'translateY(-50%)' });
          break;
        case 'right':
          top = rect.top + rect.height / 2;
          left = rect.right + padding;
          setCardStyle({ top: `${top}px`, left: `${left}px`, transform: 'translateY(-50%)' });
          break;
      }
    }, 350);
  }, [step]);

  useEffect(() => {
    setIsVisible(false);
    const timer = setTimeout(() => {
      calculatePosition();
      setIsVisible(true);
    }, 100);
    return () => clearTimeout(timer);
  }, [currentStep, calculatePosition]);

  useEffect(() => {
    const handleResize = () => calculatePosition();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [calculatePosition]);

  const handleNext = () => {
    if (isLast) { onComplete(); } else { setCurrentStep(p => p + 1); }
  };
  const handlePrev = () => { if (currentStep > 0) setCurrentStep(p => p - 1); };

  if (!step) return null;

  return (
    <div className="fixed inset-0 z-[5000]" style={{ pointerEvents: 'none' }}>
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60 animate-fadeIn" style={{ pointerEvents: 'auto' }} onClick={onComplete} />

      {/* Highlight ring */}
      {targetRect && (
        <div
          className="absolute animate-pulse-ring"
          onClick={(e) => e.stopPropagation()}
          style={{
            top: targetRect.top - 8,
            left: targetRect.left - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16,
            border: `3px solid ${step.color}`,
            borderRadius: 16,
            boxShadow: `0 0 0 9999px rgba(0,0,0,0.55), 0 0 30px ${step.color}50`,
            pointerEvents: 'auto',
            transition: 'all 0.4s cubic-bezier(0.4,0,0.2,1)',
            zIndex: 5001,
          }}
        />
      )}

      {/* Guide Card */}
      <div
        ref={cardRef}
        onClick={(e) => e.stopPropagation()}
        className={`absolute z-[5002] w-[88vw] max-w-[340px] rounded-3xl shadow-2xl transition-all duration-500 pointer-events-auto ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
        style={{
          ...cardStyle,
          background: 'var(--surface, #ffffff)',
          border: `2px solid ${step.color}30`,
          overflow: 'hidden',
        }}
      >
        {/* Top color bar */}
        <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${step.color}, ${step.color}80)` }} />

        <div className="p-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center text-white text-lg"
                style={{ background: `linear-gradient(135deg, ${step.color}, ${step.color}cc)`, boxShadow: `0 4px 12px ${step.color}40` }}
              >
                <i className={`fas ${step.icon}`} />
              </div>
              <div>
                <h3 className="text-sm font-black" style={{ color: 'var(--text, #0f172a)' }}>{step.title}</h3>
                <span className="text-[10px] font-bold" style={{ color: step.color }}>
                  {currentStep + 1} از {steps.length}
                </span>
              </div>
            </div>
            <button onClick={onComplete} className="w-7 h-7 rounded-full flex items-center justify-center text-xs transition-all hover:bg-gray-100" style={{ color: 'var(--text-3, #94a3b8)' }}>
              <i className="fas fa-times" />
            </button>
          </div>

          {/* Description */}
          <p className="text-xs leading-relaxed mb-4 font-medium" style={{ color: 'var(--text-2, #475569)' }}>
            {step.description}
          </p>

          {/* Progress bar */}
          <div className="h-1 rounded-full mb-4 overflow-hidden" style={{ background: 'var(--surface-3, #f1f5f9)' }}>
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, background: step.color }} />
          </div>

          {/* Buttons */}
          <div className="flex gap-2">
            {currentStep > 0 ? (
              <button onClick={(e) => { e.stopPropagation(); handlePrev(); }} className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95" style={{ background: 'var(--surface-2, #f8fafc)', color: 'var(--text-2, #475569)' }}>
                قبلی
              </button>
            ) : <div className="flex-1" />}
            <button
              onClick={(e) => { e.stopPropagation(); handleNext(); }}
              className="flex-[1.5] py-2.5 rounded-xl text-xs font-black text-white transition-all active:scale-95 shadow-lg"
              style={{ background: `linear-gradient(135deg, ${step.color}, ${step.color}dd)`, boxShadow: `0 4px 16px ${step.color}40` }}
            >
              {isLast ? 'شروع کن!' : 'بعدی'}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse-ring {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        .animate-pulse-ring { animation: pulse-ring 2s ease-in-out infinite; }
      `}</style>
    </div>
  );
};

export default OnboardingGuide;
