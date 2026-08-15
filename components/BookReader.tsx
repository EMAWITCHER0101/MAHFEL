
import React, { useState, useRef, useCallback, useEffect } from 'react';
import type { PublishedBook } from '../types';
import { toPersianDigits } from '../utils/helpers';

interface BookReaderProps {
  book: PublishedBook;
  onClose: () => void;
  startPage?: number;
}

interface PageContent {
  type: 'cover' | 'title' | 'toc' | 'content' | 'pdf' | 'end';
  title?: string;
  text?: string;
  subtitle?: string;
  pageNum?: number;
}

const BookReader: React.FC<BookReaderProps> = ({ book, onClose, startPage }) => {
  const [currentPage, setCurrentPage] = useState(() => {
    if (startPage && startPage > 0) return startPage;
    try {
      const progress: Array<{ bookTitle: string; currentPage: number }> = JSON.parse(localStorage.getItem('soha_reading_progress') || '[]');
      const saved = progress.find(p => p.bookTitle === book.title);
      if (saved && saved.currentPage > 0) return saved.currentPage;
    } catch {}
    return 0;
  });
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipDirection, setFlipDirection] = useState<'next' | 'prev'>('next');
  const [showMenu, setShowMenu] = useState(false);
  const [showBrightness, setShowBrightness] = useState(false);
  const [brightness, setBrightness] = useState(() => {
    try { return Number(localStorage.getItem('soha_reader_brightness') || '100') || 100; } catch { return 100; }
  });
  const [bgColor, setBgColor] = useState(() => {
    try { return localStorage.getItem('soha_reader_bg') || '#1a1a1a'; } catch { return '#1a1a1a'; }
  });
  const [fontSize, setFontSize] = useState(() => {
    try { return Number(localStorage.getItem('soha_reader_font') || '14') || 14; } catch { return 14; }
  });
  const [bookmarks, setBookmarks] = useState<number[]>(() => {
    try {
      const progress: Array<{ bookTitle: string; bookmarks: number[] }> = JSON.parse(localStorage.getItem('soha_reading_progress') || '[]');
      return progress.find(p => p.bookTitle === book.title)?.bookmarks || [];
    } catch { return []; }
  });
  const [showJump, setShowJump] = useState(false);
  const [jumpInput, setJumpInput] = useState('');
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // ذخیره تنظیمات مطالعه
  useEffect(() => {
    try { localStorage.setItem('soha_reader_brightness', String(brightness)); } catch {}
  }, [brightness]);
  useEffect(() => {
    try { localStorage.setItem('soha_reader_bg', bgColor); } catch {}
  }, [bgColor]);
  useEffect(() => {
    try { localStorage.setItem('soha_reader_font', String(fontSize)); } catch {}
  }, [fontSize]);

  const toggleBookmark = (pageIndex: number) => {
    setBookmarks(prev => {
      const next = prev.includes(pageIndex) ? prev.filter(p => p !== pageIndex) : [...prev, pageIndex].sort((a, b) => a - b);
      try {
        const existing: Array<{ bookTitle: string; currentPage: number; totalPages: number; lastRead: string; bookmarks: number[] }> = JSON.parse(localStorage.getItem('soha_reading_progress') || '[]');
        const idx = existing.findIndex(p => p.bookTitle === book.title);
        if (idx >= 0) { existing[idx].bookmarks = next; localStorage.setItem('soha_reading_progress', JSON.stringify(existing)); }
      } catch {}
      return next;
    });
  };

  const jumpToPage = () => {
    const target = Number(String(jumpInput).replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))));
    if (!Number.isFinite(target) || target < 1 || target > totalPages) return;
    flipToPage(target - 1);
    setShowJump(false);
    setJumpInput('');
  };

  const generatePages = (): PageContent[] => {
    const pages: PageContent[] = [
      { type: 'cover' },
      { type: 'title', title: book.title, subtitle: book.subtitle },
    ];

    if (book.tableOfContents) {
      pages.push({ type: 'toc', text: book.tableOfContents });
    }

    if (book.description) {
      const desc = book.description;
      const chunkSize = 250;
      for (let i = 0; i < desc.length; i += chunkSize) {
        pages.push({ type: 'content', text: desc.slice(i, i + chunkSize) });
      }
    }

    if (book.pdfPages && book.pdfPages.length > 0) {
      for (let i = 1; i <= book.pdfPages.length; i++) {
        pages.push({ type: 'pdf', pageNum: i });
      }
    } else if (book.pdfUrl) {
      pages.push({ type: 'content', text: 'صفحات کتاب در حال آماده‌سازی است. لطفاً کمی بعد دوباره تلاش کنید.' });
    } else if (book.contentHtml) {
      const tmp = document.createElement('div');
      tmp.innerHTML = book.contentHtml;
      // هر پاراگراف واقعی کتاب یک صفحه میشود (ورق زدن منطبق بر صفحات PDF)
      const paragraphs: string[] = [];
      Array.from(tmp.querySelectorAll('p, div, h1, h2, h3, h4, h5, h6')).forEach((el: any) => {
        const t = (el.textContent || '').trim();
        if (t) paragraphs.push(t);
      });
      if (paragraphs.length > 1) {
        paragraphs.forEach(t => pages.push({ type: 'content', text: t }));
      } else {
        const text = tmp.textContent || tmp.innerText || '';
        const chunkSize = 220;
        for (let i = 0; i < text.length; i += chunkSize) {
          pages.push({ type: 'content', text: text.slice(i, i + chunkSize) });
        }
      }
    }

    if (pages.length <= 2) {
      pages.push({ type: 'content', text: book.description || `ناشر: نشر سُها\nنویسنده: ${book.authorName}\nقیمت: ${book.price ? toPersianDigits(book.price) + ' تومان' : 'رایگان'}` });
    }

    pages.push({ type: 'end' });
    return pages;
  };

  const pages = generatePages();
  const totalPages = pages.length;

  useEffect(() => {
    if (currentPage >= totalPages) {
      setCurrentPage(Math.max(1, totalPages - 2));
    }
  }, [totalPages]);

  useEffect(() => {
    if (totalPages <= 0) return;
    try {
      const existing: Array<{ bookTitle: string; currentPage: number; totalPages: number; lastRead: string; bookmarks: number[] }> = JSON.parse(localStorage.getItem('soha_reading_progress') || '[]');
      const idx = existing.findIndex(p => p.bookTitle === book.title);
      const entry = { bookTitle: book.title, currentPage, totalPages, lastRead: new Date().toISOString(), bookmarks: idx >= 0 ? existing[idx].bookmarks : [] };
      if (idx >= 0) existing[idx] = entry; else existing.push(entry);
      localStorage.setItem('soha_reading_progress', JSON.stringify(existing));
    } catch {}
  }, [currentPage, totalPages, book.title]);

  const flipToPage = useCallback((target: number) => {
    if (target < 0 || target >= totalPages || isFlipping) return;
    setFlipDirection(target > currentPage ? 'next' : 'prev');
    setIsFlipping(true);
    setTimeout(() => {
      setCurrentPage(target);
      setTimeout(() => setIsFlipping(false), 350);
    }, 180);
  }, [currentPage, totalPages, isFlipping]);

  const goNext = () => flipToPage(currentPage + 1);
  const goPrev = () => flipToPage(currentPage - 1);

  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchMove = (e: React.TouchEvent) => { touchEndX.current = e.touches[0].clientX; };
  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 50) {
      if (diff > 0) goNext();
      else goPrev();
    }
  };

  const handleKeyNav = useCallback((e: KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); goPrev(); }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); goNext(); }
    if (e.key === 'Escape') onClose();
  }, [currentPage, totalPages, isFlipping]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyNav);
    return () => window.removeEventListener('keydown', handleKeyNav);
  }, [handleKeyNav]);

  const page = pages[currentPage] || pages[0];

  const bgColors = [
    { name: 'تیره', value: '#1a1a1a', text: '#e5e5e5', accent: '#a3a3a3' },
    { name: 'خاکستری', value: '#2d2d2d', text: '#d4d4d4', accent: '#a3a3a3' },
    { name: 'کاغذی', value: '#f5f0e8', text: '#1a1a1a', accent: '#525252' },
    { name: 'سبز', value: '#1a2e1a', text: '#d4e8d4', accent: '#8fbc8f' },
  ];
  const currentBg = bgColors.find(c => c.value === bgColor) || bgColors[0];

  const renderPageContent = (p: PageContent, isBack?: boolean) => {
    const textColor = currentBg.text;
    const accentColor = currentBg.accent;

    switch (p.type) {
      case 'cover':
        return (
          <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
            {/* Cover background */}
            <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, #0f172a, #1e293b, #0f172a)` }} />
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 20.5V18H0v-2h20v-2l2 3-2 3z' fill='%23ffffff' fill-opacity='0.3'/%3E%3C/svg%3E")` }} />

            {/* Decorative corner */}
            <div className="absolute top-6 left-6 w-16 h-16 border-t-2 border-l-2 rounded-tl-lg" style={{ borderColor: 'rgba(255,255,255,0.15)' }} />
            <div className="absolute bottom-6 right-6 w-16 h-16 border-b-2 border-r-2 rounded-br-lg" style={{ borderColor: 'rgba(255,255,255,0.15)' }} />

            <div className="relative z-10 flex flex-col items-center">
              {book.cover ? (
                <img src={book.cover} alt={book.title} className="w-36 h-52 rounded-lg object-cover shadow-2xl mb-6" style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }} />
              ) : (
                <div className="w-36 h-52 rounded-lg flex flex-col items-center justify-center mb-6 shadow-2xl" style={{ background: 'linear-gradient(135deg, var(--primary), var(--secondary))', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>
                  <span className="text-[8px] text-white/60 font-black mb-1">نشر سُها</span>
                  <i className="fas fa-book text-white/80 text-3xl" />
                </div>
              )}
              <h1 className="text-xl font-black text-white mb-2 leading-tight">{book.title}</h1>
              {book.subtitle && <p className="text-xs text-gray-400 mb-2">{book.subtitle}</p>}
              <div className="w-12 h-0.5 rounded-full bg-white/20 my-4" />
              <p className="text-[11px] text-gray-500">{book.authorName}</p>
              <p className="text-[9px] text-gray-600 mt-2">نشر سُها — سرای هنر و اندیشه</p>
            </div>
          </div>
        );
      case 'title':
        return (
          <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center" style={{ color: textColor }}>
            <div className="w-16 h-0.5 rounded-full mb-8" style={{ background: accentColor }} />
            <h1 className="text-xl font-black mb-3 leading-tight">{p.title}</h1>
            {p.subtitle && <p className="text-sm mb-2" style={{ color: accentColor }}>{p.subtitle}</p>}
            <div className="w-8 h-0.5 rounded-full mt-8 mb-4" style={{ background: accentColor }} />
            <p className="text-xs font-bold" style={{ color: accentColor }}>{book.authorName}</p>
            <p className="text-[10px] mt-8" style={{ color: accentColor, opacity: 0.5 }}>نشر سُها — سرای هنر و اندیشه</p>
          </div>
        );
      case 'toc':
        return (
          <div className="w-full h-full flex flex-col p-8 justify-center" style={{ color: textColor }}>
            <h2 className="text-base font-black mb-6 text-center" style={{ color: accentColor }}>فهرست مطالب</h2>
            <div className="space-y-3">
              {(p.text || '').split('\n').filter(Boolean).map((line, i) => (
                <div key={i} className="flex items-center gap-3 text-sm leading-relaxed">
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black shrink-0" style={{ background: `${accentColor}20`, color: accentColor }}>{i + 1}</span>
                  <span className="flex-1">{line.trim()}</span>
                </div>
              ))}
            </div>
          </div>
        );
      case 'content':
        return (
          <div className="w-full h-full flex flex-col p-8 justify-center" style={{ color: textColor }}>
            <div className="text-justify font-medium" style={{ textAlign: 'justify', lineHeight: 2.4, fontSize: fontSize }}>
              {p.text}
            </div>
            {/* Page number */}
            <div className="absolute bottom-4 left-0 right-0 text-center">
              <span className="text-[9px] font-bold" style={{ color: accentColor, opacity: 0.5 }}>{toPersianDigits(String(currentPage + 1))}</span>
            </div>
          </div>
        );
      case 'pdf':
        return (
          <div className="w-full h-full flex items-center justify-center overflow-hidden" style={{ background: '#fff' }}>
            <img
              src={book.pdfPages?.[(p.pageNum || 1) - 1]}
              alt={`صفحه ${p.pageNum}`}
              draggable={false}
              className="w-full h-full object-contain select-none"
              loading={p.pageNum === 1 ? 'eager' : 'lazy'}
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            />
          </div>
        );
      case 'end':
        return (
          <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center" style={{ color: textColor }}>
            <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6" style={{ background: `${accentColor}15` }}>
              <i className="fas fa-bookmark text-2xl" style={{ color: accentColor }} />
            </div>
            <p className="text-lg font-black mb-2">پایان کتاب</p>
            <div className="w-8 h-0.5 rounded-full my-4" style={{ background: accentColor }} />
            <p className="text-xs font-bold mb-1">{book.title}</p>
            <p className="text-[10px]" style={{ color: accentColor }}>نشر سُها — سرای هنر و اندیشه</p>
            <p className="text-[10px] mt-4" style={{ color: accentColor, opacity: 0.5 }}>تمامی حقوق محفوظ است © ۱۴۰۴</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div ref={containerRef} className="fixed inset-0 z-[8000] animate-fadeIn flex flex-col select-none" style={{ background: bgColor, filter: `brightness(${brightness}%)` }} dir="rtl">
      {/* Header */}
      {!showMenu && (
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4 bg-gradient-to-b from-black/40 to-transparent">
          <button onClick={onClose} className="w-10 h-10 rounded-2xl bg-black/30 backdrop-blur-md flex items-center justify-center transition-all active:scale-90 hover:bg-black/50 border border-white/10">
            <i className="fas fa-times text-sm text-white/80" />
          </button>
          <div className="text-center">
            <p className="text-[11px] font-black text-white/90 line-clamp-1 max-w-[180px]">{book.title}</p>
            <p className="text-[9px] text-white/50 mt-0.5">{toPersianDigits(currentPage + 1)} از {toPersianDigits(totalPages)}</p>
          </div>
          <button onClick={() => setShowMenu(!showMenu)} className="w-10 h-10 rounded-2xl bg-black/30 backdrop-blur-md flex items-center justify-center transition-all active:scale-90 hover:bg-black/50 border border-white/10">
            <i className="fas fa-bars text-sm text-white/80" />
          </button>
          <button onClick={() => toggleBookmark(currentPage)}
            className={`w-10 h-10 rounded-2xl backdrop-blur-md flex items-center justify-center transition-all active:scale-90 border ${bookmarks.includes(currentPage) ? 'bg-amber-500/90 border-amber-300' : 'bg-black/30 hover:bg-black/50 border-white/10'}`}>
            <i className={`fas fa-bookmark text-sm ${bookmarks.includes(currentPage) ? 'text-white' : 'text-white/80'}`} />
          </button>
        </div>
      )}

      {/* Menu Overlay */}
      {showMenu && (
        <div className="absolute inset-0 z-30 bg-black/80 backdrop-blur-lg flex flex-col items-center justify-center animate-fadeIn" onClick={() => setShowMenu(false)}>
          <div className="space-y-3 w-72" onClick={e => e.stopPropagation()}>
            <h3 className="text-center text-sm font-black text-white/90 mb-4">تنظیمات مطالعه</h3>

            {/* Brightness */}
            <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-white/60">روشنایی</span>
                <i className="fas fa-sun text-[10px] text-white/40" />
              </div>
              <input type="range" min="50" max="150" value={brightness} onChange={e => setBrightness(Number(e.target.value))} className="w-full h-1 rounded-full appearance-none bg-white/20 accent-white/60" />
            </div>

            {/* Font Size */}
            <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-white/60">اندازه متن</span>
                <span className="text-[9px] font-black text-white/40">{toPersianDigits(fontSize)}</span>
              </div>
              <input type="range" min="11" max="24" value={fontSize} onChange={e => setFontSize(Number(e.target.value))} className="w-full h-1 rounded-full appearance-none bg-white/20 accent-white/60" />
              <div className="flex justify-between text-[8px] font-bold text-white/30 mt-1"><span>کوچک</span><span>بزرگ</span></div>
            </div>

            {/* Background Colors */}
            <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
              <p className="text-[10px] font-bold text-white/60 mb-2">رنگ صفحه</p>
              <div className="flex items-center justify-center gap-2">
                {bgColors.map(c => (
                  <button key={c.value} onClick={() => setBgColor(c.value)} className="w-8 h-8 rounded-full border-2 transition-all active:scale-90" style={{ background: c.value, borderColor: bgColor === c.value ? 'white' : 'rgba(255,255,255,0.1)' }} />
                ))}
              </div>
            </div>

            {/* Jump to page */}
            {showJump ? (
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-2">
                <input autoFocus value={jumpInput} onChange={e => setJumpInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') jumpToPage(); if (e.key === 'Escape') setShowJump(false); }}
                  placeholder={`${toPersianDigits(1)} تا ${toPersianDigits(totalPages)}`} dir="ltr"
                  className="flex-1 bg-white/10 border border-white/15 rounded-xl px-3 py-2 text-[11px] font-black text-white placeholder:text-white/30 outline-none focus:border-white/40" />
                <button onClick={jumpToPage} className="px-3 py-2 rounded-xl bg-white/15 text-white text-[10px] font-black hover:bg-white/25 transition-all active:scale-95">
                  <i className="fas fa-arrow-left text-[9px]"></i>
                </button>
              </div>
            ) : (
              <button onClick={() => { setShowJump(true); setJumpInput(''); }} className="w-full p-3 rounded-2xl bg-white/10 text-white/80 text-sm font-bold flex items-center gap-3 transition-all active:scale-95 hover:bg-white/15 border border-white/5">
                <i className="fas fa-magnifying-glass w-5 text-center text-xs" /> پرش به صفحه
              </button>
            )}

            {/* Bookmarks */}
            <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-white/60">نشان‌ها ({toPersianDigits(bookmarks.length)})</span>
                <i className="fas fa-bookmark text-[10px] text-amber-400" />
              </div>
              {bookmarks.length === 0 ? (
                <p className="text-[9px] text-white/30 font-bold text-center py-1">هنوز نشانی ثبت نشده — با آیکن نشان‌دار کن بالای صفحه</p>
              ) : (
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  {bookmarks.map(p => (
                    <button key={p} onClick={() => { flipToPage(p); setShowMenu(false); }}
                      className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 text-[10px] font-black hover:bg-amber-500/35 transition-all active:scale-95">
                      <i className="fas fa-bookmark text-[7px] ml-1"></i>{toPersianDigits(p + 1)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button onClick={() => { flipToPage(0); setShowMenu(false); }} className="w-full p-3 rounded-2xl bg-white/10 text-white/80 text-sm font-bold flex items-center gap-3 transition-all active:scale-95 hover:bg-white/15 border border-white/5">
              <i className="fas fa-home w-5 text-center text-xs" /> صفحه اول
            </button>
            <button onClick={() => { flipToPage(totalPages - 1); setShowMenu(false); }} className="w-full p-3 rounded-2xl bg-white/10 text-white/80 text-sm font-bold flex items-center gap-3 transition-all active:scale-95 hover:bg-white/15 border border-white/5">
              <i className="fas fa-arrow-to-left w-5 text-center text-xs" /> صفحه آخر
            </button>
            <button onClick={onClose} className="w-full p-3 rounded-2xl bg-red-500/15 text-red-400 text-sm font-bold flex items-center gap-3 transition-all active:scale-95 hover:bg-red-500/20 border border-red-500/20">
              <i className="fas fa-times w-5 text-center text-xs" /> بستن کتاب
            </button>
          </div>
        </div>
      )}

      {/* Book Pages */}
      <div className="flex-1 flex items-center justify-center px-4 py-16 touch-none" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} onClick={(e) => {
        // Click on right half = prev, left half = next
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        if (x > rect.width / 2) goPrev();
        else goNext();
      }}>
        <div className="relative w-full max-w-sm aspect-[3/4] perspective-1000">
          {/* Page shadow */}
          <div className="absolute -inset-2 rounded-3xl pointer-events-none" style={{ boxShadow: '0 30px 80px rgba(0,0,0,0.5)' }} />

          {/* Page */}
          <div
            className={`absolute inset-0 rounded-2xl overflow-hidden transition-all duration-300 ${isFlipping ? (flipDirection === 'next' ? 'animate-bookFlipNext' : 'animate-bookFlipPrev') : ''}`}
            style={{
              background: bgColor,
              border: '1px solid rgba(255,255,255,0.08)',
              transformStyle: 'preserve-3d',
            }}
          >
            {renderPageContent(page)}

            {/* Page fold shadow */}
            <div className="absolute top-0 left-0 w-8 h-full pointer-events-none" style={{ background: 'linear-gradient(to right, rgba(0,0,0,0.08), transparent)' }} />

            {/* Page number (for content pages) */}
            {page.type === 'content' && (
              <div className="absolute bottom-4 left-0 right-0 text-center pointer-events-none">
                <span className="text-[9px] font-bold" style={{ color: currentBg.accent, opacity: 0.4 }}>{toPersianDigits(String(currentPage + 1))}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/50 to-transparent">
        {/* Progress */}
        <div className="px-8 pb-2">
          <div className="h-0.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
            <div className="h-full rounded-full transition-all duration-300" style={{ width: `${((currentPage + 1) / totalPages) * 100}%`, background: 'var(--primary)' }} />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-between px-6 pb-6 pt-2 max-w-sm mx-auto">
          <button onClick={(e) => { e.stopPropagation(); goPrev(); }} disabled={currentPage <= 0} className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center disabled:opacity-20 active:scale-90 transition-all hover:bg-white/15 border border-white/5">
            <i className="fas fa-chevron-right text-white/80 text-sm" />
          </button>

          <div className="flex items-center gap-2">
            <button onClick={(e) => { e.stopPropagation(); setShowMenu(true); }} className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center active:scale-90 transition-all hover:bg-white/15 border border-white/5">
              <i className="fas fa-palette text-white/60 text-xs" />
            </button>
          </div>

          <button onClick={(e) => { e.stopPropagation(); goNext(); }} disabled={currentPage >= totalPages - 1} className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center disabled:opacity-20 active:scale-90 transition-all hover:bg-white/15 border border-white/5">
            <i className="fas fa-chevron-left text-white/80 text-sm" />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes bookFlipNext {
          0% { transform: perspective(1000px) rotateY(0deg); }
          100% { transform: perspective(1000px) rotateY(-12deg) scale(0.96); }
        }
        @keyframes bookFlipPrev {
          0% { transform: perspective(1000px) rotateY(0deg); }
          100% { transform: perspective(1000px) rotateY(12deg) scale(0.96); }
        }
        .animate-bookFlipNext { animation: bookFlipNext 0.35s ease-out; }
        .animate-bookFlipPrev { animation: bookFlipPrev 0.35s ease-out; }
        .perspective-1000 { perspective: 1000px; }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
};

export default BookReader;
