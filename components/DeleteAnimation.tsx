import { useEffect, useState } from 'react';

interface DeleteAnimationProps {
  isActive: boolean;
  type?: 'post' | 'comment';
  onComplete?: () => void;
}

export default function DeleteAnimation({ isActive, type = 'post', onComplete }: DeleteAnimationProps) {
  const [stage, setStage] = useState<'idle' | 'shrink' | 'fade' | 'done'>('idle');

  useEffect(() => {
    if (!isActive) { setStage('idle'); return; }
    setStage('shrink');
    const t1 = setTimeout(() => setStage('fade'), 400);
    const t2 = setTimeout(() => { setStage('done'); onComplete?.(); }, 800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [isActive, onComplete]);

  if (stage === 'idle' || stage === 'done') return null;

  return (
    <div className={`transition-all duration-400 ease-out overflow-hidden ${stage === 'fade' ? 'max-h-0 opacity-0 -translate-y-2 scale-95' : 'max-h-[200px] opacity-100 scale-100'}`}
      style={{ transitionDuration: stage === 'fade' ? '400ms' : '300ms' }}>
      <div className="relative">
        {/* Telegram-style collapsing line */}
        <div className={`absolute inset-0 flex items-center justify-center ${stage === 'fade' ? 'opacity-100' : 'opacity-0'}`}>
          <div className="w-full h-px bg-gradient-to-r from-transparent via-red-400 to-transparent" />
        </div>
        {/* Collapse icon */}
        {stage === 'fade' && (
          <div className="flex justify-center py-2">
            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center animate-deletePop">
              <i className="fas fa-trash text-red-400 text-[10px]"></i>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
