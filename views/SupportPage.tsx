import React, { useState } from 'react';
import { submitSupportMessage, type SupportCategory } from '../services/api';
import { toPersianDigits } from '../utils/helpers';

const SUPPORT_ID = '@EMADCH8200';

const CATEGORIES: { id: SupportCategory; icon: string; label: string; color: string }[] = [
  { id: 'bug', icon: 'fa-bug', label: 'گزارش باگ', color: '#ef4444' },
  { id: 'suggestion', icon: 'fa-lightbulb', label: 'پیشنهاد', color: '#f59e0b' },
  { id: 'question', icon: 'fa-question-circle', label: 'سؤال', color: '#3b82f6' },
  { id: 'other', icon: 'fa-envelope', label: 'سایر', color: '#10b981' },
];

interface SupportPageProps {
  user?: { name?: string } | null;
  onToggleSidebar: () => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
  onOpenProfile?: () => void;
}

const SupportPage: React.FC<SupportPageProps> = ({ user, onToggleSidebar, theme = 'light', onToggleTheme, onOpenProfile }) => {
  const [category, setCategory] = useState<SupportCategory>('bug');
  const [contact, setContact] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [toast, setToast] = useState<{ text: string; ok: boolean } | null>(null);

  const handleSubmit = async () => {
    if (!message.trim() || sending) return;
    setSending(true);
    const res = await submitSupportMessage({
      name: user?.name,
      contact: contact.trim(),
      category,
      message: message.trim(),
    });
    setSending(false);
    if (res) {
      setSent(true);
      setMessage('');
      setContact('');
    } else {
      setToast({ text: 'خطا در ارسال پیام — دوباره تلاش کنید', ok: false });
      setTimeout(() => setToast(null), 4000);
    }
  };

  return (
    <div className="min-h-full flex flex-col" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-30 px-4 py-3 border-b" style={{ background: theme === 'dark' ? 'var(--surface-2)' : 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-3">
          <button onClick={onToggleSidebar} className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-90 transition-all" style={{ background: 'var(--surface-3)', color: 'var(--text-2)' }}>
            <i className="fas fa-bars text-sm"></i>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-black" style={{ color: 'var(--text)' }}>پشتیبانی</h1>
            <p className="text-[9px] font-bold" style={{ color: 'var(--text-3)' }}>نظرات، پیشنهادات و گزارش باگ</p>
          </div>
          <button onClick={onToggleTheme} className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-90 transition-all" style={{ background: 'var(--surface-3)', color: 'var(--text-2)' }}>
            <i className={`fas ${theme === 'dark' ? 'fa-sun' : 'fa-moon'} text-sm`}></i>
          </button>
          <button onClick={onOpenProfile} className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-90 transition-all" style={{ background: 'var(--surface-3)', color: 'var(--text-2)' }}>
            <i className="fas fa-user text-sm"></i>
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto no-scrollbar p-4 max-w-2xl w-full mx-auto">
        {sent ? (
          <div className="rounded-3xl p-8 text-center animate-fadeIn" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
            <div className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center text-3xl"
              style={{ background: 'linear-gradient(135deg, color-mix(in srgb, var(--primary) 12%, transparent), color-mix(in srgb, #0d9488 10%, transparent))', color: 'var(--primary)' }}>
              <i className="fas fa-check-circle"></i>
            </div>
            <h2 className="text-base font-black mb-2" style={{ color: 'var(--text)' }}>پیام شما ارسال شد</h2>
            <p className="text-[11px] leading-relaxed mb-5" style={{ color: 'var(--text-2)' }}>
              از همراهی شما سپاسگزاریم. پیام شما به تیم پشتیبانی رسید و در اسرع وقت بررسی خواهد شد.
            </p>
            <button onClick={() => setSent(false)} className="px-6 py-2.5 rounded-2xl text-[11px] font-black text-white transition-all active:scale-95"
              style={{ background: 'linear-gradient(135deg, var(--primary), #0d9488)' }}>
              ارسال پیام جدید
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* توضیحات */}
            <div className="rounded-3xl p-5" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-lg" style={{ background: 'linear-gradient(135deg, var(--primary), #0d9488)' }}>
                  <i className="fas fa-headset text-base"></i>
                </div>
                <div>
                  <h2 className="text-sm font-black" style={{ color: 'var(--text)' }}>در خدمت شما هستیم</h2>
                  <p className="text-[9px] font-bold" style={{ color: 'var(--text-3)' }}>سؤالات، پیشنهادات و مشکلات خود را با ما در میان بگذارید</p>
                </div>
              </div>
              <ul className="space-y-2 text-[11px] leading-relaxed" style={{ color: 'var(--text-2)' }}>
                <li className="flex items-start gap-2"><i className="fas fa-headphones-alt mt-0.5" style={{ color: 'var(--primary)' }}></i><span>برای گزارش مشکل در پخش صوت یا ویدیو، دسته «گزارش باگ» را انتخاب کنید.</span></li>
                <li className="flex items-start gap-2"><i className="fas fa-star mt-0.5" style={{ color: '#f59e0b' }}></i><span>ایده‌های خود را برای بهتر شدن محفل با دسته «پیشنهاد» ارسال کنید.</span></li>
                <li className="flex items-start gap-2"><i className="fas fa-reply mt-0.5" style={{ color: '#3b82f6' }}></i><span>برای پیگیری سریع‌تر، راه ارتباطی (شماره تماس یا آیدی) خود را بنویسید.</span></li>
              </ul>
              <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                <p className="text-[10px] font-bold mb-2" style={{ color: 'var(--text-3)' }}>ارتباط مستقیم در تلگرام و ایتا (آیدی یکسان):</p>
                <div className="flex flex-wrap gap-2">
                  <a href={`https://t.me/${SUPPORT_ID.replace('@', '')}`} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[11px] font-black transition-all active:scale-95"
                    style={{ background: 'color-mix(in srgb, var(--primary) 10%, transparent)', color: 'var(--primary)', border: '1px solid color-mix(in srgb, var(--primary) 15%, transparent)' }}>
                    <i className="fab fa-telegram-plane text-sm"></i>
                    <span>تلگرام</span>
                  </a>
                  <a href={`https://eitaa.com/${SUPPORT_ID.replace('@', '')}`} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[11px] font-black transition-all active:scale-95"
                    style={{ background: 'color-mix(in srgb, #16a34a 10%, transparent)', color: '#16a34a', border: '1px solid color-mix(in srgb, #16a34a 15%, transparent)' }}>
                    <i className="fas fa-paper-plane text-sm"></i>
                    <span>ایتا</span>
                  </a>
                  <span dir="ltr" className="inline-flex items-center px-3 py-2 rounded-2xl text-[10px] font-black"
                    style={{ background: 'var(--surface)', color: 'var(--text-2)', border: '1px solid var(--border)' }}>{SUPPORT_ID}</span>
                </div>
              </div>
            </div>

            {/* فرم */}
            <div className="rounded-3xl p-5" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              <h3 className="text-xs font-black mb-4" style={{ color: 'var(--text)' }}>ارسال پیام</h3>

              {/* دسته‌بندی */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                {CATEGORIES.map(c => (
                  <button key={c.id} onClick={() => setCategory(c.id)}
                    className={`flex flex-col items-center gap-1.5 py-3 rounded-2xl transition-all active:scale-95 ${category === c.id ? 'shadow-md' : 'opacity-60 hover:opacity-90'}`}
                    style={{ background: category === c.id ? `color-mix(in srgb, ${c.color} 10%, transparent)` : 'var(--surface-3)', border: `1.5px solid ${category === c.id ? c.color : 'transparent'}`, color: c.color }}>
                    <i className={`fas ${c.icon} text-sm`}></i>
                    <span className="text-[9px] font-black">{c.label}</span>
                  </button>
                ))}
              </div>

              {/* راه ارتباطی */}
              <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="راه ارتباطی (اختیاری) — شماره تماس یا آیدی تلگرام"
                className="w-full rounded-2xl px-4 py-3 text-[11px] font-medium outline-none transition-all focus:ring-2 mb-3"
                style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', '--tw-ring-color': 'color-mix(in srgb, var(--primary) 25%, transparent)' } as any} />

              {/* متن پیام */}
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={5}
                placeholder="پیام خود را بنویسید... (مشکل، پیشنهاد یا سؤال)"
                className="w-full rounded-2xl px-4 py-3 text-[12px] font-medium outline-none resize-none transition-all focus:ring-2 mb-3"
                style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', '--tw-ring-color': 'color-mix(in srgb, var(--primary) 25%, transparent)' } as any} />

              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold" style={{ color: 'var(--text-3)' }}>{toPersianDigits(message.length)}/{toPersianDigits(2000)}</span>
                <button onClick={handleSubmit} disabled={!message.trim() || sending}
                  className="px-6 py-2.5 rounded-2xl text-[11px] font-black text-white shadow-lg transition-all active:scale-95 disabled:opacity-30 disabled:active:scale-100"
                  style={{ background: 'linear-gradient(135deg, var(--primary), #0d9488)' }}>
                  {sending ? <i className="fas fa-spinner fa-spin ml-1"></i> : <i className="fas fa-paper-plane ml-1"></i>}
                  ارسال پیام
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[500] px-5 py-3 rounded-2xl text-[11px] font-bold text-white shadow-2xl animate-fadeIn"
          style={{ background: toast.ok ? '#10b981' : '#ef4444' }}>
          {toast.text}
        </div>
      )}
    </div>
  );
};

export default SupportPage;
