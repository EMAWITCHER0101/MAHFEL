
import React, { useState, useEffect } from 'react';
import type { User } from '../types';
import { toPersianDigits, formatPersianDateForInput } from '../utils/helpers';
import type { CartItem } from './CartModal';
import type { Order } from '../views/OrdersPage';
import { createPurchaseRequest } from '../services/api';

interface CheckoutFlowProps {
  items: CartItem[];
  isOpen: boolean;
  onClose: () => void;
  onComplete: (order: Order) => void;
  user: User | null;
}

type Step = 'cart' | 'payment' | 'transfer' | 'processing' | 'success';

const parsePrice = (p?: string) => {
  if (!p) return 0;
  return parseInt(p.replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString()).replace(/[^0-9]/g, '')) || 0;
};

// کارت مقصد — نشر سُها (کارت به کارت)
const DEST_CARD = '۶۰۳۷-۹۹۸۱-۷۸۹۱-۵۴۰۰';
const DEST_CARD_RAW = '6037998178915400';

const toEn = (v: string) => v.replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString());

// ─── اعتبارسنجی ───────────────────────────────────────────────────────────────
const formatDateInput = (v: string) => {
  const d = toEn(v).replace(/[^\d]/g, '').slice(0, 8);
  let out = d.slice(0, 4);
  if (d.length > 4) out += '/' + d.slice(4, 6);
  if (d.length > 6) out += '/' + d.slice(6, 8);
  return out;
};

const validateDate = (v: string): string | null => {
  const e = toEn(v);
  if (!/^\d{4}\/\d{2}\/\d{2}$/.test(e)) return 'تاریخ را کامل وارد کنید (مثال: ۱۴۰۴/۰۵/۲۳)';
  const [y, m, d] = e.split('/').map(Number);
  if (y < 1300 || y > 1500) return 'سال نامعتبر است';
  if (m < 1 || m > 12) return 'ماه باید بین ۱ تا ۱۲ باشد';
  const maxDay = m <= 6 ? 31 : m <= 11 ? 30 : 29;
  if (d < 1 || d > maxDay) return `روز باید بین ۱ تا ${maxDay} باشد`;
  return null;
};

const formatTimeInput = (v: string) => {
  const d = toEn(v).replace(/[^\d]/g, '').slice(0, 4);
  return d.length > 2 ? d.slice(0, 2) + ':' + d.slice(2) : d;
};

const validateTime = (v: string): string | null => {
  const e = toEn(v);
  if (!/^\d{2}:\d{2}$/.test(e)) return 'ساعت را کامل وارد کنید (مثال: ۱۴:۳۰)';
  const [h, min] = e.split(':').map(Number);
  if (h < 0 || h > 23) return 'ساعت باید بین ۰۰ تا ۲۳ باشد';
  if (min < 0 || min > 59) return 'دقیقه باید بین ۰۰ تا ۵۹ باشد';
  return null;
};

const validateTracking = (v: string): string | null => {
  const e = toEn(v).replace(/\s/g, '');
  if (!e) return 'کد پیگیری الزامی است';
  if (e.length < 8) return 'کد پیگیری حداقل ۸ کاراکتر است';
  if (!/^[A-Za-z0-9]+$/.test(e)) return 'کد پیگیری فقط عدد و حروف انگلیسی';
  return null;
};

const CheckoutFlow: React.FC<CheckoutFlowProps> = ({ items, isOpen, onClose, onComplete, user }) => {
  const [step, setStep] = useState<Step>('cart');

  // ─── اطلاعات انتقال ───
  const [transferDate, setTransferDate] = useState('');
  const [transferTime, setTransferTime] = useState('');
  const [trackingCode, setTrackingCode] = useState('');
  const [touched, setTouched] = useState<{ date: boolean; time: boolean; tracking: boolean }>({ date: false, time: false, tracking: false });
  const [submitError, setSubmitError] = useState('');
  const [orderNumber, setOrderNumber] = useState('');

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setStep('cart');
      // تاریخ به‌صورت خودکار با تاریخ امروز (شمسی) پر می‌شود و قابل ویرایش است
      setTransferDate(formatPersianDateForInput(new Date().toISOString()));
      setTransferTime('');
      setTrackingCode('');
      setTouched({ date: false, time: false, tracking: false });
      setSubmitError('');
      setOrderNumber('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const totalPrice = items.reduce((sum, item) => sum + parsePrice(item.book.price) * item.quantity, 0);
  const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const dateErr = validateDate(transferDate);
  const timeErr = validateTime(transferTime);
  const trackingErr = validateTracking(trackingCode);
  const allValid = !dateErr && !timeErr && !trackingErr;
  const canSubmit = !!user && allValid && items.length > 0;

  const stepLabels: Record<string, string> = {
    'cart': 'سبد خرید',
    'payment': 'نحوه پرداخت',
    'transfer': 'ثبت اطلاعات پرداخت',
    'processing': 'در حال ثبت درخواست',
    'success': 'درخواست ثبت شد',
  };

  const mainSteps = ['cart', 'payment'];
  const currentStepIdx = mainSteps.indexOf(step);
  const progressPercent = currentStepIdx >= 0 ? ((currentStepIdx + 1) / mainSteps.length) * 100 : 100;

  const goBack = () => {
    if (step === 'cart') onClose();
    else if (step === 'payment') setStep('cart');
    else if (step === 'transfer') setStep('payment');
  };

  const handleSubmitTransfer = async () => {
    if (!canSubmit) return;
    setSubmitError('');
    setStep('processing');
    const res = await createPurchaseRequest({
      items: items.map(i => ({ title: i.book.title, cover: i.book.cover, price: i.book.price, quantity: i.quantity })),
      totalPrice,
      transferDate: toEn(transferDate),
      transferTime: toEn(transferTime),
      trackingCode: toEn(trackingCode).replace(/\s/g, ''),
      cardNumber: DEST_CARD_RAW,
      orderNumber: 'S-' + Date.now().toString().slice(-8),
    });
    if (res) {
      setOrderNumber(res.orderNumber);
      const order: Order = {
        id: Date.now(),
        orderNumber: res.orderNumber,
        items: items.map(i => ({ title: i.book.title, cover: i.book.cover, price: i.book.price, quantity: i.quantity })),
        totalPrice,
        paymentMethod: 'card-to-card',
        transferDate: res.transferDate,
        transferTime: res.transferTime,
        trackingCode: res.trackingCode,
        date: new Date().toISOString(),
        status: 'pending',
      };
      onComplete(order);
      setStep('success');
    } else {
      setStep('transfer');
      setSubmitError('ثبت درخواست ناموفق بود. اتصال اینترنت و ورود به حساب را بررسی کنید.');
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', height: 52, borderRadius: 14, fontSize: 15, outline: 'none',
    background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)',
    caretColor: 'var(--primary)', transition: 'border-color 0.3s, box-shadow 0.3s',
    boxSizing: 'border-box' as const, padding: '0 16px', fontFamily: 'monospace', fontWeight: 700,
  };

  return (
    <div className="fixed inset-0 z-[7000] animate-fadeIn flex flex-col" style={{ background: 'var(--surface)' }} dir="rtl">
      {/* Header */}
      <div className="shrink-0 px-4 pt-4 pb-2">
        <div className="flex items-center justify-between mb-3">
          <button onClick={goBack} className="w-10 h-10 rounded-2xl flex items-center justify-center transition-all active:scale-90" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
            <i className={`fas ${step === 'cart' || step === 'success' ? 'fa-times' : 'fa-chevron-right'} text-sm`} style={{ color: 'var(--text-2)' }} />
          </button>
          <h2 className="text-sm font-black" style={{ color: 'var(--text)' }}>
            {stepLabels[step]}
          </h2>
          <button onClick={onClose} className="w-10 h-10 rounded-2xl flex items-center justify-center transition-all active:scale-90" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
            <i className="fas fa-times text-sm" style={{ color: 'var(--text-2)' }} />
          </button>
        </div>

        {step !== 'processing' && step !== 'success' && (
          <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--surface-2)' }}>
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progressPercent}%`, background: 'linear-gradient(90deg, var(--primary), var(--secondary))' }} />
          </div>
        )}
      </div>

      {/* Step indicators */}
      {['cart', 'payment', 'transfer'].includes(step) && (
        <div className="shrink-0 flex items-center gap-1 px-5 py-2">
          {[
            { key: 'cart', label: 'سبد', icon: 'fa-shopping-cart' },
            { key: 'payment', label: 'پرداخت', icon: 'fa-credit-card' },
          ].map((s, i) => (
            <React.Fragment key={s.key}>
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[10px] font-black transition-all" style={{ background: i <= currentStepIdx ? 'var(--primary)' : 'var(--surface-2)', color: i <= currentStepIdx ? 'white' : 'var(--text-3)' }}>
                <i className={`fas ${s.icon} text-[8px]`} />
                <span className="hidden sm:inline">{s.label}</span>
              </div>
              {i < 1 && <div className="flex-1 h-0.5 rounded-full transition-all" style={{ background: i < currentStepIdx ? 'var(--primary)' : 'var(--surface-2)' }} />}
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-4 no-scrollbar">

        {/* ═══ STEP: CART ═══ */}
        {step === 'cart' && (
          <div className="space-y-3 animate-fadeInUp max-w-lg mx-auto">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'color-mix(in srgb, var(--primary) 15%, transparent)' }}>
                <i className="fas fa-shopping-cart text-[10px]" style={{ color: 'var(--primary)' }} />
              </div>
              <p className="text-xs font-black" style={{ color: 'var(--text)' }}>اقلام سبد شما</p>
            </div>

            {items.map((item, idx) => (
              <div key={item.book.id} className="flex items-center gap-3 p-3.5 rounded-2xl animate-fadeInUp" style={{ animationDelay: `${idx * 50}ms`, background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <div className="relative w-14 h-20 rounded-xl overflow-hidden flex-shrink-0 shadow-md">
                  {item.book.cover ? (
                    <img src={item.book.cover} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--primary), var(--secondary))' }}>
                      <i className="fas fa-book text-white" />
                    </div>
                  )}
                  <div className="absolute top-0 right-0 bottom-0 w-0.5 bg-black/20" />
                </div>
                <div className="flex-1 min-w-0 text-right">
                  <h3 className="text-[13px] font-black line-clamp-1" style={{ color: 'var(--text)' }}>{item.book.title}</h3>
                  <p className="text-[10px] mt-0.5 font-bold" style={{ color: 'var(--text-3)' }}>{item.book.authorName}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md" style={{ background: 'var(--surface)', color: 'var(--text-3)' }}>تعداد: {item.quantity}</span>
                    <span className="text-[10px] font-black" style={{ color: 'var(--primary)' }}>{toPersianDigits(item.book.price || '۰')} × {item.quantity}</span>
                  </div>
                </div>
                <p className="text-sm font-black tabular-nums" style={{ color: 'var(--text)' }}>{toPersianDigits((parsePrice(item.book.price) * item.quantity).toLocaleString('fa-IR'))}</p>
              </div>
            ))}

            <div className="p-4 rounded-2xl mt-4" style={{ background: 'color-mix(in srgb, var(--primary) 8%, var(--surface-2))', border: '1px solid color-mix(in srgb, var(--primary) 15%, var(--border))' }}>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold" style={{ color: 'var(--text-3)' }}>جمع کل</span>
                  <p className="text-[10px] font-bold" style={{ color: 'var(--text-3)' }}>{totalCount} کتاب</p>
                </div>
                <span className="text-lg font-black tabular-nums" style={{ color: 'var(--primary)' }}>{toPersianDigits(totalPrice.toLocaleString('fa-IR'))} <span className="text-xs">تومان</span></span>
              </div>
            </div>

            <div className="p-3 rounded-2xl flex items-center gap-2.5" style={{ background: 'color-mix(in srgb, #3b82f6 6%, var(--surface-2))', border: '1px solid color-mix(in srgb, #3b82f6 15%, var(--border))' }}>
              <i className="fas fa-book-open text-[10px]" style={{ color: '#3b82f6' }} />
              <p className="text-[10px] leading-relaxed" style={{ color: 'var(--text-3)' }}>
                این کتاب‌ها به‌صورت <b style={{ color: 'var(--text)' }}>کتاب مجازی (PDF)</b> ارائه می‌شوند و پس از تایید پرداخت، در بخش «سفارشات من» قابل مطالعه هستند.
              </p>
            </div>
          </div>
        )}

        {/* ═══ STEP: PAYMENT ═══ */}
        {step === 'payment' && (
          <div className="space-y-3 animate-fadeInUp max-w-lg mx-auto">
            <p className="text-xs font-bold text-center mb-2" style={{ color: 'var(--text-3)' }}>نحوه پرداخت خود را انتخاب کنید</p>

            {/* Order summary */}
            <div className="p-3 rounded-2xl mb-3" style={{ background: 'color-mix(in srgb, var(--primary) 6%, var(--surface-2))', border: '1px solid color-mix(in srgb, var(--primary) 12%, var(--border))' }}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold" style={{ color: 'var(--text-3)' }}>مبلغ قابل پرداخت ({totalCount} کتاب)</span>
                <span className="text-sm font-black tabular-nums" style={{ color: 'var(--primary)' }}>{toPersianDigits(totalPrice.toLocaleString('fa-IR'))} تومان</span>
              </div>
            </div>

            {/* درگاه پرداخت آنلاین — در حال توسعه */}
            <div className="w-full p-4 rounded-2xl flex items-center gap-4 text-right opacity-70 select-none" style={{ background: 'var(--surface-2)', border: '1px dashed var(--border)' }}>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'color-mix(in srgb, var(--primary) 12%, transparent)' }}>
                <i className="fas fa-globe text-lg" style={{ color: 'var(--text-3)' }} />
              </div>
              <div className="flex-1 text-right">
                <h3 className="text-sm font-black" style={{ color: 'var(--text-2)' }}>درگاه پرداخت آنلاین</h3>
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-3)' }}>پرداخت مستقیم و آنی با درگاه بانکی</p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[9px] font-black" style={{ background: 'color-mix(in srgb, #f59e0b 15%, transparent)', color: '#f59e0b' }}>
                <i className="fas fa-tools text-[7px] ml-1" />در حال توسعه
              </span>
            </div>

            {/* کارت به کارت */}
            <button onClick={() => setStep('transfer')} className="w-full p-4 rounded-2xl flex items-center gap-4 active:scale-[0.98] transition-all text-right group" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-all group-hover:scale-110" style={{ background: 'linear-gradient(135deg, color-mix(in srgb, var(--primary) 20%, transparent), color-mix(in srgb, var(--primary) 5%, transparent))' }}>
                <i className="fas fa-exchange-alt text-lg" style={{ color: 'var(--primary)' }} />
              </div>
              <div className="flex-1 text-right">
                <h3 className="text-sm font-black" style={{ color: 'var(--text)' }}>کارت به کارت</h3>
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-3)' }}>انتقال به کارت نشر سُها و ثبت اطلاعات پرداخت</p>
                <p className="text-[11px] font-mono font-bold mt-1.5" dir="ltr" style={{ color: 'var(--primary)' }}>{DEST_CARD}</p>
              </div>
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'var(--surface)' }}>
                <i className="fas fa-chevron-left text-[10px]" style={{ color: 'var(--text-3)' }} />
              </div>
            </button>

            {/* کیف پول — در حال توسعه */}
            <div className="w-full p-4 rounded-2xl flex items-center gap-4 text-right opacity-70 select-none" style={{ background: 'var(--surface-2)', border: '1px dashed var(--border)' }}>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'color-mix(in srgb, #f59e0b 12%, transparent)' }}>
                <i className="fas fa-wallet text-lg" style={{ color: 'var(--text-3)' }} />
              </div>
              <div className="flex-1 text-right">
                <h3 className="text-sm font-black" style={{ color: 'var(--text-2)' }}>کیف پول سُها</h3>
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-3)' }}>پرداخت از موجودی کیف پول</p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[9px] font-black" style={{ background: 'color-mix(in srgb, #f59e0b 15%, transparent)', color: '#f59e0b' }}>
                <i className="fas fa-tools text-[7px] ml-1" />در حال توسعه
              </span>
            </div>
          </div>
        )}

        {/* ═══ STEP: TRANSFER ═══ */}
        {step === 'transfer' && (
          <div className="space-y-4 animate-fadeInUp max-w-lg mx-auto">

            {/* کارت مقصد */}
            <div className="relative w-full overflow-hidden rounded-2xl p-5" style={{ maxWidth: 340, margin: '0 auto 4px', background: 'linear-gradient(135deg, #14203a 0%, #0c1628 40%, #080e1c 100%)', boxShadow: '0 20px 60px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.04)' }}>
              <div className="absolute inset-0 opacity-25" style={{ background: 'radial-gradient(ellipse at 75% 20%, rgba(245,158,11,0.3), transparent 60%)' }} />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[9px] font-black text-white/40 tracking-widest">نشر سُها</span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-6 h-6 rounded-full" style={{ background: 'rgba(228,64,64,0.7)' }} />
                    <div className="w-6 h-6 rounded-full -mr-3" style={{ background: 'rgba(245,158,11,0.7)' }} />
                  </div>
                </div>
                <p dir="ltr" style={{ fontFamily: 'monospace', fontSize: 19, fontWeight: 700, color: '#fff', letterSpacing: '0.12em', textAlign: 'left', textShadow: '0 1px 6px rgba(0,0,0,0.3)' }}>
                  {DEST_CARD}
                </p>
                <div className="flex items-center justify-between mt-4 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <span className="text-[9px] font-bold text-white/30">کارت مقصد — بانک ملی</span>
                  <span className="text-sm font-black tabular-nums" style={{ color: '#fbbf24' }}>{toPersianDigits(totalPrice.toLocaleString('fa-IR'))} <span className="text-[9px] font-medium text-white/40">تومان</span></span>
                </div>
              </div>
            </div>

            {!user && (
              <div className="p-3 rounded-2xl flex items-center gap-2.5" style={{ background: 'color-mix(in srgb, #f59e0b 8%, var(--surface-2))', border: '1px solid color-mix(in srgb, #f59e0b 20%, var(--border))' }}>
                <i className="fas fa-triangle-exclamation text-[10px]" style={{ color: '#f59e0b' }} />
                <p className="text-[10px] font-black" style={{ color: '#f59e0b' }}>برای ثبت درخواست خرید ابتدا وارد حساب شوید</p>
              </div>
            )}

            <div className="p-3 rounded-2xl flex items-center gap-2.5" style={{ background: 'color-mix(in srgb, #3b82f6 5%, var(--surface-2))', border: '1px solid color-mix(in srgb, #3b82f6 12%, var(--border))' }}>
              <i className="fas fa-circle-info text-[10px]" style={{ color: '#3b82f6' }} />
              <p className="text-[10px] leading-relaxed" style={{ color: 'var(--text-3)' }}>
                پس از انجام کارت به کارت، اطلاعات دقیق پرداخت (تاریخ، ساعت و کد پیگیری) را ثبت کنید. <b style={{ color: 'var(--text)' }}>پس از بررسی و تایید ادمین، دسترسی کتاب‌ها فعال می‌شود.</b>
              </p>
            </div>

            {/* ── فرم ── */}
            <div className="p-5 rounded-2xl space-y-4" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              {/* تاریخ */}
              <div>
                <label className="text-[10px] font-black mb-1.5 flex items-center gap-1.5" style={{ color: 'var(--text-3)' }}>
                  <i className="fas fa-calendar-day text-[8px]" /> تاریخ پرداخت
                  <span className="text-[8px] font-bold mr-auto" style={{ color: 'color-mix(in srgb, var(--text-3) 70%, transparent)' }}>به‌صورت خودکار پر شده — قابل ویرایش</span>
                </label>
                <input
                  type="text" inputMode="numeric" dir="ltr" maxLength={10}
                  value={transferDate}
                  onChange={e => { setTransferDate(formatDateInput(e.target.value)); if (touched.date) setTouched({ ...touched, date: true }); }}
                  onBlur={() => setTouched({ ...touched, date: true })}
                  placeholder="۱۴۰۴/۰۵/۲۳"
                  style={{ ...inputStyle, borderColor: touched.date && dateErr ? '#ef4444' : 'var(--border)' }}
                />
                {touched.date && dateErr && (
                  <p className="text-[9px] font-bold mt-1 flex items-center gap-1" style={{ color: '#ef4444' }}>
                    <i className="fas fa-circle-exclamation text-[7px]" /> {dateErr}
                  </p>
                )}
              </div>

              {/* ساعت */}
              <div>
                <label className="text-[10px] font-black mb-1.5 flex items-center gap-1.5" style={{ color: 'var(--text-3)' }}>
                  <i className="fas fa-clock text-[8px]" /> ساعت پرداخت (دقیق)
                </label>
                <input
                  type="text" inputMode="numeric" dir="ltr" maxLength={5}
                  value={transferTime}
                  onChange={e => { setTransferTime(formatTimeInput(e.target.value)); if (touched.time) setTouched({ ...touched, time: true }); }}
                  onBlur={() => setTouched({ ...touched, time: true })}
                  placeholder="۱۴:۳۰"
                  style={{ ...inputStyle, borderColor: touched.time && timeErr ? '#ef4444' : 'var(--border)' }}
                />
                {touched.time && timeErr && (
                  <p className="text-[9px] font-bold mt-1 flex items-center gap-1" style={{ color: '#ef4444' }}>
                    <i className="fas fa-circle-exclamation text-[7px]" /> {timeErr}
                  </p>
                )}
              </div>

              {/* کد پیگیری */}
              <div>
                <label className="text-[10px] font-black mb-1.5 flex items-center gap-1.5" style={{ color: 'var(--text-3)' }}>
                  <i className="fas fa-hashtag text-[8px]" /> کد پیگیری انتقال
                </label>
                <input
                  type="text" dir="ltr" maxLength={40}
                  value={trackingCode}
                  onChange={e => { setTrackingCode(e.target.value.replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString())); if (touched.tracking) setTouched({ ...touched, tracking: true }); }}
                  onBlur={() => setTouched({ ...touched, tracking: true })}
                  placeholder="کد ۱۰ رقمی رسید بانک"
                  style={{ ...inputStyle, borderColor: touched.tracking && trackingErr ? '#ef4444' : 'var(--border)' }}
                />
                {touched.tracking && trackingErr && (
                  <p className="text-[9px] font-bold mt-1 flex items-center gap-1" style={{ color: '#ef4444' }}>
                    <i className="fas fa-circle-exclamation text-[7px]" /> {trackingErr}
                  </p>
                )}
              </div>
            </div>

            {submitError && (
              <div className="p-3 rounded-2xl flex items-center gap-2.5" style={{ background: 'color-mix(in srgb, #ef4444 8%, var(--surface-2))', border: '1px solid color-mix(in srgb, #ef4444 20%, var(--border))' }}>
                <i className="fas fa-circle-exclamation text-[10px]" style={{ color: '#ef4444' }} />
                <p className="text-[10px] font-black" style={{ color: '#ef4444' }}>{submitError}</p>
              </div>
            )}

            {/* ── Submit ── */}
            <button onClick={handleSubmitTransfer} disabled={!canSubmit} className="w-full rounded-2xl text-sm font-black flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed relative overflow-hidden" style={{ height: 52, background: canSubmit ? 'linear-gradient(135deg, var(--primary), var(--secondary))' : 'var(--surface-2)', color: canSubmit ? 'white' : 'var(--text-3)', boxShadow: canSubmit ? '0 10px 30px var(--primary-glow)' : 'none', border: `1px solid ${canSubmit ? 'transparent' : 'var(--border)'}` }}>
              <i className="fas fa-check-circle text-[11px]" />
              <span>{!user ? 'ابتدا وارد حساب شوید' : !allValid ? 'فرم را کامل و صحیح پر کنید' : 'ثبت پرداخت و ارسال برای بررسی'}</span>
            </button>
          </div>
        )}

        {/* ═══ STEP: PROCESSING ═══ */}
        {step === 'processing' && (
          <div className="flex flex-col items-center justify-center h-full animate-fadeInUp">
            <div className="relative mb-6">
              <div className="w-20 h-20 rounded-full flex items-center justify-center animate-pulse" style={{ background: 'color-mix(in srgb, var(--primary) 15%, transparent)' }}>
                <i className="fas fa-spinner fa-spin text-3xl" style={{ color: 'var(--primary)' }} />
              </div>
              <div className="absolute inset-0 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--primary)', borderTopColor: 'transparent' }} />
            </div>
            <p className="text-sm font-black mb-1" style={{ color: 'var(--text)' }}>در حال ثبت درخواست پرداخت...</p>
            <p className="text-[10px]" style={{ color: 'var(--text-3)' }}>لطفاً از بستن صفحه خودداری کنید</p>
          </div>
        )}

        {/* ═══ STEP: SUCCESS ═══ */}
        {step === 'success' && (
          <div className="flex flex-col items-center justify-center h-full animate-fadeInUp text-center">
            <div className="relative mb-6">
              <div className="w-24 h-24 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, color-mix(in srgb, #f59e0b 20%, transparent), color-mix(in srgb, #f59e0b 5%, transparent))' }}>
                <i className="fas fa-clock text-4xl" style={{ color: '#f59e0b' }} />
              </div>
              <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center animate-bounce" style={{ background: '#f59e0b' }}>
                <i className="fas fa-check text-xs text-white" />
              </div>
            </div>
            <h2 className="text-lg font-black mb-1" style={{ color: 'var(--text)' }}>درخواست پرداخت ثبت شد</h2>
            <p className="text-[11px] font-bold mb-2" style={{ color: 'var(--text-3)' }}>شماره پیگیری: <span className="font-mono" style={{ color: 'var(--primary)' }}>{orderNumber}</span></p>
            <p className="text-[10px] leading-relaxed mb-6 max-w-[260px]" style={{ color: 'var(--text-3)' }}>
              اطلاعات شما برای بررسی ارسال شد. پس از <b style={{ color: 'var(--text)' }}>تایید ادمین</b> دسترسی کتاب‌ها فعال شده و از بخش «سفارشات من» قابل مطالعه خواهد بود.
            </p>

            <div className="w-full max-w-xs p-4 rounded-2xl mb-6" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold" style={{ color: 'var(--text-3)' }}>تعداد کتاب</span>
                  <span className="text-[11px] font-black" style={{ color: 'var(--text)' }}>{totalCount} عنوان</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold" style={{ color: 'var(--text-3)' }}>مبلغ</span>
                  <span className="text-[11px] font-black" style={{ color: 'var(--primary)' }}>{toPersianDigits(totalPrice.toLocaleString('fa-IR'))} تومان</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold" style={{ color: 'var(--text-3)' }}>کد پیگیری</span>
                  <span className="text-[10px] font-black font-mono" style={{ color: 'var(--text)' }}>{toEn(trackingCode)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold" style={{ color: 'var(--text-3)' }}>وضعیت</span>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full" style={{ background: 'color-mix(in srgb, #f59e0b 15%, transparent)', color: '#f59e0b' }}>در انتظار تایید ادمین</span>
                </div>
              </div>
            </div>

            <button onClick={onClose} className="w-full max-w-xs py-3.5 rounded-2xl text-sm font-black active:scale-[0.98] transition-all" style={{ background: 'var(--primary)', color: 'white', boxShadow: '0 10px 30px var(--primary-glow)' }}>
              <i className="fas fa-store ml-2" />
              بازگشت به نشر سُها
            </button>
          </div>
        )}
      </div>

      {/* Footer buttons */}
      {step === 'cart' && items.length > 0 && (
        <div className="shrink-0 p-4 border-t" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          <button onClick={() => setStep('payment')} className="w-full py-3.5 rounded-2xl text-white text-sm font-black flex items-center justify-center gap-2 active:scale-[0.98] transition-all relative overflow-hidden" style={{ background: 'linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 80%, var(--secondary)))', boxShadow: '0 10px 30px var(--primary-glow)' }}>
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0" />
            <i className="fas fa-arrow-left relative z-10" />
            <span className="relative z-10">ادامه فرآیند خرید</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default CheckoutFlow;
