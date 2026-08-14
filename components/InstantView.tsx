
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { SohaIcon } from './SohaLogo';

interface InstantViewProps {
  title: string;
  content: string;
  onClose: () => void;
  subtitle?: string;
  isHtml?: boolean;
}

const InstantView: React.FC<InstantViewProps> = ({ title, content, onClose, subtitle, isHtml }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [theme, setTheme] = useState<'sepia' | 'dark' | 'light'>('dark'); 
  const [fontSize, setFontSize] = useState(1.15);
  
  const [swipeOffset, setSwipeOffset] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const bridgeRef = useRef<HTMLSpanElement>(null);

  const WORD_LIMIT = 150;

  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true));
    document.body.style.overflow = 'hidden';
    
    const timer = setTimeout(() => {
        if (bridgeRef.current) {
            bridgeRef.current.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
            });
        }
    }, 600);

    return () => { 
        document.body.style.overflow = ''; 
        clearTimeout(timer);
    };
  }, [content]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  const getThemeClasses = () => {
      switch(theme) {
          case 'dark': return { bg: 'bg-[#0f0f0f]', text: 'text-white', header: 'bg-[#1a1a1a]/95 border-white/5', title: 'text-white' };
          case 'light': return { bg: 'bg-[#ffffff]', text: 'text-gray-800', header: 'bg-white/95 border-gray-100', title: 'text-black' };
          default: return { bg: 'bg-[#f4ecd8]', text: 'text-[#433422]', header: 'bg-[#e9e0c9]/95 border-[#d6cdb5]', title: 'text-[#2c1e0f]' };
      }
  };

  const classes = getThemeClasses();

  const textSegments = useMemo(() => {
    if (isHtml || content.includes('<')) return { read: content, bridge: '', rest: '' };

    const wordsArray = content.trim().split(/\s+/);
    if (wordsArray.length <= WORD_LIMIT) return { read: content, bridge: '', rest: '' };

    // پیدا کردن نقطه برش در متن خام برای حفظ اینترها
    let currentWordCount = 0;
    let splitIndex = 0;
    const regex = /\s+/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
        currentWordCount++;
        if (currentWordCount === WORD_LIMIT) {
            splitIndex = match.index;
            break;
        }
    }

    const readPart = content.substring(0, splitIndex);
    const remaining = content.substring(splitIndex);
    
    // هایلایت ۳ کلمه اول از باقی‌مانده (با حفظ فاصله اصلی)
    const remainingWords = remaining.trim().split(/\s+/);
    const bridgeWordsCount = 3;
    
    let bridgeEndIndex = 0;
    let count = 0;
    const bridgeRegex = /\s+/g;
    let bridgeMatch;
    
    // پیدا کردن انتهای کلمه سوم در متن باقی‌مانده
    const trimmedRemaining = remaining.trimStart();
    while ((bridgeMatch = bridgeRegex.exec(trimmedRemaining)) !== null) {
        count++;
        if (count === bridgeWordsCount) {
            bridgeEndIndex = bridgeMatch.index;
            break;
        }
    }

    // اگر متن کوتاه‌تر از ۳ کلمه بود
    if (bridgeEndIndex === 0) bridgeEndIndex = trimmedRemaining.length;

    return {
        read: readPart,
        bridge: trimmedRemaining.substring(0, bridgeEndIndex),
        rest: trimmedRemaining.substring(bridgeEndIndex)
    };
  }, [content, isHtml]);

  return (
    <div className={`fixed inset-0 z-[5000] flex flex-col transition-all duration-300 ease-out ${classes.bg} ${isVisible ? 'opacity-100' : 'opacity-0 translate-y-full'}`}
      style={{ transform: `translateY(${swipeOffset}px)` }}>
      
      <div className={`flex items-center justify-between h-16 px-4 border-b backdrop-blur-xl sticky top-0 z-50 shadow-sm ${classes.header}`}>
        <button onClick={handleClose} className={`flex items-center gap-2 px-4 py-2 rounded-2xl transition-transform active:scale-90 bg-white/5 border border-white/10 ${classes.text}`}>
          <i className="fas fa-times text-lg"></i>
          <span className="text-xs font-black">خروج</span>
        </button>

        <div className="flex items-center gap-3">
            <div className="flex bg-white/5 rounded-2xl p-1 border border-white/5">
                <button onClick={() => setFontSize(f => Math.min(f + 0.1, 1.5))} className={`w-10 h-10 flex items-center justify-center ${classes.text} hover:bg-black/10 transition-colors`}>
                  <span className="font-black text-sm">A+</span>
                </button>
                <button onClick={() => setFontSize(f => Math.max(f - 0.1, 0.8))} className={`w-10 h-10 flex items-center justify-center ${classes.text} hover:bg-black/10 transition-colors`}>
                  <span className="font-black text-xs">A-</span>
                </button>
            </div>
            <button onClick={() => setTheme(prev => prev === 'sepia' ? 'dark' : (prev === 'dark' ? 'light' : 'sepia'))} className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all bg-white/5 border border-white/10 ${theme === 'dark' ? 'text-primary' : (theme === 'sepia' ? 'text-yellow-500' : 'text-gray-400')}`}>
              <i className={`fas ${theme === 'dark' ? 'fa-moon' : (theme === 'sepia' ? 'fa-book-open' : 'fa-sun')}`}></i>
            </button>
        </div>
      </div>

      <div ref={contentRef} className="flex-1 overflow-y-auto no-scrollbar pt-10 pb-40 scroll-smooth px-8">
        <article className="max-w-3xl mx-auto">
          <header className="mb-12 border-r-4 border-primary pr-6">
              <h1 className={`text-3xl font-black leading-tight mb-4  ${classes.title}`}>{title}</h1>
              {subtitle && <p className="text-xs opacity-60 font-black uppercase tracking-wider bg-primary/10 inline-block px-3 py-1 rounded-lg">{subtitle}</p>}
          </header>

          <div className={`instant-view-content prose prose-invert max-w-none text-justify whitespace-pre-wrap ${classes.text}`}
            style={{ fontSize: `${fontSize}rem`, lineHeight: '2.5', fontFamily: 'inherit' }}>
            
            {isHtml || content.includes('<') ? (
              <div className="rendered-content" dangerouslySetInnerHTML={{ __html: content }} />
            ) : (
              <>
                <div className="opacity-50 transition-opacity duration-1000 whitespace-pre-wrap">
                    {textSegments.read}
                </div>

                {textSegments.bridge && (
                    <span className="inline relative whitespace-pre-wrap">
                        <span 
                            ref={bridgeRef} 
                            className="bg-primary/40 rounded px-1.5 py-0.5 mx-0.5 transition-all duration-1000 animate-highlightPulse"
                        >
                            {textSegments.bridge}
                        </span>
                        <span className="whitespace-pre-wrap"> {textSegments.rest}</span>
                        <div className="absolute -right-4 top-0 bottom-0 w-1 bg-primary rounded-full"></div>
                    </span>
                )}
              </>
            )}
          </div>
          
          <div className="mt-20 pt-10 border-t border-white/5 text-center opacity-30">
              <SohaIcon size={48} className="mx-auto mb-4 grayscale" />
              <p className="text-[10px] font-black tracking-widest font-nastaliq">پایان متن • محفل اندیشه سرای هنر و اندیشه</p>
          </div>
        </article>
      </div>
      
      <style>{`
        @keyframes highlightPulse {
            0% { background-color: rgba(26, 179, 148, 0.6); }
            100% { background-color: rgba(26, 179, 148, 0.1); }
        }
        .animate-highlightPulse {
            animation: highlightPulse 4s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        .instant-view-content {
            white-space: pre-wrap !important;
            word-wrap: break-word;
        }
        .rendered-content p { margin-bottom: 1.5rem; }
        .scroll-smooth { scroll-behavior: smooth; }
      `}</style>
    </div>
  );
};

export default InstantView;
